import type { Edge } from 'reactflow';
import type { Node } from 'reactflow';

import { useMemo } from 'react';
import { MarkerType, Position } from 'reactflow';

import { getColorForGroupType } from '../globals/Colors';
import { getGroupMetadataString, getGroupTitle } from '../helpers/GraphHelper';
import { layoutDagre } from '../helpers/layoutAlgorithms/dagre';
import { useAppStore } from '../state/useAppStore';
import { useCreateRelatedData } from './useCreateRelatedData';
import { useGroupTypesById } from './useGroupTypesById';
import { usePersonsById } from './usePersonsById';

export const useGenerateReflowData = () => {
	const { nodes, relations } = useCreateRelatedData();
	const layoutAlgorithm = useAppStore((s) => s.layoutAlgorithm);
	const showGroupTypes = useAppStore((s) => s.showGroupTypes);
    const personsById = usePersonsById();
    const groupTypesById = useGroupTypesById();

	return useMemo(() => {
		const reflowEdges = relations.map((relation) => {
			return {
				animated: true,
				className: 'black-100',
				id: `${relation.source.id}-${relation.target.id}`,
				markerEnd: {
					color: '#64748b',
					height: 20,
					type: MarkerType.Arrow,
					width: 20,
				},
				source: relation.source.id.toString(),
				style: { stroke: '#64748b', strokeWidth: 2 },
				target: relation.target.id.toString(),
				type: 'smoothstep',
			} as Edge;
		});

		const reflowNodes = nodes.map((node) => {
			return {
				data: {
					color: getColorForGroupType(node.group.information.groupTypeId),
					group: node.group,
					groupTypeName: groupTypesById[node.group.information.groupTypeId]?.name ?? 'Unknown',
					id: node.group.id,
					members: node.members,
					metadata: getGroupMetadataString(node?.groupRoles, node?.members, personsById),
					personsById,
					roles: node.groupRoles,
					title: getGroupTitle(node.group, showGroupTypes, groupTypesById, true),
				},
				id: node.group.id.toString(),
				position: {
					x: 0,
					y: 0,
				},
				sourcePosition: Position.Right,
				targetPosition: Position.Left,
				type: 'previewGraphNode',
			};
		});

		let layoutedNodes: Node[] = [];

		// In the future, new Layout Mechanisms may be added here.
		// eslint-disable-next-line sonarjs/no-small-switch
		switch (layoutAlgorithm) {
			case 'dagre': {
				layoutedNodes = layoutDagre(reflowNodes, reflowEdges).nodes;
				break;
			}
			default: {
				layoutedNodes = reflowNodes;
			}
		}

		return {
			edges: reflowEdges,
			nodes: layoutedNodes,
		};
	}, [relations, nodes, layoutAlgorithm, showGroupTypes, groupTypesById, personsById]);
};
