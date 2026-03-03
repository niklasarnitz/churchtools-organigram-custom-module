import type { URecord } from '@ainias42/js-helper';

import type { Group } from '../types/Group';
import type { GroupMember } from '../types/GroupMember';
import type { GroupRole } from '../types/GroupRole';
import type { GroupType } from '../types/GroupType';
import type { Person } from '../types/Person';

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

export const getReflowGroupNodeHeight = (
	groupMemberString: string,
	groupTitleString: string,
	hasMembers = true,
	showGroupTypes = false,
) => {
	const baseHeight = hasMembers
		? reflowLineHeight * (groupMemberString.split('\n').length + groupTitleString.split('\n').length + 2)
		: 60 + groupTitleString.split('\n').length * 20;

	// Add space for group type if shown
	return showGroupTypes ? baseHeight + 20 : baseHeight;
};

export const getGroupNodeIdentifier = (group: Group) => `group-${String(group.id)}`;

export const getGroupMetadataString = (
	groupRoles: GroupRole[],
	groupMembers: GroupMember[],
	personsById: URecord<number, Person>,
) => {
	return groupRoles
		.map((role) => {
			const personsWithRole = groupMembers.filter((member) => member.groupTypeRoleId === role.id);
			const personsWithRoleNames = personsWithRole.map((member) => {
				const person = personsById[member.personId];
				return person ? `${person.firstName} ${person.lastName}` : 'Unknown Person';
			});

			return `${String(groupRoles.find((r) => r.id === role.id)?.name)}:\n${personsWithRoleNames.join(',\n')}`;
		})
		.join('\n');
};

export const getGroupTitle = (
	group: Group,
	showGroupTypes: boolean,
	groupTypesById: URecord<number, GroupType>,
	reflow = false,
) => {
	if (showGroupTypes && group.information.groupTypeId) {
		if (reflow) {
			return group.name;
		}
		const groupType = groupTypesById[group.information.groupTypeId];
		return groupType ? `${group.name}\n(${groupType.name})` : group.name;
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
