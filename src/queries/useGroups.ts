import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { Group } from '../types/Group';

import { Logger } from '../globals/Logger';

export const useGroups = () =>
	useQuery({
		queryFn: async () => {
			Logger.log('API: Fetching groups');

			return churchtoolsClient.getAllPages<Group>('/groups');
		},
		queryKey: ['groups'],
	});
