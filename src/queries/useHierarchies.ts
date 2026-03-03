import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { Hierarchy } from '../types/Hierarchy';

import { Logger } from '../globals/Logger';

export const useGroupHierarchies = (groupIds: number[]) =>
	useQuery({
		queryFn: async () => {
			Logger.log('API: Fetching group hierarchies for groups', groupIds);

			return churchtoolsClient.get<Hierarchy[]>('/groups/hierarchies', { groupIds });
		},
		queryKey: ['groupHierarchies', groupIds],
	});

export const useHierarchies = () =>
	useQuery({
		queryFn: async () => {
			Logger.log('API: Fetching group hierarchies');

			return churchtoolsClient.get<Hierarchy[]>('/groups/hierarchies');
		},
		queryKey: ['hierarchies'],
	});
