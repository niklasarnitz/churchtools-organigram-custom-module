import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { Hierarchy } from '../types/Hierarchy';

import { Logger } from '../globals/Logger';

export const useHierarchies = () =>
	useQuery({
		queryFn: async () => {
			Logger.log('API: Fetching group hierarchies');

			return churchtoolsClient.get<Hierarchy[]>('/groups/hierarchies');
		},
		queryKey: ['hierarchies'],
	});
