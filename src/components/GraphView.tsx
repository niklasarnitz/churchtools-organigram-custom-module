import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ItemParams } from 'react-contexify';
import type { Node } from 'reactflow';

import moment from 'moment';
import React, { useCallback, useEffect, useRef } from 'react';
import { Item, Menu, useContextMenu } from 'react-contexify';
import ReactFlow, { Background, Controls, MiniMap, Panel, useReactFlow } from 'reactflow';

import { Constants } from '../globals/Constants';
import { Logger } from '../globals/Logger';
import { downloadTextFile } from '../helpers/downloadTextFile';
import { exportReactFlowToSVG } from '../helpers/exportSvg';
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
	const { fitView, getNodes } = useReactFlow();
	const lastProcessedExportRef = useRef<null | string>(null);

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
		} else if (pendingExport.type === 'svg') {
			const nodes = getNodes();
			if (nodes.length === 0) {
				setIsExporting(false);
				clearPendingExport();
				return;
			}

			const minX = Math.min(...nodes.map((n) => n.position.x));
			const minY = Math.min(...nodes.map((n) => n.position.y));
			const maxX = Math.max(...nodes.map((n) => n.position.x + (n.width ?? 0)));
			const maxY = Math.max(...nodes.map((n) => n.position.y + (n.height ?? 0)));

			const width = maxX - minX + 100; // Add some padding
			const height = maxY - minY + 100;

			const translateX = -minX + 50;
			const translateY = -minY + 50;

			exportReactFlowToSVG(width, height, pendingExport.fileName, translateX, translateY).then(() => {
				setGroupIdToStartWith();
				clearPendingExport();
				setIsExporting(false);
			});
		}
	}, [pendingExport, generateGraphMLData, setGroupIdToStartWith, clearPendingExport, setIsExporting, getNodes]);

	const downloadGroupOrganigramAsGraphML = useCallback(
		(groupId: number) => {
			const groupName = groupsById[groupId]?.name ?? 'Unknown Group';
			const fileName = `Gruppenorganigramm-${groupName}-${moment().format('LD')}.graphml`;

			setGroupIdToStartWith(groupId.toString());
			setPendingExport({ fileName, type: 'graphml' });
		},
		[groupsById, setGroupIdToStartWith, setPendingExport],
	);

	const downloadGroupOrganigramAsSVG = useCallback(
		(groupId: number) => {
			const groupName = groupsById[groupId]?.name ?? 'Unknown Group';
			const fileName = `Gruppenorganigramm-${groupName}-${moment().format('LD')}.svg`;

			setGroupIdToStartWith(groupId.toString());
			setPendingExport({ fileName, type: 'svg' });
		},
		[groupsById, setGroupIdToStartWith, setPendingExport],
	);

	const onNodeClick = useCallback(
		(_: React.MouseEvent, node: Node) => {
			Logger.log(`onNodeClick::${node.id}`);
			setGroupIdToStartWith(node.id);
		},
		[setGroupIdToStartWith],
	);

	const onContextMenu = useCallback(
		(e: ReactMouseEvent, node: Node) => {
			e.preventDefault();
			show({
				event: e.nativeEvent,
				props: { groupId: Number(node.id) },
			});
		},
		[show],
	);

	const didClickOpenGroup = useCallback(
		(params: ItemParams<ContextMenuProps>) => {
			const groupId = params.props?.groupId;
			if (groupId && baseUrl) {
				window.open(`${baseUrl}/groups/${String(groupId)}`, '_blank')?.focus();
			}
		},
		[baseUrl],
	);

	const didClickSetGroupAsStartGroup = useCallback(
		(params: ItemParams<ContextMenuProps>) => {
			const groupId = params.props?.groupId;
			if (groupId) {
				setGroupIdToStartWith(String(groupId));
			}
		},
		[setGroupIdToStartWith],
	);

	const didClickDownloadGroupOrganigramAsGraphml = useCallback(
		(params: ItemParams<ContextMenuProps>) => {
			const groupId = params.props?.groupId;
			if (groupId) {
				downloadGroupOrganigramAsGraphML(groupId);
			}
		},
		[downloadGroupOrganigramAsGraphML],
	);

	const didClickDownloadGroupOrganigramAsSVG = useCallback(
		(params: ItemParams<ContextMenuProps>) => {
			const groupId = params.props?.groupId;
			if (groupId) {
				downloadGroupOrganigramAsSVG(groupId);
			}
		},
		[downloadGroupOrganigramAsSVG],
	);

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
					<Item onClick={didClickDownloadGroupOrganigramAsGraphml}>Organigramm als GraphML exportieren</Item>
					<Item onClick={didClickDownloadGroupOrganigramAsSVG}>Organigramm als SVG exportieren</Item>
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
