import _ from 'lodash';
import type { Group } from '../models/Group';
import type { GroupMember } from './../models/GroupMember';
import type { Hierarchy } from './../models/Hierarchy';
import type { Relation } from './../models/Relation';

// TODO: Fix this complexity!
// eslint-disable-next-line sonarjs/cognitive-complexity
export const createData = (
	hierarchies: Hierarchy[],
	groupsById: Record<number, Group>,
	groups: Group[],
	groupMembers: GroupMember[],
	groupRoleIdsToExclude: number[],
	// eslint-disable-next-line sonarjs/cognitive-complexity
) => {
	const relations: Relation[] = [];
	const nodes: (Group | GroupMember)[] = [];

	for (const hierarchy of hierarchies) {
		const group = groupsById[hierarchy.groupId];

		if (group) {
			if (!_.includes(nodes, group)) {
				nodes.push(group);
			}

			for (const child of hierarchy.children) {
				const childGroup = groupsById[child];

				if (childGroup) {
					relations.push({
						source: group,
						target: childGroup,
					});
				}
			}
		}
	}

	for (const groupMember of groupMembers) {
		if (groupMember && !groupRoleIdsToExclude.includes(groupMember.groupTypeRoleId)) {
			const group = groupsById[groupMember.groupId];

			if (group) {
				relations.push({
					source: group,
					target: groupMember,
				});

				if (!_.includes(nodes, groupMember)) {
					nodes.push(groupMember);
				}

				if (!_.includes(nodes, group)) {
					nodes.push(group);
				}
			}
		}
	}

	return {
		relations,
		nodes,
	};
};
