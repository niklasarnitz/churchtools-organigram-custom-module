import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { GroupType } from '../types/GroupType';

import { Logger } from '../globals/Logger';
import { translateNames } from '../helpers/churchToolsTranslations';

export const useGroupTypes = () =>
	useQuery({
		queryFn: async () => {
			Logger.log('API: Fetching group types');

			return churchtoolsClient.get<GroupType[]>('/group/grouptypes');
		},
		queryKey: ['groupTypes'],
		refetchOnMount: 'always',
		select: translateNames<GroupType>,
	});
