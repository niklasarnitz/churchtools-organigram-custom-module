import { getGroupNodeWidth, getReflowGroupNodeHeight } from '../GraphHelper';
import dagre from 'dagre';
import type { Edge, Node } from 'reactflow';
import type { PreviewGraphNodeData } from '../../components/PreviewGraph/PreviewGraphNode';

export const layoutDagre = (
	nodes: Node[],
	edges: Edge[],
): { nodes: Node[]; edges: Edge[] } => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	
    dagreGraph.setGraph({
		rankdir: 'LR',
        ranksep: 100,
        nodesep: 50,
        marginx: 50,
        marginy: 50,
	});

	for (const node of nodes) {
		const data = node.data as PreviewGraphNodeData;
		const width = Math.max(getGroupNodeWidth(data.title, data.metadata), 250);
		const height = Math.max(getReflowGroupNodeHeight(data.metadata, data.title), 150);

		dagreGraph.setNode(node.id, { width, height });
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

	return { nodes: layoutedNodes, edges };
};
