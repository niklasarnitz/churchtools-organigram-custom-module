import type { QueryClient } from '@tanstack/react-query';

import { churchtoolsClient } from '@churchtools/churchtools-client';

import { markGroupsChanged } from './groupCache';

export interface NewsChange {
	domainId: number;
	domainType: string;
}

export interface NewsResponse {
	data: NewsChange[];
	meta: { lastPollDate: string };
}

interface PollOptions {
	apply: (changes: NewsChange[]) => Promise<void>;
	fetch: (since: string) => Promise<NewsResponse>;
	initialSince: string;
	isAvailable: () => boolean;
	onError: () => void;
	schedule: (callback: () => void, delay: number) => () => void;
}

// Contract: public ChurchTools OpenAPI, GET /pollfornews.
// rawResponse includes the Axios envelope; retain meta.lastPollDate as the cursor.
export async function fetchNews(since: string): Promise<NewsResponse> {
	const response = await churchtoolsClient.get<{ data: NewsResponse }>(
		'/pollfornews',
		{ domain_types: ['group', 'person'], since },
		{ rawResponse: true },
	);
	const news = response.data;
	if (!Array.isArray(news.data) || !Number.isFinite(Date.parse(news.meta.lastPollDate))) {
		throw new Error('Invalid poll-for-news response');
	}
	return news;
}

export async function refreshNewsQueries(client: QueryClient, changes: NewsChange[]): Promise<void> {
	const groupIds = new Set(changes.filter((c) => c.domainType === 'group').map((c) => c.domainId));
	const hasPersons = changes.some((c) => c.domainType === 'person');
	if (!groupIds.size && !hasPersons) return;
	markGroupsChanged(client, groupIds);

	// Mark nested caches stale before any active group-list query starts fetching.
	await client.invalidateQueries({
		predicate: ({ queryKey: key }) =>
			key[0] === 'groups' &&
			(key[1] === 'filter' || (key[1] === 'single' && key[3] === 'raw' && groupIds.has(Number(key[2])))) &&
			groupIds.size > 0,
		refetchType: 'none',
	});
	await client.invalidateQueries(
		{
			predicate: ({ queryKey: key }) =>
				key[0] === 'persons' ||
				key[0] === 'groupMembers' ||
				(groupIds.size > 0 &&
					(key[0] === 'hierarchies' ||
						(key[0] === 'groups' && key[1] === 'filter' && key[2] === 'organigram'))),
		},
		{ throwOnError: true },
	);
}

// Allow for second-resolution timestamps, strict executedate > since and a rounded-up
// server cursor. One second would still exclude a change exactly on the boundary.
// This does not cover arbitrarily delayed writes or expired notifications.
const NEWS_OVERLAP_MS = 2_000;

/** One request/refresh at a time; retries retain the last successful server cursor. */
export function startNewsPolling(options: PollOptions) {
	let since = options.initialSince;
	let stopped = false;
	const isStopped = () => stopped;
	let busy = false;
	let failures = 0;
	let cancelTimer: (() => void) | undefined;
	const run = async () => {
		if (isStopped() || busy) return;
		cancelTimer?.();
		if (!options.isAvailable()) {
			cancelTimer = options.schedule(() => {
				void run();
			}, 30_000);
			return;
		}
		busy = true;
		try {
			const news = await options.fetch(new Date(Date.parse(since) - NEWS_OVERLAP_MS).toISOString());
			if (isStopped()) return;
			await options.apply(news.data);
			if (isStopped()) return;
			since = news.meta.lastPollDate;
			failures = 0;
		} catch {
			failures++;
			if (!isStopped()) options.onError();
		} finally {
			busy = false;
			if (!isStopped()) {
				cancelTimer = options.schedule(
					() => {
						void run();
					},
					failures === 0 ? 5_000 : Math.min(300_000, 30_000 * 2 ** Math.min(failures, 4)),
				);
			}
		}
	};
	void run();
	return {
		resume: () => {
			void run();
		},
		stop: () => {
			stopped = true;
			cancelTimer?.();
		},
	};
}
