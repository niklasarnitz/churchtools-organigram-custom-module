import { useAppStore } from './../state/useAppStore';
import _ from 'lodash';
import type { Group } from '../models/Group';
import type { GroupMember } from '../models/GroupMember';
import type { Relation } from './../models/Relation';

// TODO: Fix this complexity!
// eslint-disable-next-line sonarjs/cognitive-complexity
export const createData = (groupRoleIdsToExclude: number[]) => {
	const { hierarchies, groupsById, groups, groupMembers } = useAppStore.getState();

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

	for (const group of groups) {
		const groupMembersForGroup = groupMembers[group.id];

		if (groupMembersForGroup) {
			for (const groupMember of groupMembersForGroup) {
				if (!groupRoleIdsToExclude.includes(groupMember.groupTypeRoleId)) {
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
	}

	return {
		relations,
		nodes,
	};
};
