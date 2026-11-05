import { churchtoolsClient } from '@churchtools/churchtools-client';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { expect, spyOn, test } from 'bun:test';

import { fetchGroups } from './groupCache';
import { organigramQueryOptions } from './organigramQueryOptions';
import { refreshNewsQueries } from './pollForNews';
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

test('startup and news reloads bypass older in-flight ID requests and prevent late cache overwrites', async () => {
	for (const invalidate of [
		(client: QueryClient) => prepareQueryClientForSession(client),
		(client: QueryClient) => refreshNewsQueries(client, [{ domainId: 1, domainType: 'group' }]),
	]) {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
		const idsKey = ['groups', 'filter', 'ids', {}];
		const older = Promise.withResolvers<number[]>();
		const olderRequest = client
			.fetchQuery({ queryFn: () => older.promise, queryKey: idsKey })
			.catch(() => undefined);
		const api = spyOn(churchtoolsClient, 'get')
			.mockResolvedValueOnce([1])
			.mockResolvedValueOnce([{ id: 1, name: 'Fresh' }]);
		try {
			await invalidate(client);
			const loading = fetchGroups(client, {});
			// A fresh request must start without waiting for the old host response.
			expect(api).toHaveBeenCalledWith('/groups/ids', {});
			expect((await loading).map((group) => group.id)).toEqual([1]);
			older.resolve([2]);
			await olderRequest;
			expect(client.getQueryData<number[]>(idsKey)).toEqual([1]);
		} finally {
			older.resolve([2]);
			await olderRequest;
			api.mockRestore();
			client.clear();
		}
	}
});

test('cancelled organigram refreshes cannot overwrite newer IDs or group entities', async () => {
	for (const blockedEndpoint of ['/groups/ids', '/groups']) {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
		const idsKey = ['groups', 'filter', 'ids', {}];
		const rawKey = ['groups', 'single', 1, 'raw'];
		client.setQueryData(idsKey, [1]);
		await client.invalidateQueries({ exact: true, queryKey: idsKey, refetchType: 'none' });
		const started = Promise.withResolvers<boolean>();
		const response = Promise.withResolvers<number[] | { id: number; name: string }[]>();
		let blocked = false;
		const api = spyOn(churchtoolsClient, 'get').mockImplementation((url) => {
			if (url === blockedEndpoint && !blocked) {
				blocked = true;
				started.resolve(true);
				return response.promise;
			}
			return Promise.resolve(url === '/groups/ids' ? [1] : [{ id: 1, name: 'Fresh' }]);
		});
		try {
			const controller = new AbortController();
			const older = fetchGroups(client, {}, controller.signal).catch(() => undefined);
			await started.promise;
			controller.abort();
			await client.invalidateQueries({ exact: true, queryKey: idsKey, refetchType: 'none' });
			expect((await fetchGroups(client, {})).map((group) => group.name)).toEqual(['Fresh']);
			response.resolve(blockedEndpoint === '/groups/ids' ? [2] : [{ id: 1, name: 'Old' }]);
			await older;
			expect(client.getQueryData<number[]>(idsKey)).toEqual([1]);
			expect(client.getQueryData<{ id: number; name: string }>(rawKey)).toEqual({ id: 1, name: 'Fresh' });
		} finally {
			response.resolve([]);
			api.mockRestore();
			client.clear();
		}
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
	const unrelated = [
		['calendar'],
		['groups', 'single', 1, 'include', 'roles'],
		['persons'],
		['persons', 1],
		['persons', 'single', 1],
		['persons', '1,2', 'details'],
		['groupMembers'],
		['groupMembers', 1],
		['groupMembers', 'all'],
	];
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
