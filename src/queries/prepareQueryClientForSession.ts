import type { QueryClient } from '@tanstack/react-query';

const preparedClients = new WeakSet<QueryClient>();
const organigramKeys = new Set([
	'groupRoles',
	'groupTypes',
	'hierarchies',
	'permissions',
	'personMasterData',
	'presets',
]);

/** Invalidate before mounting query observers, once per client and page session. */
export function prepareQueryClientForSession(client: QueryClient): QueryClient {
	if (preparedClients.has(client)) return client;
	preparedClients.add(client);

	// Invalidation is synchronous. Our observers explicitly enable mount refetches; do not trigger
	// unrelated active host requests or change the host's cache configuration.
	void client.invalidateQueries({
		predicate: ({ queryKey }) =>
			organigramKeys.has(String(queryKey[0])) ||
			((queryKey[0] === 'persons' || queryKey[0] === 'groupMembers') &&
				queryKey.length === 2 &&
				typeof queryKey[1] === 'string' &&
				/^\d+(,\d+)*$/.test(queryKey[1])) ||
			(queryKey[0] === 'groups' &&
				(queryKey[1] === 'filter' || (queryKey[1] === 'single' && queryKey[3] === 'raw'))),
		refetchType: 'none',
	});
	return client;
}
