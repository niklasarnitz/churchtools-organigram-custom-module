import { Logger } from '../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Hierarchy } from '../../models/Hierarchy';

export const fetchHierarchies = async (groupIds: number[] = []) => {
	try {
		Logger.log('API: Fetching hierarchies ' + groupIds.join(', '));

		return (await churchtoolsClient.get(`/groups/hierarchies`, {
			groupIds,
		})) as Hierarchy[];
	} catch (error) {
		Logger.error(error);
	}
};
