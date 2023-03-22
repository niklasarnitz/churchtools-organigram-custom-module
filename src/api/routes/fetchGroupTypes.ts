import { Logger } from '../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { GroupType } from './../../models/GroupType';

export const fetchGroupTypes = async () => {
	try {
		Logger.log('API: Fetching group types');

		return (await churchtoolsClient.get('/group/grouptypes')) as GroupType[];
	} catch (error) {
		Logger.error(error);
	}
};
