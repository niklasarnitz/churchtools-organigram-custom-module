import { churchtoolsClient } from '@churchtools/churchtools-client';
import { type QueryClient } from '@tanstack/react-query';

import type { Group } from '../types/Group';

import { fetchInBatches } from '../helpers/fetchInBatches';

export type GroupFilter = Partial<
	Record<'agegroup_ids' | 'campus_ids' | 'group_category_ids' | 'group_status_ids', number[]>
>;

export async function fetchGroups(client: QueryClient, filter: GroupFilter, freshSince = 0): Promise<Group[]> {
	// This is the group module's ID-list key. Never infer completeness from cached entities:
	// they may come from just one page, a different filter, or contain now-invisible groups.
	const ids = await client.fetchQuery({
		queryFn: () => churchtoolsClient.get<number[]>('/groups/ids', filter),
		queryKey: ['groups', 'filter', 'ids', filter],
		...(freshSince ? { staleTime: 0 } : {}),
	});
	const rawKey = (id: number) => ['groups', 'single', id, 'raw'] as const;
	const staleTime = client.getDefaultOptions().queries?.staleTime;
	const maxAge = typeof staleTime === 'number' ? staleTime : 5 * 60 * 1000;
	const missing = ids.filter((id) => {
		const state = client.getQueryState<Group>(rawKey(id));
		return (
			!state?.data ||
			state.isInvalidated ||
			state.dataUpdatedAt < freshSince ||
			Date.now() - state.dataUpdatedAt >= maxAge
		);
	});

	client.setQueryDefaults(['groups', 'single'], { gcTime: Infinity });
	await fetchInBatches(missing, async (batch) => {
		const groups = await churchtoolsClient.get<Group[]>('/groups', {
			...filter,
			ids: batch,
			// The organigram uses /group/roles, not per-group includes. Keep existing
			// host include entries intact and publish only unmodified raw entities.
			include: '[]',
			limit: 200,
		});
		const returnedIds = new Set(groups.map((group) => group.id));
		for (const id of batch) {
			// A group may have disappeared or become invisible since the ID request.
			if (!returnedIds.has(id)) client.removeQueries({ exact: true, queryKey: rawKey(id) });
		}
		const published = groups.map((group) => {
			client.setQueryData(rawKey(group.id), group);
			return { id: group.id, updatedAt: client.getQueryState(rawKey(group.id))?.dataUpdatedAt };
		});
		// The native group batcher checks invalidation, not timestamps. Expire our
		// entries the same way, without invalidating a newer host write or includes.
		if (published.length && Number.isFinite(maxAge)) {
			setTimeout(() => {
				for (const { id, updatedAt } of published) {
					if (client.getQueryState(rawKey(id))?.dataUpdatedAt === updatedAt) {
						void client.invalidateQueries({ exact: true, queryKey: rawKey(id), refetchType: 'none' });
					}
				}
			}, maxAge);
		}
		return groups;
	});

	return ids.flatMap((id) => {
		const group = client.getQueryData<Group>(rawKey(id));
		return group ? [group] : [];
	});
}

/** vComps exposes the host's actual Vue Query client (the same TanStack Query core API). */
export function getChurchToolsQueryClient(): QueryClient | undefined {
	return (globalThis as typeof globalThis & { vComps?: { queryClient?: QueryClient } }).vComps?.queryClient;
}
