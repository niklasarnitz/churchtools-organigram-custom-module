import { useAppStore } from '../state/useAppStore';
import _ from 'lodash';
import type { Group } from '../models/Group';
import type { GroupMember } from './../models/GroupMember';
import type { Relation } from './../models/Relation';

// eslint-disable-next-line sonarjs/cognitive-complexity
export const createData = () => {
	const { hierarchies, groupsById, groupMembers, excludedRoles, excludedGroupTypes } = useAppStore.getState();

	const relations: Relation[] = [];
	const nodes: (Group | GroupMember)[] = [];

	for (const hierarchy of hierarchies) {
		const group = groupsById[hierarchy.groupId];

		if (group && !excludedGroupTypes.includes(group.information.groupTypeId)) {
			if (!_.includes(nodes, group)) {
				nodes.push(group);
			}

			for (const child of hierarchy.children) {
				const childGroup = groupsById[child];

				if (childGroup && !excludedGroupTypes.includes(childGroup.information.groupTypeId)) {
					relations.push({
						source: group,
						target: childGroup,
					});
				}
			}
		}
	}

	for (const groupMember of groupMembers) {
		if (
			groupMember &&
			groupsById[groupMember.groupId] &&
			!excludedGroupTypes.includes(groupsById[groupMember.groupId].information.groupTypeId) &&
			!excludedRoles.includes(groupMember.groupTypeRoleId)
		) {
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
