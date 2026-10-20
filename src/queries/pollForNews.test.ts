import { churchtoolsClient } from '@churchtools/churchtools-client';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { expect, mock, spyOn, test } from 'bun:test';

import { getColorForChurchToolsColor, getColorForGroupType } from '../globals/Colors';
import { createAppStore } from '../state/useAppStore';
import { fetchGroups } from './groupCache';
import { fetchNews, type NewsResponse, refreshNewsQueries, startNewsPolling } from './pollForNews';

const response = (lastPollDate = '2026-10-20T10:00:30Z'): NewsResponse => ({
	data: [{ domainId: 7, domainType: 'group' }],
	meta: { lastPollDate },
});
const settle = async () => {
	for (let i = 0; i < 20; i++) await Promise.resolve();
};

function harness(
	fetch: (since: string) => Promise<NewsResponse>,
	apply = mock<(changes: NewsResponse['data']) => Promise<void>>(() => Promise.resolve()),
) {
	let available = true;
	let scheduled: (() => void) | undefined;
	let delay = 0;
	const errors = mock(() => undefined);
	const polling = startNewsPolling({
		apply,
		fetch,
		initialSince: '2026-10-20T10:00:00Z',
		isAvailable: () => available,
		onError: errors,
		schedule: (callback, nextDelay) => {
			scheduled = callback;
			delay = nextDelay;
			return () => {
				scheduled = undefined;
			};
		},
	});
	return {
		apply,
		delay: () => delay,
		errors,
		hasTimer: () => scheduled !== undefined,
		polling,
		setAvailable: (value: boolean) => {
			available = value;
		},
		tick: async () => {
			const next = scheduled;
			scheduled = undefined;
			next?.();
			await settle();
		},
	};
}

test('uses documented endpoint and retains server cursor from the raw Axios envelope', async () => {
	const api = spyOn(churchtoolsClient, 'get').mockResolvedValue({ data: response() });
	try {
		expect(await fetchNews('2026-10-20T10:00:00Z')).toEqual(response());
		expect(api).toHaveBeenCalledWith(
			'/pollfornews',
			{
				domain_types: ['group', 'person'],
				since: '2026-10-20T10:00:00Z',
			},
			{ rawResponse: true },
		);
		api.mockResolvedValue({ data: { data: [], meta: { lastPollDate: 'invalid' } } });
		expect(fetchNews('2026-10-20T10:00:00Z')).rejects.toThrow();
	} finally {
		api.mockRestore();
	}
});

test('polling advances using the server timestamp, pauses and resumes, then cleans up', async () => {
	const fetch = mock<(since: string) => Promise<NewsResponse>>(() => Promise.resolve(response()));
	const h = harness(fetch);
	await settle();
	expect(h.delay()).toBe(5_000);
	h.setAvailable(false);
	await h.tick();
	expect(fetch).toHaveBeenCalledTimes(1);
	h.setAvailable(true);
	h.polling.resume();
	await settle();
	expect(fetch.mock.calls[0]).toEqual(['2026-10-20T09:59:58.000Z']);
	expect(fetch.mock.calls[1]).toEqual(['2026-10-20T10:00:28.000Z']);
	h.polling.stop();
	expect(h.hasTimer()).toBe(false);
	h.polling.resume();
	expect(fetch).toHaveBeenCalledTimes(2);
});

test('request and refresh failures retain the cursor and back off', async () => {
	const fetch = mock<(since: string) => Promise<NewsResponse>>(() =>
		Promise.resolve(response()),
	).mockRejectedValueOnce(new Error('offline'));
	const apply = mock<(changes: NewsResponse['data']) => Promise<void>>(() => Promise.resolve()).mockRejectedValueOnce(
		new Error('refresh failed'),
	);
	const h = harness(fetch, apply);
	await settle();
	expect(h.delay()).toBe(60_000);
	await h.tick();
	expect(h.delay()).toBe(120_000);
	await h.tick();
	expect(fetch.mock.calls).toEqual(Array.from({ length: 3 }, () => ['2026-10-20T09:59:58.000Z']));
	expect(h.delay()).toBe(5_000);
	expect(h.errors).toHaveBeenCalledTimes(2);
	h.polling.stop();
});

test('in-flight requests never overlap and late responses after unmount do not refresh data', async () => {
	let resolve!: (value: NewsResponse) => void;
	const fetch = mock(
		() =>
			new Promise<NewsResponse>((done) => {
				resolve = done;
			}),
	);
	const h = harness(fetch);
	h.polling.resume();
	h.polling.resume();
	expect(fetch).toHaveBeenCalledTimes(1);
	h.polling.stop();
	resolve(response());
	await settle();
	expect(h.apply).not.toHaveBeenCalled();
	expect(h.hasTimer()).toBe(false);
});

test('group news invalidates nested caches before refreshing active views and preserves the camera', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
	const store = createAppStore({ getItem: () => null, removeItem: () => undefined, setItem: () => undefined });
	store.getState().setCamera({ x: 37, y: -18, zoom: 2.1 });
	const view = store.getState();
	const idsKey = ['groups', 'filter', 'ids', {}];
	const rawKey = ['groups', 'single', 7, 'raw'];
	const otherRaw = ['groups', 'single', 8, 'raw'];
	const includes = ['groups', 'single', 7, 'include', 'roles'];
	for (const key of [idsKey, rawKey, otherRaw, includes, ['calendar']]) client.setQueryData(key, []);
	const refreshed: string[] = [];
	const unsubscribes = ['groups', 'hierarchies', 'groupMembers', 'persons'].map((name) => {
		const key = name === 'groups' ? ['groups', 'filter', 'organigram', {}] : [name];
		client.setQueryData(key, ['old']);
		const observer = new QueryObserver(client, {
			queryFn: () => {
				if (name === 'groups') {
					expect(client.getQueryState(idsKey)?.isInvalidated).toBe(true);
					expect(client.getQueryState(rawKey)?.isInvalidated).toBe(true);
				}
				refreshed.push(name);
				return Promise.resolve(['fresh']);
			},
			queryKey: key,
		});
		return observer.subscribe(() => undefined);
	});
	try {
		await refreshNewsQueries(client, response().data);
		expect(refreshed.sort()).toEqual(['groupMembers', 'groups', 'hierarchies', 'persons']);
		expect(client.getQueryData<string[]>(['hierarchies'])).toEqual(['fresh']);
		for (const key of [otherRaw, includes, ['calendar']])
			expect(client.getQueryState(key)?.isInvalidated).toBe(false);
		expect(store.getState()).toBe(view);
	} finally {
		unsubscribes.forEach((unsubscribe) => {
			unsubscribe();
		});
		client.clear();
	}
});

test('person news refreshes memberships and persons; unrelated and empty news cause no invalidations', async () => {
	const client = new QueryClient();
	for (const key of ['persons', 'groupMembers', 'hierarchies', 'presets']) client.setQueryData([key], []);
	await refreshNewsQueries(client, []);
	await refreshNewsQueries(client, [{ domainId: 7, domainType: 'appointment' }]);
	expect(client.getQueryState(['persons'])?.isInvalidated).toBe(false);
	await refreshNewsQueries(client, [{ domainId: 7, domainType: 'person' }]);
	expect(client.getQueryState(['persons'])?.isInvalidated).toBe(true);
	expect(client.getQueryState(['groupMembers'])?.isInvalidated).toBe(true);
	expect(client.getQueryState(['hierarchies'])?.isInvalidated).toBe(false);
	expect(client.getQueryState(['presets'])?.isInvalidated).toBe(false);
	client.clear();
});

test('successive group color notifications reach the observed group list through the real cache loader', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
	const filter = { group_status_ids: [1] };
	const key = ['groups', 'filter', 'organigram', filter];
	const oldGroup = { id: 7, information: { color: 'blue' }, name: 'Demo' };
	client.setQueryData(['groups', 'filter', 'ids', filter], [7]);
	client.setQueryData(['groups', 'single', 7, 'raw'], oldGroup);
	client.setQueryData(key, [oldGroup]);
	const api = spyOn(churchtoolsClient, 'get');
	const observer = new QueryObserver(client, {
		queryFn: () => fetchGroups(client, filter),
		queryKey: key,
	});
	const unsubscribe = observer.subscribe(() => undefined);
	try {
		for (const color of ['red', 'green', 'orange']) {
			api.mockResolvedValueOnce([7]).mockResolvedValueOnce([{ ...oldGroup, information: { color } }]);
			await refreshNewsQueries(client, [{ domainId: 7, domainType: 'group' }]);
			expect(observer.getCurrentResult().data?.[0].information.color).toBe(color);
		}
		expect(api).toHaveBeenCalledTimes(6);
	} finally {
		unsubscribe();
		api.mockRestore();
		client.clear();
	}
});

test('group news survives host cache writes and failed reloads, without fetching unchanged groups', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
	const filter = { group_status_ids: [1] };
	const key = ['groups', 'filter', 'organigram', filter];
	const rawKey = ['groups', 'single', 458, 'raw'];
	const oldGroup = { id: 458, information: { color: 'blue' }, name: 'Changed' };
	const otherGroup = { id: 459, information: { color: 'green' }, name: 'Unchanged' };
	client.setQueryData(rawKey, oldGroup);
	client.setQueryData(['groups', 'single', 459, 'raw'], otherGroup);
	client.setQueryData(key, [oldGroup, otherGroup]);
	let fail = true;
	const api = spyOn(churchtoolsClient, 'get').mockImplementation((url, params) => {
		if (url === '/groups/ids') {
			client.setQueryData(rawKey, oldGroup);
			return Promise.resolve([458, 459]);
		}
		expect(url).toBe('/groups');
		expect(params?.ids).toEqual([458]);
		if (fail) return Promise.reject(new Error('Temporary failure'));
		return Promise.resolve([{ ...oldGroup, information: { color: 'red' } }]);
	});
	const observer = new QueryObserver(client, { queryFn: () => fetchGroups(client, filter), queryKey: key });
	const unsubscribe = observer.subscribe(() => undefined);
	try {
		const failure = await refreshNewsQueries(client, [{ domainId: 458, domainType: 'group' }]).catch(
			(error: unknown) => error,
		);
		expect(failure).toBeInstanceOf(Error);
		fail = false;
		const groups = await fetchGroups(client, filter);
		expect(groups[0].information.color).toBe('red');
		expect(groups[1].information.color).toBe(otherGroup.information.color);
		api.mockClear();
		await fetchGroups(client, filter);
		expect(api).not.toHaveBeenCalled();
	} finally {
		unsubscribe();
		api.mockRestore();
		client.clear();
	}
});

test('group news removes a cached explicit color and restores the group-type fallback', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
	const filter = { group_status_ids: [1] };
	const key = ['groups', 'filter', 'organigram', filter];
	const oldGroup = { id: 458, information: { color: 'red', groupTypeId: 1 }, name: 'Demo' };
	const api = spyOn(churchtoolsClient, 'get');
	try {
		for (const information of [
			{ color: null, groupTypeId: 1 },
			{ color: '', groupTypeId: 1 },
			{ groupTypeId: 1 },
		]) {
			client.setQueryData(['groups', 'single', 458, 'raw'], oldGroup);
			client.setQueryData(key, [oldGroup]);
			const observer = new QueryObserver(client, { queryFn: () => fetchGroups(client, filter), queryKey: key });
			const unsubscribe = observer.subscribe(() => undefined);
			try {
				api.mockResolvedValueOnce([458]).mockResolvedValueOnce([{ ...oldGroup, information }]);
				await refreshNewsQueries(client, [{ domainId: 458, domainType: 'group' }]);
				const group = observer.getCurrentResult().data?.[0];
				expect(group?.information.color).not.toBe('red');
				expect(getColorForChurchToolsColor(group?.information.color)).toBeUndefined();
				expect(getColorForChurchToolsColor(group?.information.color) ?? getColorForGroupType(1)).toEqual(
					getColorForGroupType(1),
				);
			} finally {
				unsubscribe();
			}
		}
		expect(api).toHaveBeenCalledTimes(6);
	} finally {
		api.mockRestore();
		client.clear();
	}
});

test('two-second overlap catches strict timestamp boundaries and later changes to the same group', async () => {
	const firstCursor = Date.parse('2026-10-20T10:00:01Z');
	const storedChange = Date.parse('2026-10-20T10:00:00Z');
	// A server read at .800 rounds to :01; a subsequent write at .900 is stored as :00.
	expect(storedChange > firstCursor).toBe(false);
	expect(storedChange > firstCursor - 1_000).toBe(false);
	let polls = 0;
	const fetch = mock((since: string): Promise<NewsResponse> => {
		polls++;
		const cursor = new Date(firstCursor + (polls - 1) * 5_000).toISOString();
		// A second edit to the same ID is stored at :05 before the third poll.
		const executedAt = polls === 2 ? storedChange : Date.parse('2026-10-20T10:00:05Z');
		const data = polls >= 2 && executedAt > Date.parse(since) ? [{ domainId: 458, domainType: 'group' }] : [];
		return Promise.resolve({ data, meta: { lastPollDate: cursor } });
	});
	const applied: NewsResponse['data'][] = [];
	const h = harness(
		fetch,
		mock((changes: NewsResponse['data']) => {
			applied.push(changes);
			return Promise.resolve();
		}),
	);
	await settle();
	expect(applied).toEqual([[]]);
	await h.tick();
	expect(fetch.mock.calls[1]).toEqual(['2026-10-20T09:59:59.000Z']);
	expect(applied[1]).toEqual([{ domainId: 458, domainType: 'group' }]);
	await h.tick();
	expect(fetch.mock.calls[2]).toEqual(['2026-10-20T10:00:04.000Z']);
	expect(applied[2]).toEqual([{ domainId: 458, domainType: 'group' }]);
	expect(h.delay()).toBe(5_000);
	h.polling.stop();
});
