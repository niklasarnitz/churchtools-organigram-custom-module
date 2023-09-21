import { MarkerType, Position } from 'reactflow';
import { createData } from '../createRelatedData';
import { getColorForGroupType } from '../../globals/Colors';
import { getGroupMetadataString, getGroupTitle } from './../GraphHelper';
import { layoutDagre } from '../layoutAlgorithms/dagre';
import { useAppStore } from '../../state/useAppStore';
import type { Edge } from './../../../node_modules/@reactflow/core/dist/esm/types/edges.d';
import type { Node } from 'reactflow';

export const generateReflowData = () => {
	const { relations, nodes } = createData();
	const { personsById, groupTypesById, layoutAlgorithm } = useAppStore.getState();

	const reflowEdges = relations.map((relation) => {
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
	});

	const reflowNodes = nodes.map((node) => {
		return {
			id: node.group.id.toString(),
			targetPosition: Position.Left,
			sourcePosition: Position.Right,
			data: {
				label: JSON.stringify({
					id: node.group.id,
					title: getGroupTitle(node.group, true),
					groupTypeName: groupTypesById[node.group.information.groupTypeId].name,
					metadata: getGroupMetadataString(node?.groupRoles, node?.members, personsById),
					color: getColorForGroupType(node.group.information.groupTypeId),
					group: node.group,
					node,
				}),
			},
			type: 'previewGraphNode',
			position: {
				x: 0,
				y: 0,
			},
		};
	});

	const layoutedNodes: Node[] = [];

	// In the future, new Layout Mechanisms may be added here.
	switch (layoutAlgorithm) {
		case 'dagre': {
			layoutedNodes.push(...layoutDagre(reflowNodes, reflowEdges).nodes);
			break;
		}
	}

	return {
		nodes: layoutedNodes,
		edges: reflowEdges,
	};
};
