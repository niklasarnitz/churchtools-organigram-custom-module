import type { Edge, Node } from 'reactflow';

import dagre from 'dagre';

import type { PreviewGraphNodeData } from '../../components/PreviewGraph/PreviewGraphNode';

import { getGroupNodeWidth, getReflowGroupNodeHeight } from '../GraphHelper';

export const layoutDagre = (
	nodes: Node[],
	edges: Edge[],
): { edges: Edge[]; nodes: Node[]; } => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	
    dagreGraph.setGraph({
		marginx: 50,
        marginy: 50,
        nodesep: 50,
        rankdir: 'LR',
        ranksep: 100,
	});

	for (const node of nodes) {
		const data = node.data as PreviewGraphNodeData;
		const width = Math.max(getGroupNodeWidth(data.title, data.metadata), 250);
		const height = Math.max(getReflowGroupNodeHeight(data.metadata, data.title), 150);

		dagreGraph.setNode(node.id, { height, width });
	}

	for (const edge of edges) {
		dagreGraph.setEdge(edge.source, edge.target);
	}

	dagre.layout(dagreGraph);

	const layoutedNodes = nodes.map((node) => {
        const nodeWithLayout = dagreGraph.node(node.id);
        
        return {
            ...node,
            position: {
                x: nodeWithLayout.x - nodeWithLayout.width / 2,
                y: nodeWithLayout.y - nodeWithLayout.height / 2,
            },
        };
    });

	return { edges, nodes: layoutedNodes };
};
