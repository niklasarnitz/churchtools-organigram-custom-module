import "@fontsource/lato";
import 'reactflow/dist/style.css';
import 'react-contexify/dist/ReactContexify.css';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactFlowProvider } from "reactflow";

import { MainComponent } from "./components/MainComponent";
import { useChurchToolsTheme } from './hooks/useChurchToolsTheme';
import { useSyncSettingsWithUrl } from './hooks/useSyncSettingsWithUrl';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 * 5, // 5 minutes
        },
    },
});

const persister = createAsyncStoragePersister({
    storage: window.sessionStorage,
});

export const App = () => {
    useChurchToolsTheme();
    useSyncSettingsWithUrl();

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
        >
            <ReactFlowProvider>
                <MainComponent />
            </ReactFlowProvider>
        </PersistQueryClientProvider>
    );
};
