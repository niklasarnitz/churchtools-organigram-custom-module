import { Constants } from '../globals/Constants';
import { Item, Menu, Submenu, useContextMenu } from 'react-contexify';
import { Logger } from '../globals/Logger';
import { PreviewGraphNode } from './PreviewGraph/PreviewGraphNode';
import { Sidebar } from './Sidebar/Sidebar';
import { downloadImage } from '../globals/downloadImage';
import { downloadTextFile } from '../helpers/downloadTextFile';
import { toPng } from 'html-to-image';
import { useAppStore } from '../state/useAppStore';
import { useGenerateGraphMLData } from '../selectors/useGenerateGraphMLData';
import { useGenerateReflowData } from '../selectors/useGenerateReflowData';
import { useGroupsById } from '../selectors/useGroupsById';
import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { Background, MiniMap, Panel, useReactFlow } from 'reactflow';
import moment from 'moment';
import type { ItemParams } from 'react-contexify';
import type { Node} from 'reactflow';
import type { MouseEvent as ReactMouseEvent } from 'react';

const nodeTypes = {
    previewGraphNode: PreviewGraphNode,
};

export const GraphView = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const data = useGenerateReflowData();
    const groupsById = useGroupsById();
    const generateGraphMLData = useGenerateGraphMLData();
    const setGroupIdToStartWith = useAppStore((s) => s.setGroupIdToStartWith);
    const baseUrl = useAppStore((s) => s.baseUrl);
    const { fitView } = useReactFlow();

    const [pendingExport, setPendingExport] = useState<{ type: 'graphml' | 'png'; groupId: number; fileName: string }>();
    const clearPendingExport = useCallback(() => setPendingExport(// eslint-disable-next-line unicorn/no-useless-undefined
        undefined), []);

    const { show } = useContextMenu({
        id: Constants.contextMenuId,
    });

    // Auto-fit view when data changes
    const nodeCount = data.nodes.length;
    useEffect(() => {
        if (nodeCount > 0) {
            setTimeout(() => {
                fitView({ duration: 400, padding: 0.2 });
            }, 50);
        }
    }, [nodeCount, fitView]);

    // Handle pending exports after data has settled from group change
    useEffect(() => {
        if (!pendingExport) return;

        if (pendingExport.type === 'graphml') {
            downloadTextFile(generateGraphMLData(), pendingExport.fileName, document);
            setGroupIdToStartWith();
            clearPendingExport();
        } else if (pendingExport.type === 'png') {
            setTimeout(() => {
                const reactFlow = document.querySelector('.react-flow');
                if (reactFlow) {
                    toPng(reactFlow as HTMLElement, {
                        filter: (node: HTMLElement) => {
                            return !(
                                node?.classList?.contains('react-flow__minimap') ||
                                node?.classList?.contains('react-flow__controls') ||
                                node?.classList?.contains('react-flow__panel') ||
                                node?.classList?.contains('contexify')
                            );
                        },
                    })
                    .then(downloadImage)
                    .catch((error) => {
                        Logger.error('Failed to export as PNG:', error);
                    })
                    .finally(() => {
                        setGroupIdToStartWith();
                        clearPendingExport();
                    });
                } else {
                    setGroupIdToStartWith();
                    clearPendingExport();
                }
            }, 200);
        }
    }, [pendingExport, generateGraphMLData, setGroupIdToStartWith, clearPendingExport, data]);

    const downloadGroupOrganigramAsGraphML = useCallback((groupId: number) => {
        const groupName = groupsById[groupId]?.name;
        const fileName = `Gruppenorganigramm-${groupName}-${moment().format('LD')}.graphml`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ type: 'graphml', groupId, fileName });
    }, [groupsById, setGroupIdToStartWith]);

    const downloadGroupOrganigramAsPNG = useCallback((groupId: number) => {
        const groupName = groupsById[groupId]?.name;
        const fileName = `Organigramm-${groupName}-${moment().format('LD')}.png`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ type: 'png', groupId, fileName });
    }, [groupsById, setGroupIdToStartWith]);

    const onNodeClick = useCallback((_: any, node: Node) => {
        Logger.log('onNodeClick::' + node.id);
        setGroupIdToStartWith(node.id);
    }, [setGroupIdToStartWith]);

    const onContextMenu = useCallback((e: ReactMouseEvent, node: any) => {
        e.preventDefault();
        if (node?.id) {
            show({
                event: e,
                props: { groupId: node.id },
            });
        }
    }, [show]);

    const didClickOpenGroup = useCallback((params: ItemParams) => {
        const groupId = params.props?.groupId;
        if (groupId && baseUrl) {
            window.open(`${baseUrl}/groups/${groupId}`, '_blank')?.focus();
        }
    }, [baseUrl]);

    const didClickSetGroupAsStartGroup = useCallback((params: ItemParams) => {
        const groupId = params.props?.groupId;
        if (groupId) {
            setGroupIdToStartWith(String(groupId));
        }
    }, [setGroupIdToStartWith]);

    const didClickDownloadGroupOrganigramAsGraphml = useCallback((params: ItemParams) => {
        const groupId = params.props?.groupId;
        if (groupId) {
            downloadGroupOrganigramAsGraphML(Number(groupId));
        }
    }, [downloadGroupOrganigramAsGraphML]);

    const didClickDownloadGroupOrganigramAsPNG = useCallback((params: ItemParams) => {
        const groupId = params.props?.groupId;
        if (groupId) {
            downloadGroupOrganigramAsPNG(Number(groupId));
        }
    }, [downloadGroupOrganigramAsPNG]);

    return (
        <div className="size-full">
            <ReactFlow
                nodes={data.nodes}
                edges={data.edges}
                nodesDraggable={false}
                zoomOnScroll
                panOnDrag
                onNodeClick={onNodeClick}
                onNodeContextMenu={onContextMenu}
                nodeTypes={nodeTypes}
            >
                <Menu id={Constants.contextMenuId} animation="scale">
                    <Item onClick={didClickOpenGroup}>Gruppe aufrufen</Item>
                    <Item onClick={didClickSetGroupAsStartGroup}>Gruppe als Startgruppe setzen</Item>
                    <Submenu label="Organigramm für Gruppe Exportieren">
                        <Item onClick={didClickDownloadGroupOrganigramAsGraphml}>Export als GraphML Datei</Item>
                        <Item onClick={didClickDownloadGroupOrganigramAsPNG}>Export als PNG Datei</Item>
                    </Submenu>
                </Menu>
                <MiniMap zoomable pannable />
                <Background />
                <Panel position="top-left" className="h-4/5 w-80">
                    <Sidebar isLoading={isLoading} />
                </Panel>
            </ReactFlow>
        </div>
    );
});
