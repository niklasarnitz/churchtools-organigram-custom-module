import type { QueryClient } from '@tanstack/react-query';

const preparedClients = new WeakSet<QueryClient>();
const organigramKeys = new Set([
	'groupMembers',
	'groupRoles',
	'groupTypes',
	'hierarchies',
	'permissions',
	'personMasterData',
	'persons',
	'presets',
]);

/** Invalidate before mounting query observers, once per client and page session. */
export function prepareQueryClientForSession(client: QueryClient): QueryClient {
	if (preparedClients.has(client)) return client;
	preparedClients.add(client);

	// Invalidation is synchronous. Observers fetch on mount; do not trigger
	// unrelated active host requests or change the host's cache configuration.
	void client.invalidateQueries({
		predicate: ({ queryKey }) =>
			organigramKeys.has(String(queryKey[0])) ||
			(queryKey[0] === 'groups' &&
				(queryKey[1] === 'filter' || (queryKey[1] === 'single' && queryKey[3] === 'raw'))),
		refetchType: 'none',
	});
	return client;
}
