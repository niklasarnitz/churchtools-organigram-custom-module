import { churchtoolsClient } from '@churchtools/churchtools-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { t } from '../helpers/churchToolsTranslations';
import { loadDevTranslations } from '../helpers/loadDevTranslations';
import { GroupStatus } from '../types/GroupStatus';
import { fetchGroups } from './groupCache';
import { useGroupRoles } from './useGroupRoles';
import { useGroups } from './useGroups';
import { useGroupTypes } from './useGroupTypes';
import { usePersonMasterData } from './usePersonMasterData';

afterEach(() => {
	globalThis.i18n = undefined;
	globalThis.lang = undefined;
	globalThis.masterData = undefined;
});

test('cached groups are translated for each frontend language without changing cached API names', () => {
	const client = new QueryClient();
	const key = ['groups', 'filter', 'organigram', { group_status_ids: [GroupStatus.ACTIVE] }];
	const groups = [
		{ id: 1, name: 'group.key' },
		{ id: 2, name: 'Community Café' },
	];
	client.setQueryData(key, groups);
	const Names = () => (
		<span>
			{useGroups()
				.data?.map((group) => group.name)
				.join(', ')}
		</span>
	);
	const render = () =>
		renderToStaticMarkup(
			<QueryClientProvider client={client}>
				<Names />
			</QueryClientProvider>,
		);

	globalThis.lang = { churchcore: { 'group.key': 'Kleingruppe' } };
	expect(render()).toBe('<span>Kleingruppe, Community Café</span>');
	globalThis.lang = { churchcore: { 'group.key': 'Small group' } };
	expect(render()).toBe('<span>Small group, Community Café</span>');
	expect(client.getQueryData<typeof groups>(key)).toEqual(groups);
	client.clear();
});

test('all master-data names prefer API translations, fall back to ChurchTools keys and preserve ordinary names and cache', () => {
	const client = new QueryClient();
	const entries = [
		{ id: 1, name: 'type.key', nameTranslated: 'Server translation' },
		{ id: 2, name: 'role.key', nameTranslated: '' },
		{ id: 3, name: 'Community Café' },
	];
	const masterData = {
		ageGroups: [{ id: 4, name: 'age.key' }],
		campuses: [{ id: 5, name: 'campus.key' }],
		groupCategories: [{ id: 6, name: 'category.key' }],
	};
	client.setQueryData(['groupTypes'], entries);
	client.setQueryData(['groupRoles'], entries);
	client.setQueryData(['personMasterData'], masterData);
	globalThis.lang = {
		churchcore: {
			'age.key': 'Erwachsene',
			'campus.key': 'Nord',
			'category.key': 'Musik',
			'role.key': 'Leitung',
			'type.key': 'Must not override API translation',
		},
	};
	const Names = () => {
		const types = useGroupTypes().data;
		const roles = useGroupRoles().data;
		const data = usePersonMasterData().data;
		return (
			<span>
				{[types, roles, data?.ageGroups, data?.campuses, data?.groupCategories]
					.map((list) => list?.map((entry) => entry.name).join(', '))
					.join(' / ')}
			</span>
		);
	};
	const output = renderToStaticMarkup(
		<QueryClientProvider client={client}>
			<Names />
		</QueryClientProvider>,
	);
	expect(output).toBe(
		'<span>Server translation, Leitung, Community Café / Server translation, Leitung, Community Café / Erwachsene / Nord / Musik</span>',
	);
	expect(client.getQueryData<typeof entries>(['groupTypes'])).toEqual(entries);
	expect(client.getQueryData<typeof entries>(['groupRoles'])).toEqual(entries);
	expect(client.getQueryData<typeof masterData>(['personMasterData'])).toEqual(masterData);
	client.clear();
});

test('production uses the host translator rather than its own dictionary lookup', () => {
	globalThis.lang = { churchcore: { 'group.key': 'Wrong language' } };
	globalThis.i18n = (key, args, marker) => {
		if (key === 'group.key') return 'Host translation';
		return args === false && marker === false ? key : `***${key}***`;
	};
	expect(t('group.key')).toBe('Host translation');
	expect(t('Community Café')).toBe('Community Café');
});

test('development follows module precedence, preserves unknown names and supports placeholders and plurals', () => {
	globalThis.masterData = { modulename: 'churchdb' };
	globalThis.lang = {
		churchcore: { shared: 'Core', teams: 'One team|{count} teams', welcome: 'Hello {name}, {name}!' },
		churchdb: { shared: 'Current', specific: 'Current module', teams: 'Wrong' },
		churchgroup: { shared: 'Other', specific: 'Other module' },
	};
	expect(t('shared')).toBe('Core');
	expect(t('specific')).toBe('Current module');
	expect(t('Community Café')).toBe('Community Café');
	expect(t('toString')).toBe('toString');
	expect(t('welcome', { name: '$&' })).toBe('Hello $&, $&!');
	expect(t('teams', { count: 1 })).toBe('One team');
	expect(t('teams', { count: 7 })).toBe('7 teams');
	globalThis.lang.churchcore.teams = 'No teams|One team|{count} teams';
	expect(t('teams', { count: 0 })).toBe('No teams');
	expect(t('teams', { count: 1 })).toBe('One team');
	expect(t('teams', { count: 2 })).toBe('2 teams');
});

test('dev downloads installation translations using the user language and ChurchTools fallback rules', async () => {
	let preference: null | string = 'fr';
	let translationRequests = 0;
	const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
	const storage = new Map<string, string>();
	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
		},
	});
	const server = Bun.serve({
		fetch(request) {
			const path = new URL(request.url).pathname;
			if (path === '/api/config') return Response.json({ site_language: 'de' });
			if (path === '/api/whoami') return Response.json({ data: { id: 4 } });
			if (path === '/api/persons/4/settings/churchcore') {
				return Response.json({ data: preference ? [{ attribute: 'language', value: preference }] : [] });
			}
			if (path === '/api/translations') {
				translationRequests++;
				return Response.json({
					data: [
						{
							key: 'group.key',
							module: 'churchcore',
							translations: {
								de: { translation: 'Kleingruppe' },
								en: { translation: 'Small group' },
								fr: { translation: 'Petit groupe' },
							},
						},
						{
							key: 'english.only',
							module: 'churchdb',
							translations: { en: { translation: 'English fallback' } },
						},
					],
				});
			}
			return new Response(null, { status: 404 });
		},
		port: 0,
	});
	const previousUrl = churchtoolsClient.getBaseUrl();
	churchtoolsClient.setBaseUrl(server.url.origin);
	try {
		await loadDevTranslations();
		expect(t('group.key')).toBe('Petit groupe');
		expect(t('english.only')).toBe('English fallback');
		globalThis.lang = undefined;
		await loadDevTranslations();
		expect(t('group.key')).toBe('Petit groupe');
		expect(translationRequests).toBe(1);
		preference = null;
		await loadDevTranslations();
		expect(t('group.key')).toBe('Kleingruppe');
		expect(t('english.only')).toBe('english.only');
		expect(translationRequests).toBe(2);
	} finally {
		if (previousStorage) Object.defineProperty(globalThis, 'sessionStorage', previousStorage);
		else Reflect.deleteProperty(globalThis, 'sessionStorage');
		churchtoolsClient.setBaseUrl(previousUrl ?? '');
		await server.stop(true);
	}
});

test('group loading reuses and populates the native cache, respects filters and refetches invalidated or expired groups', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 300_000 } } });
	const filter = { campus_ids: [7], group_status_ids: [1, 2] };
	const idsKey = ['groups', 'filter', 'ids', filter];
	const rawKey = (id: number) => ['groups', 'single', id, 'raw'];
	client.setQueryData(idsKey, [23, 9, 15, 8, 30]);
	client.setQueryData(rawKey(23), { id: 23, name: 'From group module' });
	client.setQueryData(rawKey(9), { id: 9, name: 'Invalidated' });
	client.setQueryData(rawKey(8), { id: 8, name: 'No longer visible' });
	client.setQueryData(rawKey(30), { id: 30, name: 'Expired' }, { updatedAt: Date.now() - 300_001 });
	client.setQueryData(rawKey(99), { id: 99, name: 'Different filter' });
	const rolesKey = ['groups', 'single', 9, 'include', 'roles'];
	client.setQueryData(rolesKey, [{ id: 4, name: 'Cached role' }]);
	await client.invalidateQueries({ queryKey: rawKey(9) });
	await client.invalidateQueries({ queryKey: rawKey(8) });
	const requests: number[][] = [];
	let idRequests = 0;
	const server = Bun.serve({
		fetch(request) {
			const url = new URL(request.url);
			if (url.pathname === '/api/groups/ids') {
				idRequests++;
				return Response.json({ data: [23, 9, 15, 30] });
			}
			expect(url.pathname).toBe('/api/groups');
			expect(url.searchParams.getAll('campus_ids[]')).toEqual(['7']);
			expect(url.searchParams.getAll('group_status_ids[]')).toEqual(['1', '2']);
			expect(url.searchParams.get('include')).toBe('[]');
			const ids = url.searchParams.getAll('ids[]').map(Number);
			requests.push(ids);
			return Response.json({
				data: ids.filter((id) => id !== 8).map((id) => ({ id, name: `Fresh ${String(id)}` })),
			});
		},
		port: 0,
	});
	const previousUrl = churchtoolsClient.getBaseUrl();
	churchtoolsClient.setBaseUrl(server.url.origin);
	try {
		const groups = await fetchGroups(client, filter);
		expect(groups.map((group) => group.name)).toEqual(['From group module', 'Fresh 9', 'Fresh 15', 'Fresh 30']);
		expect(requests).toEqual([[9, 15, 8, 30]]);
		expect(idRequests).toBe(0);
		expect(client.getQueryData<{ id: number; name: string }>(rawKey(15))).toEqual({ id: 15, name: 'Fresh 15' });
		expect(client.getQueryData<{ id: number; name: string }[]>(rolesKey)).toEqual([{ id: 4, name: 'Cached role' }]);
		await client.invalidateQueries({ queryKey: ['groups', 'filter'] });
		expect((await fetchGroups(client, filter)).map((group) => group.id)).toEqual([23, 9, 15, 30]);
		expect(idRequests).toBe(1);
		expect(requests).toHaveLength(1);
		// A reload bypasses even fresh host entries from before this module load,
		// but keeps entities already refreshed during the current session.
		const reloadedAt = Date.now();
		for (const id of [23, 15, 30]) {
			client.setQueryData(rawKey(id), { id, name: 'Before reload' }, { updatedAt: reloadedAt - 1 });
		}
		client.setQueryData(rawKey(9), { id: 9, name: 'Already refreshed' }, { updatedAt: reloadedAt });
		expect((await fetchGroups(client, filter, reloadedAt)).map((group) => group.name)).toEqual([
			'Fresh 23',
			'Already refreshed',
			'Fresh 15',
			'Fresh 30',
		]);
		expect(requests[1]).toEqual([23, 15, 30]);
		expect(idRequests).toBe(2);
		await fetchGroups(client, filter, reloadedAt);
		expect(requests).toHaveLength(2);
	} finally {
		churchtoolsClient.setBaseUrl(previousUrl ?? '');
		client.clear();
		await server.stop(true);
	}
});

test('reload refreshes IDs without replacing the shared host query policy or fetch function', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const filter = { campus_ids: [7] };
	const idsKey = ['groups', 'filter', 'ids', filter];
	let hostFetches = 0;
	await client.fetchQuery({
		queryFn: () => {
			hostFetches++;
			return Promise.resolve([9]);
		},
		queryKey: idsKey,
		staleTime: Infinity,
	});
	const server = Bun.serve({
		fetch(request) {
			return Response.json({
				data: new URL(request.url).pathname.endsWith('/ids') ? [23] : [{ id: 23, name: 'New group' }],
			});
		},
		port: 0,
	});
	const previousUrl = churchtoolsClient.getBaseUrl();
	churchtoolsClient.setBaseUrl(server.url.origin);
	try {
		expect((await fetchGroups(client, filter, Date.now())).map((group) => group.id)).toEqual([23]);
		expect(client.getQueryData<number[]>(idsKey)).toEqual([23]);
		expect(client.getQueryCache().find({ exact: true, queryKey: idsKey })?.options).toMatchObject({
			staleTime: Infinity,
		});
		expect(hostFetches).toBe(1);
		await client.refetchQueries({ exact: true, queryKey: idsKey });
		expect(hostFetches).toBe(2);
		expect(client.getQueryData<number[]>(idsKey)).toEqual([9]);

		// A request started by the host before our reload may finish afterward.
		const older = Promise.withResolvers<number[]>();
		const olderRequest = client
			.fetchQuery({ queryFn: () => older.promise, queryKey: idsKey, staleTime: 0 })
			.catch((error: unknown) => error);
		expect((await fetchGroups(client, filter, Date.now())).map((group) => group.id)).toEqual([23]);
		older.resolve([9]);
		await olderRequest;
		expect(client.getQueryData<number[]>(idsKey)).toEqual([23]);
	} finally {
		churchtoolsClient.setBaseUrl(previousUrl ?? '');
		client.clear();
		await server.stop(true);
	}
});

test('published groups expire for the native batcher without invalidating newer host writes or include data', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 40 } } });
	const rawKey = (id: number) => ['groups', 'single', id, 'raw'];
	const includeKey = ['groups', 'single', 1, 'include', 'roles'];
	client.setQueryData(includeKey, [{ id: 5 }]);
	const server = Bun.serve({
		fetch(request) {
			return Response.json({
				data: new URL(request.url).pathname.endsWith('/ids')
					? [1, 2]
					: [
							{ id: 1, name: 'First' },
							{ id: 2, name: 'Second' },
						],
			});
		},
		port: 0,
	});
	const previousUrl = churchtoolsClient.getBaseUrl();
	churchtoolsClient.setBaseUrl(server.url.origin);
	try {
		await fetchGroups(client, {});
		await Bun.sleep(5);
		client.setQueryData(rawKey(2), { id: 2, name: 'Updated in group module' });
		await Bun.sleep(50);
		expect(client.getQueryState(rawKey(1))?.isInvalidated).toBe(true);
		expect(client.getQueryState(rawKey(2))?.isInvalidated).toBe(false);
		expect(client.getQueryData<{ id: number; name: string }>(rawKey(2))).toEqual({
			id: 2,
			name: 'Updated in group module',
		});
		expect(client.getQueryState(includeKey)?.isInvalidated).toBe(false);
	} finally {
		churchtoolsClient.setBaseUrl(previousUrl ?? '');
		client.clear();
		await server.stop(true);
	}
});

test('large installations load all groups with bounded parallel requests and reuse them on the next load', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 300_000 } } });
	const ids = Array.from({ length: 5001 }, (_, index) => index + 10_000_000);
	let active = 0;
	let peak = 0;
	let groupRequests = 0;
	const server = Bun.serve({
		async fetch(request) {
			const url = new URL(request.url);
			if (url.pathname === '/api/groups/ids') return Response.json({ data: ids });
			const batch = url.searchParams.getAll('ids[]').map(Number);
			expect(batch.length).toBeLessThanOrEqual(100);
			expect(request.url.length).toBeLessThan(2000);
			groupRequests++;
			active++;
			peak = Math.max(peak, active);
			await Bun.sleep(batch[0] % 3 === 0 ? 5 : 1);
			active--;
			return Response.json({ data: batch.map((id) => ({ id, name: `Group ${String(id)}` })) });
		},
		port: 0,
	});
	const previousUrl = churchtoolsClient.getBaseUrl();
	churchtoolsClient.setBaseUrl(server.url.origin);
	try {
		const groups = await fetchGroups(client, {});
		expect(groups.map((group) => group.id)).toEqual(ids);
		expect(groups.at(-1)?.name).toBe('Group 10005000');
		expect(peak).toBeGreaterThan(1);
		expect(peak).toBeLessThanOrEqual(4);
		expect(groupRequests).toBe(51);
		expect(await fetchGroups(client, {})).toEqual(groups);
		expect(groupRequests).toBe(51);
	} finally {
		churchtoolsClient.setBaseUrl(previousUrl ?? '');
		client.clear();
		await server.stop(true);
	}
});
