import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ItemParams } from 'react-contexify';
import type { Node } from 'reactflow';

import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import moment from 'moment';
import React, { useCallback, useEffect } from 'react';
import { Item, Menu, Submenu, useContextMenu } from 'react-contexify';
import ReactFlow, { Background, Controls, MiniMap, Panel, useReactFlow } from 'reactflow';

import { Constants } from '../globals/Constants';
import { downloadImage } from '../globals/downloadImage';
import { Logger } from '../globals/Logger';
import { downloadTextFile } from '../helpers/downloadTextFile';
import { useGenerateGraphMLData } from '../selectors/useGenerateGraphMLData';
import { useGenerateReflowData } from '../selectors/useGenerateReflowData';
import { useGroupsById } from '../selectors/useGroupsById';
import { useAppStore } from '../state/useAppStore';
import { PreviewGraphNode } from './PreviewGraph/PreviewGraphNode';
import { Sidebar } from './Sidebar/Sidebar';

const nodeTypes = {
    previewGraphNode: PreviewGraphNode,
};

interface ContextMenuProps {
    groupId: number;
}

export const GraphView = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const data = useGenerateReflowData();
    const groupsById = useGroupsById();
    const generateGraphMLData = useGenerateGraphMLData();
    const setGroupIdToStartWith = useAppStore((s) => s.setGroupIdToStartWith);
    const baseUrl = useAppStore((s) => s.baseUrl);
    const pendingExport = useAppStore((s) => s.pendingExport);
    const setPendingExport = useAppStore((s) => s.setPendingExport);
    const setIsExporting = useAppStore((s) => s.setIsExporting);
    const { fitView } = useReactFlow();

    const clearPendingExport = useCallback(() => {
        setPendingExport(undefined);
    }, [setPendingExport]);

    const { show } = useContextMenu({
        id: Constants.contextMenuId,
    });

    // Auto-fit view when data changes
    useEffect(() => {
        if (data.nodes.length > 0) {
            setTimeout(() => {
                fitView({ duration: 400, padding: 0.05 });
            }, 50);
        }
    }, [data.nodes, fitView]);

    // Handle pending exports after data has settled from group change
    useEffect(() => {
        if (!pendingExport) return;

        setIsExporting(true);

        if (pendingExport.type === 'graphml') {
            downloadTextFile(generateGraphMLData(), pendingExport.fileName, document);
            setGroupIdToStartWith();
            clearPendingExport();
            setIsExporting(false);
        } else {
            setTimeout(() => {
                const reactFlow = document.querySelector('.react-flow');
                if (reactFlow) {
                    const filter = (node: HTMLElement) => {
                        // Safety check for nodes that might not have classList (e.g. text nodes)
                        // despite the HTMLElement type definition from the library.
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        if (!node.classList) return true;

                        return !(
                            node.classList.contains('react-flow__minimap') ||
                            node.classList.contains('react-flow__controls') ||
                            node.classList.contains('react-flow__panel') ||
                            node.classList.contains('contexify')
                        );
                    };

                    // For PDF and SVG, we ALWAYS want light mode.
                    // PNG can keep current mode if user wants, but request says "pdf and svg exports should always be in light mode"
                    const needsLightMode = pendingExport.type === 'pdf' || pendingExport.type === 'svg';
                    const isDarkMode = document.documentElement.classList.contains('dark');
                    
                    if (needsLightMode && isDarkMode) {
                        document.documentElement.classList.remove('dark');
                    }

                    const finalizeExport = () => {
                        if (needsLightMode && isDarkMode) {
                            document.documentElement.classList.add('dark');
                        }
                        setGroupIdToStartWith();
                        clearPendingExport();
                        setIsExporting(false);
                    };

                    if (pendingExport.type === 'png') {
                        toPng(reactFlow as HTMLElement, {
                            filter,
                            pixelRatio: 2,
                            skipFonts: true,
                        })
                            .then(downloadImage)
                            .catch((error: unknown) => {
                                Logger.error('Failed to export as PNG:', error);
                            })
                            .finally(finalizeExport);
                    } else if (pendingExport.type === 'svg') {
                        toSvg(reactFlow as HTMLElement, {
                            filter,
                        })
                            .then((dataUrl) => {
                                const link = document.createElement('a');
                                link.download = pendingExport.fileName;
                                link.href = dataUrl;
                                link.click();
                            })
                            .catch((error: unknown) => {
                                Logger.error('Failed to export as SVG:', error);
                            })
                            .finally(finalizeExport);
                    } else {
                        toPng(reactFlow as HTMLElement, {
                            filter,
                            pixelRatio: 2,
                            skipFonts: true,
                        })
                            .then((dataUrl) => {
                                const pdf = new jsPDF({
                                    format: 'a4',
                                    orientation: 'landscape',
                                    putOnlyUsedFonts: true,
                                    unit: 'mm',
                                });
                                
                                // Explicitly set font to avoid potential "font is undefined" errors in jsPDF
                                pdf.setFont('helvetica', 'normal');

                                const img = new Image();
                                img.src = dataUrl;
                                img.onload = () => {
                                    try {
                                        const pdfWidth = pdf.internal.pageSize.getWidth();
                                        const pdfHeight = (img.height * pdfWidth) / img.width;

                                        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                                        pdf.save(pendingExport.fileName);
                                    } catch (error) {
                                        Logger.error('Failed to generate PDF document:', error);
                                    } finally {
                                        finalizeExport();
                                    }
                                };
                                img.onerror = (err) => {
                                    Logger.error('Failed to load image for PDF:', err);
                                    finalizeExport();
                                };
                            })
                            .catch((error: unknown) => {
                                Logger.error('Failed to export as PDF:', error);
                                finalizeExport();
                            });
                    }
                } else {
                    setGroupIdToStartWith();
                    clearPendingExport();
                    setIsExporting(false);
                }
            }, 200);
        }
    }, [pendingExport, generateGraphMLData, setGroupIdToStartWith, clearPendingExport, data, setIsExporting]);

    const downloadGroupOrganigramAsGraphML = useCallback((groupId: number) => {
        const groupName = groupsById[groupId]?.name ?? 'Unknown Group';
        const fileName = `Gruppenorganigramm-${groupName}-${moment().format('LD')}.graphml`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ fileName, type: 'graphml' });
    }, [groupsById, setGroupIdToStartWith, setPendingExport]);

    const downloadGroupOrganigramAsPNG = useCallback((groupId: number) => {
        const groupName = groupsById[groupId]?.name ?? 'Unknown Group';
        const fileName = `Organigramm-${groupName}-${moment().format('LD')}.png`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ fileName, type: 'png' });
    }, [groupsById, setGroupIdToStartWith, setPendingExport]);

    const downloadGroupOrganigramAsPDF = useCallback((groupId: number) => {
        const groupName = groupsById[groupId]?.name ?? 'Unknown Group';
        const fileName = `Organigramm-${groupName}-${moment().format('LD')}.pdf`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ fileName, type: 'pdf' });
    }, [groupsById, setGroupIdToStartWith, setPendingExport]);

    const downloadGroupOrganigramAsSVG = useCallback((groupId: number) => {
        const groupName = groupsById[groupId]?.name ?? 'Unknown Group';
        const fileName = `Organigramm-${groupName}-${moment().format('LD')}.svg`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ fileName, type: 'svg' });
    }, [groupsById, setGroupIdToStartWith, setPendingExport]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        Logger.log(`onNodeClick::${node.id}`);
        setGroupIdToStartWith(node.id);
    }, [setGroupIdToStartWith]);

    const onContextMenu = useCallback((e: ReactMouseEvent, node: Node) => {
        e.preventDefault();
        show({
            event: e.nativeEvent,
            props: { groupId: Number(node.id) },
        });
    }, [show]);

    const didClickOpenGroup = useCallback((params: ItemParams<ContextMenuProps>) => {
        const groupId = params.props?.groupId;
        if (groupId && baseUrl) {
            window.open(`${baseUrl}/groups/${String(groupId)}`, '_blank')?.focus();
        }
    }, [baseUrl]);

    const didClickSetGroupAsStartGroup = useCallback((params: ItemParams<ContextMenuProps>) => {
        const groupId = params.props?.groupId;
        if (groupId) {
            setGroupIdToStartWith(String(groupId));
        }
    }, [setGroupIdToStartWith]);

    const didClickDownloadGroupOrganigramAsGraphml = useCallback((params: ItemParams<ContextMenuProps>) => {
        const groupId = params.props?.groupId;
        if (groupId) {
            downloadGroupOrganigramAsGraphML(groupId);
        }
    }, [downloadGroupOrganigramAsGraphML]);

    const didClickDownloadGroupOrganigramAsPNG = useCallback((params: ItemParams<ContextMenuProps>) => {
        const groupId = params.props?.groupId;
        if (groupId) {
            downloadGroupOrganigramAsPNG(groupId);
        }
    }, [downloadGroupOrganigramAsPNG]);

    const didClickDownloadGroupOrganigramAsPDF = useCallback((params: ItemParams<ContextMenuProps>) => {
        const groupId = params.props?.groupId;
        if (groupId) {
            downloadGroupOrganigramAsPDF(groupId);
        }
    }, [downloadGroupOrganigramAsPDF]);

    const didClickDownloadGroupOrganigramAsSVG = useCallback((params: ItemParams<ContextMenuProps>) => {
        const groupId = params.props?.groupId;
        if (groupId) {
            downloadGroupOrganigramAsSVG(groupId);
        }
    }, [downloadGroupOrganigramAsSVG]);

    return (
        <div className="size-full">
            <ReactFlow
                edges={data.edges}
                maxZoom={4}
                minZoom={0.05}
                nodes={data.nodes}
                nodesDraggable={false}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onContextMenu}
                panOnDrag
                zoomOnScroll
            >
                <Menu animation="scale" id={Constants.contextMenuId}>
                    <Item onClick={didClickOpenGroup}>Gruppe aufrufen</Item>
                    <Item onClick={didClickSetGroupAsStartGroup}>Gruppe als Startgruppe setzen</Item>
                    <Submenu label="Organigramm für Gruppe Exportieren">
                        <Item onClick={didClickDownloadGroupOrganigramAsGraphml}>Export als GraphML Datei</Item>
                        <Item onClick={didClickDownloadGroupOrganigramAsPNG}>Export als PNG Datei</Item>
                        <Item onClick={didClickDownloadGroupOrganigramAsPDF}>Export als PDF Datei</Item>
                        <Item onClick={didClickDownloadGroupOrganigramAsSVG}>Export als SVG Datei</Item>
                    </Submenu>
                </Menu>
                <MiniMap pannable position="bottom-right" zoomable />
                <Controls position="bottom-right" />
                <Background />
                <Panel className="h-[calc(100%-2rem)] w-80" position="top-left">
                    <Sidebar isLoading={isLoading} />
                </Panel>
            </ReactFlow>
        </div>
    );
});
