import { Logger } from '../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Hierarchy } from '../../models/Hierarchy';

export const fetchHierarchies = async () => {
	try {
		Logger.log('API: Fetching hierarchies');

		return (await churchtoolsClient.get('/groups/hierarchies')) as Hierarchy[];
	} catch (error) {
		console.error(error);
	}
};
