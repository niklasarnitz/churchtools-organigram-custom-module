import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { GroupMember } from '../types/GroupMember';

import { Logger } from '../globals/Logger';
import { useFilteredGroupIds } from '../selectors/useFilteredGroupIds';
import { useAppStore } from '../state/useAppStore';

export const useGroupMembers = () => {
	const filteredGroupIds = useFilteredGroupIds();
	const committedFilters = useAppStore((s) => s.committedFilters);

	return useQuery({
		enabled: !!committedFilters && filteredGroupIds.length > 0,
		queryFn: async () => {
			if (filteredGroupIds.length === 0) return [];

			Logger.log(`API: Fetching group members for ${String(filteredGroupIds.length)} groups in chunks`);

			const chunkSize = 100;
			const chunks: number[][] = [];
			for (let i = 0; i < filteredGroupIds.length; i += chunkSize) {
				chunks.push(filteredGroupIds.slice(i, i + chunkSize));
			}

			const chunkResults = await Promise.all(
				chunks.map((chunk) => {
					const queryParams = chunk.map((id) => `ids[]=${String(id)}`).join('&');
					return churchtoolsClient.get<GroupMember[]>(`/groups/members?${queryParams}`);
				}),
			);

			const result: GroupMember[] = [];
			for (const chunk of chunkResults) {
				if (Array.isArray(chunk)) {
					result.push(...chunk);
				}
			}

			Logger.log(`API: Finished fetching ${String(result.length)} group members`);
			return result;
		},
		queryKey: ['groupMembers', filteredGroupIds.join(',')],
	});
};
