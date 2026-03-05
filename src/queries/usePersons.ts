import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Person } from '../types/Person';

import { Logger } from '../globals/Logger';
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
	const excludedRoles = committedFilters?.excludedRoles ?? [];

	const personIds = useMemo(() => {
		if (!members) return [];
		const filteredMembers = excludedRoles.length > 0
			? members.filter((m) => !excludedRoles.includes(m.groupTypeRoleId))
			: members;
		return Array.from(new Set(filteredMembers.map((m) => m.personId)));
	}, [members, excludedRoles]);

	const personIdHash = useMemo(() => {
		if (personIds.length === 0) return '';
		const sorted = [...personIds].sort((a, b) => a - b);
		let hash = 5381;
		for (const id of sorted) {
			hash = ((hash << 5) + hash + id) | 0;
		}
		return `${sorted.length}:${hash}`;
	}, [personIds]);

	return useQuery({
		queryFn: async () => {
			if (personIds.length === 0) return [];
			Logger.log(`API: Fetching ${String(personIds.length)} persons in chunks`);

			const resultsPerCall = 100;
			const chunks: number[][] = [];
			for (let i = 0; i < personIds.length; i += resultsPerCall) {
				chunks.push(personIds.slice(i, i + resultsPerCall));
			}

			const chunkResults = await Promise.all(
				chunks.map((chunk) => {
					const queryParams = chunk.map((id) => `ids[]=${String(id)}`).join('&');
					return churchtoolsClient.get<Person[]>(
						`/persons?${queryParams}&limit=${String(resultsPerCall)}`,
					);
				}),
			);

			const result: Person[] = [];
			for (const chunk of chunkResults) {
				if (Array.isArray(chunk)) {
					result.push(...chunk);
				}
			}

			Logger.log(`API: Finished fetching ${String(result.length)} persons`);
			return result;
		},
		queryKey: ['persons', personIdHash],
		enabled: isMembersFetched && personIds.length > 0,
	});
};
