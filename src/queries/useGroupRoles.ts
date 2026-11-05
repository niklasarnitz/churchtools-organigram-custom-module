import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { GroupRole } from '../types/GroupRole';

import { Logger } from '../globals/Logger';
import { translateNames } from '../helpers/churchToolsTranslations';
import { organigramQueryOptions } from './organigramQueryOptions';

export const useGroupRoles = () =>
	useQuery({
		...organigramQueryOptions,
		queryFn: async () => {
			Logger.log('API: Fetching group roles');

			return churchtoolsClient.get<GroupRole[]>('/group/roles');
		},
		queryKey: ['groupRoles'],
		select: translateNames<GroupRole>,
	});
