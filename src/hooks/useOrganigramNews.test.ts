import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { expect, test } from 'bun:test';

import { refreshOrganigramNews } from './useOrganigramNews';

test('group news refreshes the graph and related data without invalidating unrelated host entities', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
	const listKey = ['groups', 'filter', 'organigram', {}];
	const idsKey = ['groups', 'filter', 'ids', {}];
	const rawKey = ['groups', 'single', 42, 'raw'];
	const unrelatedKey = ['groups', 'single', 43, 'raw'];
	const includeKey = ['groups', 'single', 42, 'roles'];
	for (const key of [
		listKey,
		idsKey,
		rawKey,
		unrelatedKey,
		includeKey,
		['hierarchies'],
		['groupMembers', '42'],
		['persons', '7'],
		['calendar'],
		['persons', 'single', 7, 'raw'],
		['groupMembers', 42],
	])
		client.setQueryData(key, 'before');
	const observer = new QueryObserver(client, { queryFn: () => Promise.resolve('updated group'), queryKey: listKey });
	const unsubscribe = observer.subscribe(() => {
		/* Keep the displayed query active. */
	});
	await refreshOrganigramNews(client, [{ domainId: 42, domainType: 'group' }]);
	expect(client.getQueryData<string>(listKey)).toBe('updated group');
	for (const key of [idsKey, rawKey, ['hierarchies'], ['groupMembers', '42'], ['persons', '7']])
		expect(client.getQueryState(key)?.isInvalidated).toBe(true);
	for (const key of [unrelatedKey, includeKey, ['calendar'], ['persons', 'single', 7, 'raw'], ['groupMembers', 42]])
		expect(client.getQueryState(key)?.isInvalidated).toBe(false);
	unsubscribe();
	client.clear();
});

test('person changes refresh names and memberships; unrelated news does not refresh organigram data', async () => {
	const client = new QueryClient();
	for (const key of [['persons', '7'], ['groupMembers', '42'], ['hierarchies']]) client.setQueryData(key, 'before');
	await refreshOrganigramNews(client, [{ domainId: 42, domainType: 'appointment' }]);
	expect(client.getQueryState(['persons', '7'])?.isInvalidated).toBe(false);
	await refreshOrganigramNews(client, [{ domainId: 7, domainType: 'person' }]);
	expect(client.getQueryState(['persons', '7'])?.isInvalidated).toBe(true);
	expect(client.getQueryState(['groupMembers', '42'])?.isInvalidated).toBe(true);
	expect(client.getQueryState(['hierarchies'])?.isInvalidated).toBe(false);
	client.clear();
});

test('a failed news refresh is reported to the poller and the same change can be retried', async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
	const key = ['groups', 'filter', 'organigram', {}];
	client.setQueryData(key, 'before');
	let fail = true;
	const observer = new QueryObserver(client, {
		queryFn: () => (fail ? Promise.reject(new Error('Refresh failed')) : Promise.resolve('after')),
		queryKey: key,
	});
	const unsubscribe = observer.subscribe(() => {
		/* Keep the displayed query active. */
	});
	try {
		const changes = [{ domainId: 42, domainType: 'group' }];
		const failure = await refreshOrganigramNews(client, changes).catch((error: unknown) => error);
		expect(failure).toMatchObject({ message: 'Refresh failed' });
		expect(client.getQueryData<string>(key)).toBe('before');
		fail = false;
		await refreshOrganigramNews(client, changes);
		expect(client.getQueryData<string>(key)).toBe('after');
	} finally {
		unsubscribe();
		client.clear();
	}
});
