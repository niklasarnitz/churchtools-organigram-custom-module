import { Logger } from '../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { GroupRole } from '../../models/GroupRole';

export const fetchGroupRoles = async () => {
	try {
		Logger.log('API: Fetching group roles');

		return (await churchtoolsClient.get('/group/roles')) as GroupRole[];
	} catch (error) {
		Logger.error(error);
	}
};
