import { churchtoolsClient } from '@churchtools/churchtools-client';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { expect, spyOn, test } from 'bun:test';

import { fetchGroups } from './groupCache';
import { organigramQueryOptions } from './organigramQueryOptions';
import { prepareQueryClientForSession } from './prepareQueryClientForSession';

test('startup refreshes even fresh cached group IDs and entities, then reuses them within the session', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
	const filter = { group_status_ids: [1] };
	const idsKey = ['groups', 'filter', 'ids', filter];
	const rawKey = ['groups', 'single', 1, 'raw'];
	client.setQueryData(idsKey, [1, 2]);
	client.setQueryData(rawKey, { id: 1, name: 'Old name' });
	client.setQueryData(['groups', 'single', 2, 'raw'], { id: 2, name: 'Deleted group' });
	const api = spyOn(churchtoolsClient, 'get')
		.mockResolvedValueOnce([1])
		.mockResolvedValueOnce([{ id: 1, name: 'Updated name' }]);
	try {
		prepareQueryClientForSession(client);
		const groups = await fetchGroups(client, filter);
		expect(groups.map(({ id, name }) => ({ id, name }))).toEqual([{ id: 1, name: 'Updated name' }]);
		expect(api).toHaveBeenCalledTimes(2);
		expect(api.mock.calls[0]?.[0]).toBe('/groups/ids');
		expect(api.mock.calls[1]?.[0]).toBe('/groups');

		// React StrictMode and remounts must not repeatedly invalidate fresh data.
		prepareQueryClientForSession(client);
		expect(await fetchGroups(client, filter)).toEqual(groups);
		expect(api).toHaveBeenCalledTimes(2);
	} finally {
		api.mockRestore();
		client.clear();
	}
});

test('startup invalidates all organigram data but preserves unrelated host caches and defaults', () => {
	const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
	const keys = [
		['groups', 'filter', 'organigram', {}],
		['hierarchies'],
		['groupTypes'],
		['groupRoles'],
		['groupMembers', '1,2'],
		['persons', '1,2'],
		['permissions'],
		['personMasterData'],
		['presets'],
	];
	const unrelated = [['calendar'], ['groups', 'single', 1, 'include', 'roles']];
	for (const key of [...keys, ...unrelated]) client.setQueryData(key, []);
	const defaults = client.getDefaultOptions();
	prepareQueryClientForSession(client);
	for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
	for (const key of unrelated) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
	expect(client.getDefaultOptions()).toBe(defaults);
	client.clear();
});

test('organigram observers refresh on mount despite host defaults and leave host observers alone', async () => {
	const client = new QueryClient({
		defaultOptions: { queries: { refetchOnMount: false, retry: false, staleTime: Infinity } },
	});
	const key = ['groups', 'filter', 'organigram', {}];
	client.setQueryData(key, ['old']);
	client.setQueryData(['calendar'], ['host cached']);
	const defaults = client.getDefaultOptions();
	prepareQueryClientForSession(client);
	let requests = 0;
	const observer = new QueryObserver(client, {
		...organigramQueryOptions,
		queryFn: () => {
			requests++;
			return Promise.resolve(['fresh']);
		},
		queryKey: key,
	});
	const done = new Promise<void>((resolve) => {
		const unsubscribe = observer.subscribe((result) => {
			if (result.data?.[0] === 'fresh') {
				unsubscribe();
				resolve();
			}
		});
	});
	await done;
	expect(requests).toBe(1);
	expect(observer.getCurrentResult().data).toEqual(['fresh']);
	expect(client.getDefaultOptions()).toBe(defaults);
	const host = new QueryObserver<string[]>(client, {
		queryFn: () => {
			throw new Error('Host must not refetch');
		},
		queryKey: ['calendar'],
	});
	const stop = host.subscribe(() => undefined);
	expect(host.getCurrentResult().fetchStatus).toBe('idle');
	expect(host.getCurrentResult().data).toEqual(['host cached']);
	stop();
	client.clear();
});
