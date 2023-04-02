import { MarkerType, Position } from 'reactflow';
import { createData } from '../createRelatedData';
import { getColorForGroupType } from '../../globals/Colors';
import { getGroupMetadataString, getGroupNodeWidth, getGroupTitle, getReflowGroupNodeHeight } from './../GraphHelper';
import { useAppStore } from '../../state/useAppStore';
import dagre from 'dagre';
import type { Edge } from './../../../node_modules/@reactflow/core/dist/esm/types/edges.d';
import type { Node } from 'reactflow';

export const generateReflowData = () => {
	const { relations, nodes } = createData();
	const { personsById, groupTypesById } = useAppStore.getState();

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
			height: getReflowGroupNodeHeight(groupNodeMetadataString, groupNodeMetadataString) * 2,
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
						label: JSON.stringify({
							id: node.group.id,
							title: getGroupTitle(node.group, true),
							groupTypeName: groupTypesById[node.group.information.groupTypeId].name,
							metadata: getGroupMetadataString(node?.groupRoles, node?.members, personsById),
							color: getColorForGroupType(node.group.information.groupTypeId),
						}),
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
				className: 'black-100',
				markerEnd: {
					type: MarkerType.Arrow,
				},
			} as Edge;
		}),
	};
};
