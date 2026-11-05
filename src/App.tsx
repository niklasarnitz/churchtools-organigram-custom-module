import '@fontsource/lato';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import 'react-contexify/dist/ReactContexify.css';

import { MainComponent } from './components/MainComponent';
import { useChurchToolsTheme } from './hooks/useChurchToolsTheme';
import { useCustomModuleTitleBar } from './hooks/useCustomModuleTitleBar';
import { getChurchToolsQueryClient } from './queries/groupCache';
import { prepareQueryClientForSession } from './queries/prepareQueryClientForSession';

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

	// View settings persist separately. API data is refreshed once per page session,
	// including when ChurchTools supplies an already populated query client.
	const [client] = useState(() => prepareQueryClientForSession(getChurchToolsQueryClient() ?? queryClient));
	return (
		<QueryClientProvider client={client}>
			<MainComponent />
		</QueryClientProvider>
	);
};
