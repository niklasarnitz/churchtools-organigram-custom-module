import { useAppStore } from '../state/useAppStore';
import type { Group } from '../models/Group';
import type { GroupMember } from './../models/GroupMember';
import type { GroupRole } from './../models/GroupRole';
import type { Person } from './../models/Person';

export const groupNameFontSize = 18;
export const groupNameFontFamily = 'Dialog';
export const groupNameFontStyle = 'bold';
// FontSize * 1,42 = Height
export const groupNameHeight = (groupTitleString: string) =>
	groupNameFontSize * 1.5 * groupTitleString.split('\n').length;

export const groupMetadataFontSize = 12;
export const reflowLineHeight = 24;
export const groupMetadataFontFamily = 'Dialog';
export const groupMetadataFontStyle = 'plain';
// FontSize * 1,42 = Height
export const getGroupNodeHeight = (groupMemberString: string, groupTitleString: string) =>
	getGroupMetadataHeight(groupMemberString) + groupNameHeight(groupTitleString);

export const getGroupMetadataHeight = (groupMemberString: string) =>
	groupMetadataFontSize * 1.5 * groupMemberString.split('\n').length;

export const getReflowGroupNodeHeight = (groupMemberString: string, groupTitleString: string) =>
	reflowLineHeight * (groupMemberString.split('\n').length + groupTitleString.split('\n').length);

export const getGroupNodeIdentifier = (group: Group) => `group-${group.id}`;

export const getGroupMetadataString = (
	groupRoles: GroupRole[],
	groupMembers: GroupMember[],
	personsById: Record<number, Person>,
) => {
	return groupRoles
		.map((role) => {
			const personsWithRole = groupMembers.filter((member) => member.groupTypeRoleId === role.id);
			const personsWithRoleNames = personsWithRole.map((member) => {
				const person = personsById[member.personId];
				if (person) return `${person.firstName} ${person.lastName}`;
				return 'Name not found.';
			});

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

export const getGroupNodeWidth = (groupTitleString: string, groupMemberString: string) => {
	const longestLineGroupMemberString = Math.max(...groupMemberString.split('\n').map((line) => line.length));
	const longestLineGroupNameString = Math.max(...groupTitleString.split('\n').map((line) => line.length));

	return longestLineGroupNameString > longestLineGroupMemberString
		? (longestLineGroupNameString * groupNameFontSize) / 1.2
		: (longestLineGroupMemberString * groupMetadataFontSize) / 1.2;
};
