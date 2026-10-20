import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { Logger } from '../globals/Logger';
import { fetchNews, refreshNewsQueries, startNewsPolling } from '../queries/pollForNews';

export function usePollForNews() {
	const client = useQueryClient();
	useEffect(() => {
		const polling = startNewsPolling({
			apply: (changes) => refreshNewsQueries(client, changes),
			fetch: fetchNews,
			initialSince: new Date().toISOString(),
			isAvailable: () => document.visibilityState !== 'hidden' && navigator.onLine,
			onError: () => {
				Logger.error('Automatische Aktualisierung fehlgeschlagen; erneuter Versuch folgt.');
			},
			schedule: (callback, delay) => {
				const timer = window.setTimeout(callback, delay);
				return () => {
					window.clearTimeout(timer);
				};
			},
		});
		document.addEventListener('visibilitychange', polling.resume);
		window.addEventListener('online', polling.resume);
		return () => {
			polling.stop();
			document.removeEventListener('visibilitychange', polling.resume);
			window.removeEventListener('online', polling.resume);
		};
	}, [client]);
}
