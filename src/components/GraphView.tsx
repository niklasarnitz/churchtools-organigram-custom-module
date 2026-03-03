import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ItemParams } from 'react-contexify';
import type { Node} from 'reactflow';

import { toPng } from 'html-to-image';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { Item, Menu, Submenu, useContextMenu } from 'react-contexify';
import ReactFlow, { Background, MiniMap, Panel, useReactFlow } from 'reactflow';

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

export const GraphView = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const data = useGenerateReflowData();
    const groupsById = useGroupsById();
    const generateGraphMLData = useGenerateGraphMLData();
    const setGroupIdToStartWith = useAppStore((s) => s.setGroupIdToStartWith);
    const baseUrl = useAppStore((s) => s.baseUrl);
    const { fitView } = useReactFlow();

    const [pendingExport, setPendingExport] = useState<{ fileName: string; groupId: number; type: 'graphml' | 'png'; }>();
    const clearPendingExport = useCallback(() => { setPendingExport(// eslint-disable-next-line unicorn/no-useless-undefined
        undefined); }, []);

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
        setPendingExport({ fileName, groupId, type: 'graphml' });
    }, [groupsById, setGroupIdToStartWith]);

    const downloadGroupOrganigramAsPNG = useCallback((groupId: number) => {
        const groupName = groupsById[groupId]?.name;
        const fileName = `Organigramm-${groupName}-${moment().format('LD')}.png`;

        setGroupIdToStartWith(groupId.toString());
        setPendingExport({ fileName, groupId, type: 'png' });
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
                edges={data.edges}
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
                    </Submenu>
                </Menu>
                <MiniMap pannable zoomable />
                <Background />
                <Panel className="h-4/5 w-80" position="top-left">
                    <Sidebar isLoading={isLoading} />
                </Panel>
            </ReactFlow>
        </div>
    );
});
