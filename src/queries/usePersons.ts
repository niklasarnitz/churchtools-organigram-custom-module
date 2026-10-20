import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Person } from '../types/Person';

import { Logger } from '../globals/Logger';
import { fetchInBatches } from '../helpers/fetchInBatches';
import { useAppStore } from '../state/useAppStore';
import { useGroupMembers } from './useGroupMembers';

/**
 * Fetches only persons who are members of at least one group
 * and whose group role is not excluded.
 * This is done in chunks of 100 IDs to avoid URL length issues.
 */
export const usePersons = () => {
	const { data: members, isFetched: isMembersFetched } = useGroupMembers();
	const committedFilters = useAppStore((s) => s.committedFilters);
	const roleFiltersInitialized = useAppStore((s) => s.roleFiltersInitialized);
	const personIds = useMemo(() => {
		if (!members) return [];
		const excludedRoles = committedFilters?.excludedRoles ?? [];

		let filteredMembers = members;
		if (excludedRoles.length > 0) {
			const excludedRolesSet = new Set(excludedRoles);
			filteredMembers = members.filter((m) => !excludedRolesSet.has(m.groupTypeRoleId));
		}
		return Array.from(new Set(filteredMembers.map((m) => m.personId)));
	}, [members, committedFilters?.excludedRoles]);

	const personIdsKey = useMemo(() => {
		if (personIds.length === 0) return '';
		return [...personIds].sort((a, b) => a - b).join(',');
	}, [personIds]);

	return useQuery({
		enabled: roleFiltersInitialized && !!committedFilters?.showLeaders && isMembersFetched && personIds.length > 0,
		queryFn: async () => {
			if (personIds.length === 0) return [];
			Logger.log(`API: Fetching ${String(personIds.length)} persons in chunks`);

			const result = await fetchInBatches(personIds, (ids) =>
				churchtoolsClient.get<Person[]>('/persons', { ids, limit: 100 }),
			);

			Logger.log(`API: Finished fetching ${String(result.length)} persons`);
			return result;
		},
		queryKey: ['persons', personIdsKey],
		refetchOnMount: 'always',
	});
};
