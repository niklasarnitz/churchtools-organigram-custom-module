import dagre from 'dagre';
import type { Edge, Node } from 'reactflow';

export const layoutDagre = (
	nodes: Node[],
	edges: Edge[],
): { nodes: Node[]; edges: Edge[] } => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	
    // Set up graph options
    dagreGraph.setGraph({
		rankdir: 'LR', // Left to Right layout
        ranksep: 100,  // Distance between ranks
        nodesep: 50,   // Distance between nodes in the same rank
        marginx: 50,
        marginy: 50,
	});

	for (const node of nodes) {
        // We estimate the size of the node. 
        // In a real-world app, we might use a ResizeObserver or pre-render hidden nodes to get exact sizes.
        // For now, we'll use consistent estimates.
		dagreGraph.setNode(node.id, {
			width: 250,  // Base width
			height: 150, // Base height
		});
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
                // Adjusting to center the node
                x: nodeWithLayout.x - 125, // width / 2
                y: nodeWithLayout.y - 75,  // height / 2
            },
        };
    });

	return { nodes: layoutedNodes, edges };
};
