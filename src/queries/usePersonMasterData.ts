import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { PersonMasterData } from '../types/PersonMasterData';

import { Logger } from '../globals/Logger';

export const usePersonMasterData = () =>
	useQuery({
		queryFn: async () => {
			Logger.log('API: Fetching person masterdata');

			return churchtoolsClient.get<PersonMasterData>('/person/masterdata');
		},
		queryKey: ['personMasterData'],
	});
