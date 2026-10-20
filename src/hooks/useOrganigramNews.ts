import { churchtoolsClient } from '@churchtools/churchtools-client';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { Logger } from '../globals/Logger';

interface NewsChange {
	domainId: number;
	domainType: string;
}

// PollForNews exposes group/person changes, not separate role or hierarchy events.
// A group change therefore refreshes the associated metadata and memberships too.
export async function refreshOrganigramNews(client: QueryClient, changes: NewsChange[]) {
	const groupIds = new Set(
		changes.filter((change) => change.domainType === 'group').map((change) => change.domainId),
	);
	const hasPersons = changes.some((change) => change.domainType === 'person');
	if (!groupIds.size && !hasPersons) return;

	if (groupIds.size) {
		await client.invalidateQueries({
			predicate: ({ queryKey: key }) =>
				key[0] === 'groups' &&
				((key[1] === 'single' && groupIds.has(Number(key[2])) && key[3] === 'raw') ||
					(key[1] === 'filter' && key[2] === 'ids')),
			refetchType: 'none',
		});
	}

	await client.invalidateQueries({
		predicate: ({ queryKey: key }) =>
			(groupIds.size > 0 &&
				((key[0] === 'groups' && key[1] === 'filter' && key[2] === 'organigram') ||
					(key.length === 1 &&
						['groupRoles', 'groupTypes', 'hierarchies', 'personMasterData'].includes(String(key[0]))))) ||
			// These are the organigram's ID-list queries, not the host's person or member entities.
			(key.length === 2 &&
				typeof key[1] === 'string' &&
				/^\d+(,\d+)*$/u.test(key[1]) &&
				(key[0] === 'groupMembers' || key[0] === 'persons')),
	});
}

export function useOrganigramNews() {
	const client = useQueryClient();
	useEffect(() => {
		let active = true;
		let since = new Date().toISOString();
		let timer: ReturnType<typeof setTimeout>;
		const poll = async () => {
			try {
				if (document.visibilityState === 'hidden') return;
				const response = await churchtoolsClient.get<{
					data: { data: NewsChange[]; meta: { lastPollDate: string } };
				}>('/pollfornews', { domain_types: ['group', 'person'], since }, { rawResponse: true });
				if (!active) return;
				await refreshOrganigramNews(client, response.data.data);
				since = response.data.meta.lastPollDate;
			} catch (error) {
				Logger.error('Organigramm: Änderungsmeldungen konnten nicht geladen werden', error);
			} finally {
				if (active)
					timer = setTimeout(() => {
						void poll();
					}, 15_000);
			}
		};
		void poll();
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [client]);
}
