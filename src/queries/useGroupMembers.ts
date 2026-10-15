import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { GroupMember } from '../types/GroupMember';

import { Logger } from '../globals/Logger';
import { fetchInBatches } from '../helpers/fetchInBatches';
import { useFilteredGroupIds } from '../selectors/useFilteredGroupIds';
import { useAppStore } from '../state/useAppStore';
import { usePermissions } from './usePermissions';

export const useGroupMembers = () => {
	const filteredGroupIds = useFilteredGroupIds();
	const committedFilters = useAppStore((s) => s.committedFilters);
	const { data: permissions } = usePermissions();
	const canAdministerPersons = permissions?.churchcore['administer persons'] ?? false;
	const showLeaders = useAppStore((s) => s.showLeaders);

	return useQuery({
		enabled: !!committedFilters && filteredGroupIds.length > 0 && canAdministerPersons && showLeaders,
		queryFn: async () => {
			if (filteredGroupIds.length === 0) return [];

			Logger.log(`API: Fetching group members for ${String(filteredGroupIds.length)} groups in chunks`);

			const result = await fetchInBatches(filteredGroupIds, (ids) =>
				churchtoolsClient.get<GroupMember[]>('/groups/members', { ids }),
			);

			Logger.log(`API: Finished fetching ${String(result.length)} group members`);
			return result;
		},
		queryKey: ['groupMembers', filteredGroupIds.join(',')],
	});
};
