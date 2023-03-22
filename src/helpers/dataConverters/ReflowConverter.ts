import { MarkerType, Position } from 'reactflow';
import { NodeType, determineIfIsGroupOrPerson } from './../determineIfIsGroupOrPerson';
import { groupIdentifier, personIdentifier, roleIdentifier } from './GraphMLConverter';
import { useAppStore } from './../../state/useAppStore';
import _ from 'lodash';
import type { DataNode } from './../../models/DataNode';
import type { Node } from 'reactflow';
import type { Relation } from './../../models/Relation';

const zeroPosition = { x: 0, y: 0 };
const edgeType = 'smoothstep';

export const getReflowNodes = (nodes: DataNode[], displayDirection: 'LR' | 'TB') => {
	const reflowNodes: Node[] = [];

	const sourceTargetPositions =
		displayDirection === 'LR'
			? {
					sourcePosition: Position.Right,
					targetPosition: Position.Left,
			  }
			: {
					sourcePosition: Position.Bottom,
					targetPosition: Position.Top,
			  };

	for (const node of nodes) {
		if (
			node &&
			determineIfIsGroupOrPerson(node) === NodeType.GROUP &&
			'name' in node &&
			!_.some(reflowNodes, (n) => n.id === groupIdentifier(node))
		) {
			reflowNodes.push({
				id: groupIdentifier(node),
				...sourceTargetPositions,
				data: {
					label: node.name,
				},
				position: zeroPosition,
			});
		} else if (node && 'groupTypeRoleId' in node) {
			const person = useAppStore.getState().personsById[node.personId];
			const group = useAppStore.getState().groupsById[node.groupId];

			if (!_.some(reflowNodes, (n) => n.id === roleIdentifier(node)) && group && group.name) {
				reflowNodes.push(
					{
						id: roleIdentifier(node),
						...sourceTargetPositions,
						data: {
							label: group.name,
						},
						position: zeroPosition,
					},
					{
						id: personIdentifier(node),
						...sourceTargetPositions,
						data: {
							label: `${person.firstName} ${person.lastName}`,
						},
						position: zeroPosition,
					},
				);
			}
		}
	}

	return reflowNodes;
};

export const getReflowEdges = (relations: Relation[]) => {
	const reflowEdges = [];

	for (const relation of relations) {
		if (determineIfIsGroupOrPerson(relation.target) === NodeType.GROUP && 'id' in relation.target) {
			reflowEdges.push({
				id: `${groupIdentifier(relation.source)}-${groupIdentifier(relation.target)}`,
				source: groupIdentifier(relation.source),
				target: groupIdentifier(relation.target),
				type: edgeType,
				markerEnd: {
					type: MarkerType.Arrow,
				},
			});
		} else {
			if (
				determineIfIsGroupOrPerson(relation.source) === NodeType.GROUP &&
				determineIfIsGroupOrPerson(relation.target) === NodeType.MEMBER &&
				'groupTypeRoleId' in relation.target &&
				'groupMemberStatus' in relation.target &&
				'personId' in relation.target
			) {
				reflowEdges.push(
					{
						id: `${groupIdentifier(relation.source)}-${roleIdentifier(relation.target)}`,
						source: groupIdentifier(relation.source),
						target: roleIdentifier(relation.target),
						type: edgeType,
						markerEnd: {
							type: MarkerType.Arrow,
						},
					},
					{
						id: `${roleIdentifier(relation.target)}-${personIdentifier(relation.target)}`,
						source: roleIdentifier(relation.target),
						target: personIdentifier(relation.target),
						type: edgeType,
						markerEnd: {
							type: MarkerType.Arrow,
						},
					},
				);
			}
		}
	}

	return reflowEdges;
};
