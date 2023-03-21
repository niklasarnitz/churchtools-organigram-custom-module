import { Logger } from '../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { GroupMember } from './../../models/GroupMember';

export const fetchGroupMembers = async () => {
	try {
		Logger.log('API: Fetching group members');

		return (await churchtoolsClient.get(`/groups/members`)) as GroupMember[];
	} catch (error) {
		console.error(error);
	}
};
