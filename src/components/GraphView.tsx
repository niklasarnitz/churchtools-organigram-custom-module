import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ItemParams } from 'react-contexify';
import type { Node } from 'reactflow';

import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import moment from 'moment';
import React, { useCallback, useEffect, useRef } from 'react';
import { Item, Menu, Submenu, useContextMenu } from 'react-contexify';
import ReactFlow, { Background, Controls, MiniMap, Panel, useReactFlow } from 'reactflow';

import { Constants } from '../globals/Constants';
import { downloadImage } from '../globals/downloadImage';
import { Logger } from '../globals/Logger';
import { downloadTextFile } from '../helpers/downloadTextFile';
import { getGroupNodeWidth, getReflowGroupNodeHeight } from '../helpers/GraphHelper';
import { useGenerateGraphMLData } from '../selectors/useGenerateGraphMLData';
import { useGenerateReflowData } from '../selectors/useGenerateReflowData';
import { useGroupsById } from '../selectors/useGroupsById';
import { useAppStore } from '../state/useAppStore';
import { type PreviewGraphNodeData, PreviewGraphNode } from './PreviewGraph/PreviewGraphNode';
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
    const lastProcessedExportRef = useRef<null | string>(null);
    const showGroupTypes = useAppStore(s => s.showGroupTypes)

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
        if (!pendingExport) {
            lastProcessedExportRef.current = null;
            return;
        }

        const exportId = `${pendingExport.type}-${pendingExport.fileName}`;
        if (lastProcessedExportRef.current === exportId) return;
        lastProcessedExportRef.current = exportId;

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

                    // Exports should always be in light mode as requested.
                    const isDarkMode = document.documentElement.classList.contains('dark');

                    if (isDarkMode) {
                        document.documentElement.classList.remove('dark');
                    }

                    const finalizeExport = () => {
                        if (isDarkMode) {
                            document.documentElement.classList.add('dark');
                        }
                        setGroupIdToStartWith();
                        clearPendingExport();
                        setIsExporting(false);
                    };

                    const exportOptions = {
                        filter,
                        font: [],
                        pixelRatio: 10,
                        skipFonts: true,
                    };

                    if (pendingExport.type === 'png') {
                        toPng(reactFlow as HTMLElement, exportOptions)
                            .then(downloadImage)
                            .catch((error: unknown) => {
                                Logger.error('Failed to export as PNG:', error);
                            })
                            .finally(finalizeExport);
                    } else if (pendingExport.type === 'svg') {
                        toSvg(reactFlow as HTMLElement, exportOptions)
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
                        const { edges, nodes } = data;
                        if (nodes.length === 0) {
                            finalizeExport();
                            return;
                        }

                        // Calculate bounds
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        nodes.forEach((node) => {
                            const n = node as Node<PreviewGraphNodeData>;
                            const w = Math.max(getGroupNodeWidth(n.data.title, n.data.metadata), 250);
                            const hasMembers = n.data.roles.some((role) => 
                                n.data.members.some((member) => member.groupTypeRoleId === role.id)
                            );
                            const h = Math.max(getReflowGroupNodeHeight(n.data.metadata, n.data.title, hasMembers, showGroupTypes), hasMembers ? 150 : 80);

                            minX = Math.min(minX, node.position.x);
                            minY = Math.min(minY, node.position.y);
                            maxX = Math.max(maxX, node.position.x + w);
                            maxY = Math.max(maxY, node.position.y + h);
                        });

                        const padding = 40;
                        const gW = maxX - minX;
                        const gH = maxY - minY;
                        const orientation = gW > gH ? 'landscape' : 'portrait';

                        const pdf = new jsPDF({
                            format: 'a3',
                            orientation,
                            unit: 'pt',
                        });

                        const pageW = orientation === 'landscape' ? 1190.55 : 841.89;
                        const pageH = orientation === 'landscape' ? 841.89 : 1190.55;

                        const scale = Math.min((pageW - (padding * 2)) / gW, (pageH - (padding * 2)) / gH);

                        const offsetX = ((pageW - (gW * scale)) / 2) - (minX * scale);
                        const offsetY = ((pageH - (gH * scale)) / 2) - (minY * scale);

                        // Draw edges
                        pdf.setDrawColor(100, 116, 139); // #64748b
                        pdf.setLineWidth(2 * scale);
                        edges.forEach((edge) => {
                            const sourceNode = nodes.find((n) => n.id === edge.source);
                            const targetNode = nodes.find((n) => n.id === edge.target);
                            if (sourceNode && targetNode) {
                                const s = sourceNode as Node<PreviewGraphNodeData>;
                                const t = targetNode as Node<PreviewGraphNodeData>;

                                const sw = Math.max(getGroupNodeWidth(s.data.title, s.data.metadata), 250);
                                const shm = s.data.roles.some((role) => 
                                    s.data.members.some((member) => member.groupTypeRoleId === role.id)
                                );
                                const sh = Math.max(getReflowGroupNodeHeight(s.data.metadata, s.data.title, shm, showGroupTypes), shm ? 150 : 80);

                                const tw = Math.max(getGroupNodeWidth(t.data.title, t.data.metadata), 250);
                                const thm = t.data.roles.some((role) => 
                                    t.data.members.some((member) => member.groupTypeRoleId === role.id)
                                );
                                const th = Math.max(getReflowGroupNodeHeight(t.data.metadata, t.data.title, thm, showGroupTypes), thm ? 150 : 80);

                                const x1 = (sourceNode.position.x + (sw / 2)) * scale + offsetX;
                                const y1 = (sourceNode.position.y + sh) * scale + offsetY;
                                const x2 = (targetNode.position.x + (tw / 2)) * scale + offsetX;
                                const y2 = (targetNode.position.y) * scale + offsetY;

                                pdf.line(x1, y1, x2, y2);

                                // Simple arrow head
                                const angle = Math.atan2(y2 - y1, x2 - x1);
                                const headLen = 10 * scale;
                                pdf.line(x2, y2, x2 - (headLen * Math.cos(angle - (Math.PI / 6))), y2 - (headLen * Math.sin(angle - (Math.PI / 6))));
                                pdf.line(x2, y2, x2 - (headLen * Math.cos(angle + (Math.PI / 6))), y2 - (headLen * Math.sin(angle + (Math.PI / 6))));
                            }
                        });

                        // Draw nodes
                        nodes.forEach((node) => {
                            const n = node as Node<PreviewGraphNodeData>;
                            const w = Math.max(getGroupNodeWidth(n.data.title, n.data.metadata), 250);
                            const hasMembers = n.data.roles.some((role) => 
                                n.data.members.some((member) => member.groupTypeRoleId === role.id)
                            );
                            const h = Math.max(getReflowGroupNodeHeight(n.data.metadata, n.data.title, hasMembers, showGroupTypes), hasMembers ? 150 : 80);
                            const x = node.position.x * scale + offsetX;
                            const y = node.position.y * scale + offsetY;
                            const scaledW = w * scale;
                            const scaledH = h * scale;

                            // Node background
                            pdf.setDrawColor(n.data.color.shades[300]);
                            pdf.setLineWidth(1 * scale);
                            pdf.setFillColor(255, 255, 255);
                            pdf.roundedRect(x, y, scaledW, scaledH, 12 * scale, 12 * scale, 'FD');

                            // Header background
                            pdf.setFillColor(n.data.color.shades[100]);
                            const headerHeight = showGroupTypes ? 50 : 40;
                            const scaledHeaderH = headerHeight * scale;
                            pdf.roundedRect(x, y, scaledW, scaledHeaderH, 12 * scale, 12 * scale, 'FD');
                            // Cover bottom rounded corners of header
                            pdf.rect(x, y + (scaledHeaderH / 2), scaledW, scaledHeaderH / 2, 'F');
                            // Border for header bottom
                            if (hasMembers) {
                                pdf.setDrawColor(n.data.color.shades[300]);
                                pdf.line(x, y + scaledHeaderH, x + scaledW, y + scaledHeaderH);
                            }

                            // Title
                            pdf.setTextColor(15, 23, 42); // slate-900
                            pdf.setFont('helvetica', 'bold');
                            pdf.setFontSize(14 * scale);
                            const titleLines = pdf.splitTextToSize(n.data.title, (w - 20) * scale);
                            pdf.text(titleLines, x + (scaledW / 2), y + (20 * scale), { align: 'center' });

                            // Group Type
                            if (showGroupTypes) {
                                pdf.setFont('helvetica', 'bold');
                                pdf.setFontSize(10 * scale);
                                pdf.setTextColor(100, 116, 139); // slate-500
                                pdf.text(n.data.groupTypeName.toUpperCase(), x + (scaledW / 2), y + (38 * scale), { align: 'center' });
                            }

                            // Members & Roles
                            if (hasMembers) {
                                let currentY = y + scaledHeaderH + (20 * scale);
                                n.data.roles.forEach((role) => {
                                    const personsInRole = n.data.members.filter(m => m.groupTypeRoleId === role.id);
                                    if (personsInRole.length === 0) return;

                                    pdf.setFont('helvetica', 'bold');
                                    pdf.setFontSize(10 * scale);
                                    pdf.setTextColor(100, 116, 139); // slate-500
                                    pdf.text(role.name.toUpperCase(), x + (20 * scale), currentY);
                                    currentY += 15 * scale;

                                    pdf.setFont('helvetica', 'normal');
                                    pdf.setFontSize(11 * scale);
                                    pdf.setTextColor(30, 41, 59); // slate-800

                                    const names = personsInRole.map(member => {
                                        const person = n.data.personsById[member.personId];
                                        return person ? `${person.firstName} ${person.lastName}` : 'Unknown Person';
                                    }).join(', ');

                                    const nameLines = pdf.splitTextToSize(names, (w - 40) * scale);
                                    pdf.text(nameLines, x + (20 * scale), currentY);
                                    currentY += (nameLines.length * 14 * scale) + (10 * scale);
                                });
                            }
                        });

                        pdf.save(pendingExport.fileName);
                        finalizeExport();
                    }
                } else {                    setGroupIdToStartWith();
                    clearPendingExport();
                    setIsExporting(false);
                }
            }, 200);
        }
    }, [pendingExport, generateGraphMLData, setGroupIdToStartWith, clearPendingExport, setIsExporting]);

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
