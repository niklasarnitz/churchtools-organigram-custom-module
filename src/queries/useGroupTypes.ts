import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { GroupType } from '../types/GroupType';

import { Logger } from '../globals/Logger';
import { translateNames } from '../helpers/churchToolsTranslations';
import { organigramQueryOptions } from './organigramQueryOptions';

export const useGroupTypes = () =>
	useQuery({
		...organigramQueryOptions,
		queryFn: async () => {
			Logger.log('API: Fetching group types');

			return churchtoolsClient.get<GroupType[]>('/group/grouptypes');
		},
		queryKey: ['groupTypes'],
		select: translateNames<GroupType>,
	});
