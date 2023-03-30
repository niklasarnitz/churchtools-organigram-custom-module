import { MarkerType, Position } from 'reactflow';
import { createData } from '../createRelatedData';
import { getGroupMetadataString, getGroupNodeWidth, getGroupTitle, getReflowGroupNodeHeight } from './../GraphHelper';
import { useAppStore } from '../../state/useAppStore';
import dagre from 'dagre';
import type { Edge } from './../../../node_modules/@reactflow/core/dist/esm/types/edges.d';
import type { Node } from 'reactflow';

export const generateReflowData = () => {
	const { relations, nodes } = createData();
	const { personsById } = useAppStore.getState();

	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({
		rankdir: 'LR',
	});

	for (const node of nodes) {
		const groupNodeTitleString = getGroupTitle(node.group);
		const groupNodeMetadataString = getGroupMetadataString(node.groupRoles, node.members, personsById);

		dagreGraph.setNode(node.group.id.toString(), {
			width: Number(getGroupNodeWidth(groupNodeTitleString, groupNodeMetadataString)),
			height: getReflowGroupNodeHeight(groupNodeMetadataString, groupNodeMetadataString) * 2 + 32,
		});
	}

	for (const relation of relations) {
		dagreGraph.setEdge(relation.source.id.toString(), relation.target.id.toString());
	}

	dagre.layout(dagreGraph);

	const localReflowNodes: (Node | undefined)[] = dagreGraph.nodes().map((nodeId) => {
		const node = nodes.find((node) => node.group.id === Number(nodeId));
		return node
			? {
					id: nodeId,
					targetPosition: Position.Left,
					sourcePosition: Position.Right,
					data: {
						label: `${getGroupTitle(node.group)}\n\n${getGroupMetadataString(
							node?.groupRoles,
							node?.members,
							personsById,
						)}`,
					},
					type: 'previewGraphNode',
					position: {
						x: dagreGraph.node(nodeId).x,
						y: dagreGraph.node(nodeId).y,
					},
			  }
			: undefined;
	});

	return {
		nodes: localReflowNodes.filter((node) => node !== undefined) as Node[],
		edges: relations.map((relation) => {
			return {
				id: `${relation.source.id}-${relation.target.id}`,
				source: relation.source.id.toString(),
				target: relation.target.id.toString(),
				type: 'smoothstep',
				animated: true,
				className: 'black-100',
				markerEnd: {
					type: MarkerType.Arrow,
				},
			} as Edge;
		}),
	};
};
