import { Logger } from '../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Group } from './../../models/Group';

export const fetchGroups = async () => {
	try {
		Logger.log('API: Fetching groups');

		return (await churchtoolsClient.getAllPages('/groups')) as Group[];
	} catch (error) {
		console.error(error);
	}
};
