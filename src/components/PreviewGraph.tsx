import 'reactflow/dist/style.css';
import 'reactflow/dist/style.css';
import { getReflowEdges, getReflowNodes } from '../helpers/dataConverters/ReflowConverter';
import React from 'react';
import ReactFlow, {
	Background,
	ConnectionLineType,
	Controls
} from 'reactflow';
import dagre from 'dagre';
import type { GraphData } from '../models/GraphData';
import type {
	Node
} from 'reactflow';

export type PreviewGraphProps = {
	graphData: GraphData;
}

export const PreviewGraph = ({ graphData }: PreviewGraphProps) => {
	const layoutedNodes: Node[] = [];
	const layoutedEdges: any[] = [];
	layoutedEdges.push(...getReflowEdges(graphData.relations));
	const bareNodes = getReflowNodes(graphData.nodes);

	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({ rankdir: "TB" });

	for (const node of bareNodes) {
		dagreGraph.setNode(node.id, { width: 150, height: 50 });
	}

	for (const edge of layoutedEdges) {
		dagreGraph.setEdge(edge.source, edge.target);
	}

	dagre.layout(dagreGraph);

	for (const node of dagreGraph.nodes()) {
		const nodeWithPosition = dagreGraph.node(node);

		const foundNode = bareNodes.find((n) => n.id === node);

		if (!foundNode) {
			continue;
		}

		layoutedNodes.push({
			...foundNode,
			position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
		});
	}


	return (
		<ReactFlow nodes={layoutedNodes} edges={layoutedEdges} connectionLineType={ConnectionLineType.SmoothStep} fitView
			elementsSelectable={false}
			nodesDraggable={false}
			nodesConnectable={false}
		>
			<Background />
			<Controls />
		</ReactFlow>
	);
};
