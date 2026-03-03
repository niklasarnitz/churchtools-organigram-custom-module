import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ItemParams } from 'react-contexify';
import type { Node } from 'reactflow';

import { toPng } from 'html-to-image';
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

        if (pendingExport.type === 'graphml') {
            downloadTextFile(generateGraphMLData(), pendingExport.fileName, document);
            setGroupIdToStartWith();
            setTimeout(() => {
                clearPendingExport();
            }, 0);
        } else {
            setTimeout(() => {
                const reactFlow = document.querySelector('.react-flow');
                if (reactFlow) {
                    const filter = (node: HTMLElement) => {
                        return !(
                            node.classList.contains('react-flow__minimap') ||
                            node.classList.contains('react-flow__controls') ||
                            node.classList.contains('react-flow__panel') ||
                            node.classList.contains('contexify')
                        );
                    };

                    if (pendingExport.type === 'png') {
                        toPng(reactFlow as HTMLElement, {
                            filter,
                            pixelRatio: 2,
                        })
                            .then(downloadImage)
                            .catch((error: unknown) => {
                                Logger.error('Failed to export as PNG:', error);
                            })
                            .finally(() => {
                                setGroupIdToStartWith();
                                clearPendingExport();
                            });
                    } else if (pendingExport.type === 'pdf') {
                        // For PDF, we want high quality. Vectorized is hard due to foreignObjects,
                        // so we use a very high pixel ratio and put it in a PDF.
                        toPng(reactFlow as HTMLElement, {
                            filter,
                            pixelRatio: 4, // High resolution for "zooming in"
                        })
                            .then((dataUrl) => {
                                const pdf = new jsPDF('l', 'mm', 'a4');
                                const imgProps = pdf.getImageProperties(dataUrl);
                                const pdfWidth = pdf.internal.pageSize.getWidth();
                                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                                
                                pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
                                pdf.save(pendingExport.fileName);
                            })
                            .catch((error: unknown) => {
                                Logger.error('Failed to export as PDF:', error);
                            })
                            .finally(() => {
                                setGroupIdToStartWith();
                                clearPendingExport();
                            });
                    }
                } else {
                    setGroupIdToStartWith();
                    clearPendingExport();
                }
            }, 200);
        }
    }, [pendingExport, generateGraphMLData, setGroupIdToStartWith, clearPendingExport, data]);

    const downloadGroupOrganigramAsGraphML = useCallback((groupId: number) => {
        const groupName = groupsById[groupId].name;
        const fileName = `Gruppenorganigramm-${groupName}-${moment().format('LD')}.graphml`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ fileName, type: 'graphml' });
    }, [groupsById, setGroupIdToStartWith, setPendingExport]);

    const downloadGroupOrganigramAsPNG = useCallback((groupId: number) => {
        const groupName = groupsById[groupId].name;
        const fileName = `Organigramm-${groupName}-${moment().format('LD')}.png`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ fileName, type: 'png' });
    }, [groupsById, setGroupIdToStartWith, setPendingExport]);

    const downloadGroupOrganigramAsPDF = useCallback((groupId: number) => {
        const groupName = groupsById[groupId].name;
        const fileName = `Organigramm-${groupName}-${moment().format('LD')}.pdf`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ fileName, type: 'pdf' });
    }, [groupsById, setGroupIdToStartWith, setPendingExport]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        Logger.log(`onNodeClick::${node.id}`);
        setGroupIdToStartWith(node.id);
    }, [setGroupIdToStartWith]);

    const onContextMenu = useCallback((e: ReactMouseEvent, node: Node) => {
        e.preventDefault();
        show({
            event: e,
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
