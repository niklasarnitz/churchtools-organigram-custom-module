import { useAppStore } from '../state/useAppStore';
import type { Group } from '../models/Group';
import type { GroupMember } from './../models/GroupMember';
import type { GroupRole } from './../models/GroupRole';
import type { Person } from './../models/Person';

export const getGroupNodeIdentifier = (group: Group) => `group-${group.id}`;

export const getGroupMetadataString = (
	groupRoles: GroupRole[],
	groupMembers: GroupMember[],
	personsById: Record<number, Person>,
) => {
	return groupRoles
		.map((role) => {
			const personsWithRole = groupMembers.filter((member) => member.groupTypeRoleId === role.id);
			const personsWithRoleNames = personsWithRole.map(
				(member) => `${personsById[member.personId].firstName} ${personsById[member.personId].lastName}`,
			);

			return `${groupRoles.find((r) => r.id === role.id)?.name}:\n${personsWithRoleNames.join(',\n')}`;
		})
		.join('\n');
};

export const getGroupTitle = (group: Group) => {
	const { showGroupTypes, groupTypesById } = useAppStore.getState();

	if (showGroupTypes && group.information.groupTypeId) {
		return `${group.name}\n(${groupTypesById[group.information.groupTypeId].name})`;
	}

	return group.name;
};
