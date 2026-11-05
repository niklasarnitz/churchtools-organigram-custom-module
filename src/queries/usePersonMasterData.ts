import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { PersonMasterData } from '../types/PersonMasterData';

import { Logger } from '../globals/Logger';
import { translateNames } from '../helpers/churchToolsTranslations';
import { organigramQueryOptions } from './organigramQueryOptions';

const translateMasterData = (data: PersonMasterData): PersonMasterData => ({
	...data,
	ageGroups: translateNames(data.ageGroups),
	campuses: translateNames(data.campuses),
	groupCategories: translateNames(data.groupCategories),
});

export const usePersonMasterData = () =>
	useQuery({
		...organigramQueryOptions,
		queryFn: async () => {
			Logger.log('API: Fetching person masterdata');

			return churchtoolsClient.get<PersonMasterData>('/person/masterdata');
		},
		queryKey: ['personMasterData'],
		select: translateMasterData,
	});
