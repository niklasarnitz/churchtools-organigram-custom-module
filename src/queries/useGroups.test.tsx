import { churchtoolsClient } from '@churchtools/churchtools-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { t } from '../helpers/churchToolsTranslations';
import { loadDevTranslations } from '../helpers/loadDevTranslations';
import { GroupStatus } from '../types/GroupStatus';
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
	const key = ['groups', [], [], [], [GroupStatus.ACTIVE]];
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
	const server = Bun.serve({
		fetch(request) {
			const path = new URL(request.url).pathname;
			if (path === '/api/config') return Response.json({ site_language: 'de' });
			if (path === '/api/whoami') return Response.json({ data: { id: 4 } });
			if (path === '/api/persons/4/settings/churchcore') {
				return Response.json({ data: preference ? [{ attribute: 'language', value: preference }] : [] });
			}
			if (path === '/api/translations') {
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
		preference = null;
		await loadDevTranslations();
		expect(t('group.key')).toBe('Kleingruppe');
		expect(t('english.only')).toBe('english.only');
	} finally {
		churchtoolsClient.setBaseUrl(previousUrl ?? '');
		await server.stop(true);
	}
});
