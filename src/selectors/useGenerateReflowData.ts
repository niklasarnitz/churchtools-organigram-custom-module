import { useMemo } from 'react';
import { MarkerType, Position } from 'reactflow';
import { useCreateRelatedData } from './useCreateRelatedData';
import { getColorForGroupType } from '../globals/Colors';
import { getGroupMetadataString, getGroupTitle } from '../helpers/GraphHelper';
import { layoutDagre } from '../helpers/layoutAlgorithms/dagre';
import { useAppStore } from '../state/useAppStore';
import { usePersonsById } from './usePersonsById';
import { useGroupTypesById } from './useGroupTypesById';
import type { Edge } from 'reactflow';
import type { Node } from 'reactflow';

export const useGenerateReflowData = () => {
	const { relations, nodes } = useCreateRelatedData();
	const { layoutAlgorithm, showGroupTypes } = useAppStore();
    const personsById = usePersonsById();
    const groupTypesById = useGroupTypesById();

	return useMemo(() => {
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
						title: getGroupTitle(node.group, showGroupTypes, groupTypesById, true),
						groupTypeName: groupTypesById[node.group.information.groupTypeId]?.name ?? 'Unknown',
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
		// eslint-disable-next-line sonarjs/no-small-switch
		switch (layoutAlgorithm) {
			case 'dagre': {
				layoutedNodes.push(...layoutDagre(reflowNodes, reflowEdges, personsById, showGroupTypes, groupTypesById).nodes);
				break;
			}
		}

		return {
			nodes: layoutedNodes,
			edges: reflowEdges,
		};
	}, [relations, nodes, layoutAlgorithm, showGroupTypes, groupTypesById, personsById]);
};
