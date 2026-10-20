import '@fontsource/lato';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-contexify/dist/ReactContexify.css';

import { MainComponent } from './components/MainComponent';
import { useChurchToolsTheme } from './hooks/useChurchToolsTheme';
import { useCustomModuleTitleBar } from './hooks/useCustomModuleTitleBar';
import { getChurchToolsQueryClient } from './queries/groupCache';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24, // 24 hours
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				// Never retry on 403 Forbidden - missing permissions will not change
				const status = (error as { response?: { status?: number } }).response?.status;
				if (status === 403) return false;
				return failureCount < 3;
			},
			staleTime: 1000 * 60 * 5, // 5 minutes
		},
	},
});

export const App = () => {
	useChurchToolsTheme();
	useCustomModuleTitleBar();

	const hostClient = getChurchToolsQueryClient();
	if (hostClient) {
		// Do not persist or reconfigure the host's cache. Its own invalidations and
		// freshness policy must apply to both the group module and the organigram.
		return (
			<QueryClientProvider client={hostClient}>
				<MainComponent />
			</QueryClientProvider>
		);
	}

	return (
		<QueryClientProvider client={queryClient}>
			<MainComponent />
		</QueryClientProvider>
	);
};
