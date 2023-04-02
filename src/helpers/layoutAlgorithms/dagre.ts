import { getGroupMetadataString, getGroupNodeWidth, getGroupTitle, getReflowGroupNodeHeight } from '../GraphHelper';
import { useAppStore } from '../../state/useAppStore';
import dagre from 'dagre';
import type { Edge, Node } from 'reactflow';
import type { GraphNode } from '../../models/GraphNode';

export const layoutDagre = (nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } => {
	const { personsById } = useAppStore.getState();

	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({
		rankdir: 'LR',
	});

	for (const node of nodes) {
		const nodeData = JSON.parse(node.data.label);

		if (nodeData && nodeData.node) {
			const typedNode = nodeData.node as GraphNode;

			const groupNodeTitleString = getGroupTitle(typedNode.group, true);
			const groupNodeMetadataString = getGroupMetadataString(
				typedNode.groupRoles,
				typedNode.members,
				personsById,
			);

			dagreGraph.setNode(typedNode.group.id.toString(), {
				width: Number(getGroupNodeWidth(groupNodeTitleString, groupNodeMetadataString)),
				height: getReflowGroupNodeHeight(groupNodeMetadataString, groupNodeMetadataString) * 2,
			});
		}
	}

	for (const edge of edges) {
		dagreGraph.setEdge(edge.source, edge.target);
	}

	dagre.layout(dagreGraph);

	const layoutedNodes = dagreGraph
		.nodes()
		.map((node) => {
			const findableNode = nodes.find((n) => n.id === node);

			if (findableNode) {
				return {
					...findableNode,
					position: {
						x: dagreGraph.node(node).x,
						y: dagreGraph.node(node).y,
					},
				};
			}

			// eslint-disable-next-line unicorn/no-useless-undefined
			return undefined;
		})
		.filter((node) => node !== undefined) as Node[];

	return { nodes: layoutedNodes, edges };
};
