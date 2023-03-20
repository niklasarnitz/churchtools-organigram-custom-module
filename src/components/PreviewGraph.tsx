import 'reactflow/dist/style.css';
import 'reactflow/dist/style.css';
import { createData } from '../helpers/createRelatedData';
import { getReflowEdges, getReflowNodes } from '../helpers/dataConverters/ReflowConverter';
import { useAppStore } from '../state/useAppStore';
import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
	Background,
	ConnectionLineType,
	Controls,
} from 'reactflow';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 150;
const nodeHeight = 50;

export const PreviewGraph = React.memo(() => {
	const hierarchies = useAppStore((s) => s.hierarchies);
	const groupsById = useAppStore((s) => s.groupsById);
	const groups = useAppStore((s) => s.groups);
	const groupMembers = useAppStore((s) => s.groupMembers);
	const selectedRoles = useAppStore((s) => s.selectedRoles);

	const { nodes: dataNodes, relations } = useMemo(() => createData(hierarchies, groupsById, groups, groupMembers, selectedRoles), [groupMembers, groups, groupsById, hierarchies, selectedRoles]);

	const [nodes, setNodes] = useState(getReflowNodes(dataNodes));

	const doLayout = useCallback(() => {
		const localNodes = getReflowNodes(dataNodes);
		const localEdges = getReflowEdges(relations);

		const dagreGraph = new dagre.graphlib.Graph();
		dagreGraph.setDefaultEdgeLabel(() => ({}));

		dagreGraph.setGraph({ rankdir: 'TB' });

		for (const node of localNodes) {
			dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
		}

		for (const edge of localEdges) {
			dagreGraph.setEdge(edge.source, edge.target);
		}

		dagre.layout(dagreGraph);

		const layoutedNodes = localNodes.map((node) => {
			const nodeWithPosition = dagreGraph.node(node.id);

			// We are shifting the dagre node position (anchor=center center) to the top left
			// so it matches the React Flow node anchor point (top left).
			return {
				...node,
				position: {
					x: nodeWithPosition.x - nodeWidth / 2,
					y: nodeWithPosition.y - nodeHeight / 2,
				},
			};
		});

		setNodes(layoutedNodes);
	}, [dataNodes, relations, setNodes]);

	return (
		<ReactFlow nodes={nodes} edges={getReflowEdges(relations)} connectionLineType={ConnectionLineType.SmoothStep} fitView onConnect={doLayout}>
			<Background />
			<Controls />
		</ReactFlow>
	);
});
