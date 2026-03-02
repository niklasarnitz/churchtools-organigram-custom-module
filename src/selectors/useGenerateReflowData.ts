import { MarkerType, Position } from 'reactflow';
import { getColorForGroupType } from '../globals/Colors';
import { getGroupMetadataString, getGroupTitle } from '../helpers/GraphHelper';
import { layoutDagre } from '../helpers/layoutAlgorithms/dagre';
import { useAppStore } from '../state/useAppStore';
import { useCreateRelatedData } from './useCreateRelatedData';
import { useGroupTypesById } from './useGroupTypesById';
import { useMemo } from 'react';
import { usePersonsById } from './usePersonsById';
import type { Edge } from 'reactflow';
import type { Node } from 'reactflow';

export const useGenerateReflowData = () => {
	const { relations, nodes } = useCreateRelatedData();
	const layoutAlgorithm = useAppStore((s) => s.layoutAlgorithm);
	const showGroupTypes = useAppStore((s) => s.showGroupTypes);
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
				animated: true,
				markerEnd: {
					type: MarkerType.Arrow,
					width: 20,
					height: 20,
					color: '#64748b',
				},
				style: { stroke: '#64748b', strokeWidth: 2 },
			} as Edge;
		});

		const reflowNodes = nodes.map((node) => {
			return {
				id: node.group.id.toString(),
				targetPosition: Position.Left,
				sourcePosition: Position.Right,
				data: {
					id: node.group.id,
					title: getGroupTitle(node.group, showGroupTypes, groupTypesById, true),
					groupTypeName: groupTypesById[node.group.information.groupTypeId]?.name ?? 'Unknown',
					metadata: getGroupMetadataString(node?.groupRoles, node?.members, personsById),
					color: getColorForGroupType(node.group.information.groupTypeId),
					group: node.group,
					roles: node.groupRoles,
					members: node.members,
					personsById,
				},
				type: 'previewGraphNode',
				position: {
					x: 0,
					y: 0,
				},
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
			nodes: layoutedNodes,
			edges: reflowEdges,
		};
	}, [relations, nodes, layoutAlgorithm, showGroupTypes, groupTypesById, personsById]);
};
