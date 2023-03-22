import { Logger } from '../../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { Permissions } from '../../models/Permissions';

export const fetchPermissions = async () => {
	try {
		Logger.log('API: Fetching permissions');

		return (await churchtoolsClient.get('/permissions/global')) as Permissions;
	} catch (error) {
		Logger.error(error);
	}
};
