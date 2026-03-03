import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Person } from '../types/Person';

import { Logger } from '../globals/Logger';
import { useGroupMembers } from './useGroupMembers';

/**
 * Fetches only persons who are members of at least one group.
 * This is done in chunks of 100 IDs to avoid URL length issues.
 */
export const usePersons = () => {
	const { data: members, isFetched: isMembersFetched } = useGroupMembers();

	const personIds = useMemo(() => {
		if (!members) return [];
		return Array.from(new Set(members.map((m) => m.personId)));
	}, [members]);

	return useQuery({
		queryFn: async () => {
			if (personIds.length === 0) return [];
			Logger.log(`API: Fetching ${String(personIds.length)} persons in chunks`);

			const resultsPerCall = 100;
			let result: Person[] = [];
			const remainingIds = [...personIds];

			// Fetch persons in chunks of 100
			for (let i = 0; i < remainingIds.length; i += resultsPerCall) {
				const chunk = remainingIds.slice(i, i + resultsPerCall);
				const queryParams = chunk.map((id) => `ids[]=${String(id)}`).join('&');

				const chunkResults = await churchtoolsClient.get<Person[]>(
					`/persons?${queryParams}&limit=${String(resultsPerCall)}`,
				);

				if (Array.isArray(chunkResults)) {
					result = [...result, ...chunkResults];
				}
			}

			Logger.log(`API: Finished fetching ${String(result.length)} persons`);
			return result;
		},
		queryKey: ['persons', personIds],
		enabled: isMembersFetched && personIds.length > 0,
	});
};
