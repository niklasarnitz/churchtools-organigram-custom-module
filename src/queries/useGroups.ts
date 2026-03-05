import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { Group } from '../types/Group';

import { Logger } from '../globals/Logger';
import { useAppStore } from '../state/useAppStore';

export const useGroups = () => {
	const committedFilters = useAppStore((s) => s.committedFilters);

	return useQuery({
		queryFn: async () => {
			Logger.log('API: Fetching groups');

			const params: string[] = [];

			if (committedFilters) {
				const { filteredAgeGroupIds, filteredCampusIds, filteredGroupCategoryIds, includedGroupStatuses } =
					committedFilters;

				for (const id of filteredCampusIds) {
					params.push(`campus_ids[]=${String(id)}`);
				}
				for (const id of filteredAgeGroupIds) {
					params.push(`agegroup_ids[]=${String(id)}`);
				}
				for (const id of filteredGroupCategoryIds) {
					params.push(`group_category_ids[]=${String(id)}`);
				}
				for (const id of includedGroupStatuses) {
					params.push(`group_status_ids[]=${String(id)}`);
				}
			}

			const queryString = params.length > 0 ? `?${params.join('&')}` : '';
			return churchtoolsClient.getAllPages<Group>(`/groups${queryString}`);
		},
		queryKey: [
			'groups',
			committedFilters?.filteredCampusIds,
			committedFilters?.filteredAgeGroupIds,
			committedFilters?.filteredGroupCategoryIds,
			committedFilters?.includedGroupStatuses,
		],
	});
};
