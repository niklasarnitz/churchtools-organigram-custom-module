import { useAppStore } from './../state/useAppStore';
import _ from 'lodash';
import type { Group } from '../models/Group';
import type { Person } from './../models/Person';
import type { Relation } from './../models/Relation';

// TODO: Fix this complexity!
// eslint-disable-next-line sonarjs/cognitive-complexity
export const createData = (groupRoleIdsToExclude: number[]) => {
	const { hierarchies, groupsById, groups, groupMembers, personsById } = useAppStore.getState();

	const relations: Relation[] = [];
	const nodes: (Group | Person)[] = [];

	for (const hierarchy of hierarchies) {
		const group = groupsById[hierarchy.groupId];

		if (group) {

			for (const child of hierarchy.children) {
				const childGroup = groupsById[child];

				if (childGroup) {
					relations.push({
						source: group,
						target: childGroup,
					});

					if (!_.includes(nodes, group)) {
						nodes.push(group);
					}

					if (!_.includes(nodes, childGroup)) {
						nodes.push(childGroup);
					}
				}
			}
		}
	}

	for (const group of groups) {
		const groupMembersForGroup = groupMembers[group.id];

		if (groupMembersForGroup) {
			for (const groupMember of groupMembersForGroup) {
				const person = personsById[groupMember.personId];

				if (!groupRoleIdsToExclude.includes(groupMember.groupTypeRoleId) && person) {
					relations.push({
						source: group,
						target: person,
					});

					if (!_.includes(nodes, group)) {
						nodes.push(group);
					}

					if (!_.includes(nodes, person)) {
						nodes.push(person);
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
