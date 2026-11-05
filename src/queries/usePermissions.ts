import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { Permissions } from '../types/Permissions';

import { Logger } from '../globals/Logger';
import { organigramQueryOptions } from './organigramQueryOptions';

export const fetchPermissions = async () => {
	Logger.log('API: Fetching permissions');

	return churchtoolsClient.get<Permissions>('/permissions/global');
};

export const usePermissions = () =>
	useQuery({
		...organigramQueryOptions,
		queryFn: fetchPermissions,
		queryKey: ['permissions'],
	});
