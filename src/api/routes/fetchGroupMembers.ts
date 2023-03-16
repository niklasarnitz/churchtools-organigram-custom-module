import { Logger } from '../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { GroupMember } from './../../models/GroupMember';

export const fetchGroupMembers = async (groupId: number) => {
	try {
		Logger.log(`API: Fetching group members of group ${groupId}`);

		return (await churchtoolsClient.getAllPages(`/groups/${groupId}/members`)) as GroupMember[];
	} catch (error) {
		console.error(error);
	}
};
