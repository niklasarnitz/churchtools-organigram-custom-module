import { useAppStore } from './../state/useAppStore';
import type { Group } from '../models/Group';
import type { GroupMember } from '../models/GroupMember';
import type { Hierarchy } from '../models/Hierarchy';
import type { Person } from './../models/Person';
import type { Relation } from './../models/Relation';

export const createRelatedData = (
	personsById: Record<number, Person>,
	groups: Group[],
	groupsById: Record<number, Group>,
	groupMembers: Record<number, GroupMember[]>,
	hierarchies: Hierarchy[],
	// eslint-disable-next-line sonarjs/cognitive-complexity
) => {
	const returnValue: Relation[] = [];

	for (const hierarchy of hierarchies) {
		const group = groupsById[hierarchy.groupId];

		if (group) {
			for (const parent of hierarchy.parents) {
				const parentGroup = groupsById[parent];

				if (parentGroup) {
					returnValue.push({
						source: parentGroup,
						target: group,
					});
				}
			}

			for (const child of hierarchy.children) {
				const childGroup = groupsById[child];

				if (childGroup) {
					returnValue.push({
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
				const person = personsById[groupMember.personId];

				if (person) {
					returnValue.push({
						source: group,
						target: person,
					});
				}
			}
		}
	}

	return returnValue;
};
