import { NodeType, determineIfIsGroupOrPerson } from './../determineIfIsGroupOrPerson';
import { Position } from 'reactflow';
import { groupIdentifier, personIdentifier, roleIdentifier } from './GraphMLConverter';
import type { EnhancedGroupMember } from './../../models/EnhancedGroupMember';
import type { Group } from './../../models/Group';
import type { Relation } from './../../models/Relation';

const zeroPosition = { x: 0, y: 0 };
const edgeType = 'smoothstep';

export const getReflowNodes = (nodes: (Group | EnhancedGroupMember)[]) => {
	const reflowNodes = [];

	for (const node of nodes) {
		if (determineIfIsGroupOrPerson(node) === NodeType.GROUP && 'name' in node) {
			reflowNodes.push({
				id: groupIdentifier(node),
				sourcePosition: Position.Top,
				targetPosition: Position.Bottom,
				data: {
					label: node.name,
				},
				position: zeroPosition,
			});
		} else if ('groupTypeRoleId' in node) {
			reflowNodes.push(
				{
					id: roleIdentifier(node),
					sourcePosition: Position.Top,
					targetPosition: Position.Bottom,
					data: {
						label: node.group.name,
					},
					position: zeroPosition,
				},
				{
					id: personIdentifier(node),
					sourcePosition: Position.Top,
					targetPosition: Position.Bottom,
					data: {
						label: `${node.person.firstName} ${node.person.lastName}`,
					},
					position: zeroPosition,
				},
			);
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
					},
					{
						id: `${roleIdentifier(relation.target)}-${personIdentifier(relation.target)}`,
						source: roleIdentifier(relation.target),
						target: personIdentifier(relation.target),
						type: edgeType,
					},
				);
			}
		}
	}

	return reflowEdges;
};
