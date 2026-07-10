import '@fontsource/lato';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import 'react-contexify/dist/ReactContexify.css';

import { MainComponent } from './components/MainComponent';
import { useChurchToolsTheme } from './hooks/useChurchToolsTheme';
import { useCustomModuleTitleBar } from './hooks/useCustomModuleTitleBar';

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

const persister = createAsyncStoragePersister({
	storage: window.sessionStorage,
});

export const App = () => {
	useChurchToolsTheme();
	useCustomModuleTitleBar();

	return (
		<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
			<MainComponent />
		</PersistQueryClientProvider>
	);
};
