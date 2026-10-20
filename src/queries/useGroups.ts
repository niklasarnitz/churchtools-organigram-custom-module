import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Group } from '../types/Group';

import { Logger } from '../globals/Logger';
import { t } from '../helpers/churchToolsTranslations';
import { extractConfiguredPrimaryParentGroupId } from '../helpers/sunburstLayout';
import { useAppStore } from '../state/useAppStore';
import { fetchGroups, type GroupFilter } from './groupCache';
import { organigramQueryOptions } from './organigramQueryOptions';

const translateGroupNames = (groups: Group[]) =>
	groups.map((group) => ({
		...group,
		name: t(group.name),
		sunburstPrimaryParentGroupId: extractConfiguredPrimaryParentGroupId(group),
	}));

export const useGroups = () => {
	const client = useQueryClient();
	const committedFilters = useAppStore((s) => s.committedFilters);
	const filter: GroupFilter = {};
	if (committedFilters) {
		const { filteredAgeGroupIds, filteredCampusIds, filteredGroupCategoryIds, includedGroupStatuses } =
			committedFilters;
		if (filteredCampusIds.length) filter.campus_ids = filteredCampusIds;
		if (filteredAgeGroupIds.length) filter.agegroup_ids = filteredAgeGroupIds;
		if (filteredGroupCategoryIds.length) filter.group_category_ids = filteredGroupCategoryIds;
		if (includedGroupStatuses.length) filter.group_status_ids = includedGroupStatuses;
	}

	return useQuery({
		...organigramQueryOptions,
		queryFn: async () => {
			Logger.log('API: Fetching groups');
			return fetchGroups(client, filter);
		},
		// Host group mutations invalidate ['groups', 'filter']; keep our list under that prefix.
		queryKey: ['groups', 'filter', 'organigram', filter],
		select: translateGroupNames,
	});
};
