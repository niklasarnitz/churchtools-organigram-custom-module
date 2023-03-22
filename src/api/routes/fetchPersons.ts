import { Logger } from './../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Person } from './../../models/Person';

export const fetchPersons = async () => {
	try {
		Logger.log('API: Fetching persons');
		return (await churchtoolsClient.getAllPages('/persons')) as Person[];
	} catch (error) {
		Logger.error(error);
	}
};
