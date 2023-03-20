import { useAppStore } from './../state/useAppStore';
import type { Relation } from './../models/Relation';

// TODO: Fix this complexity!
// eslint-disable-next-line sonarjs/cognitive-complexity
export const createRelatedData = () => {
	const { hierarchies, groupsById, groups, groupMembers, personsById } = useAppStore.getState();

	const relations: Relation[] = [];

	for (const hierarchy of hierarchies) {
		const group = groupsById[hierarchy.groupId];

		if (group) {
			for (const parent of hierarchy.parents) {
				const parentGroup = groupsById[parent];

				if (parentGroup) {
					relations.push({
						source: parentGroup,
						target: group,
					});
				}
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
				const person = personsById[groupMember.personId];

				if (person) {
					relations.push({
						source: group,
						target: person,
					});
				}
			}
		}
	}

	return relations;
};
