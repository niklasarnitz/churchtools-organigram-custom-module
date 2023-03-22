import 'reactflow/dist/style.css';
import { getReflowEdges, getReflowNodes } from '../helpers/dataConverters/ReflowConverter';
import React, { useEffect, useState } from 'react';
import ReactFlow, {
	Background,
	ConnectionLineType,
	Controls
} from 'reactflow';
import dagre from 'dagre';
import type { DataNode } from '../models/DataNode';
import type {
	Node
} from 'reactflow';
import type { Relation } from '../models/Relation';

export type PreviewGraphProps = {
	relations: Relation[];
	nodes: DataNode[];
	displayDirection?: 'LR' | 'TB';
}

export const PreviewGraph = ({ relations, nodes, displayDirection = 'LR' }: PreviewGraphProps) => {
	const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
	const [layoutedEdges, setLayoutedEdges] = useState<any[]>([]);

	useEffect(() => {
		const bareNodes = getReflowNodes(nodes, displayDirection);

		const dagreGraph = new dagre.graphlib.Graph();
		dagreGraph.setDefaultEdgeLabel(() => ({}));
		dagreGraph.setGraph({ rankdir: displayDirection });

		for (const node of bareNodes) {
			dagreGraph.setNode(node.id, { width: 150, height: 50 });
		}

		for (const edge of layoutedEdges) {
			dagreGraph.setEdge(edge.source, edge.target);
		}

		dagre.layout(dagreGraph);

		const localNodes = [];

		for (const node of dagreGraph.nodes()) {
			const nodeWithPosition = dagreGraph.node(node);

			const foundNode = bareNodes.find((n) => n.id === node);

			if (!foundNode) {
				continue;
			}

			localNodes.push({
				...foundNode,
				position: { x: nodeWithPosition.x, y: nodeWithPosition.y },
			});
		}

		setLayoutedNodes(localNodes);
		setLayoutedEdges(getReflowEdges(relations));
	}, [relations, nodes, displayDirection, layoutedEdges])


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
