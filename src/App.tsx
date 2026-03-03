import "@fontsource/lato";
import 'reactflow/dist/style.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowProvider } from "reactflow";

import { MainComponent } from "./components/MainComponent";
import { useChurchToolsTheme } from './hooks/useChurchToolsTheme';

let queryClient: QueryClient | undefined;

function getQueryClient() {
    queryClient ??= new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                staleTime: 1000 * 60 * 5, // 5 minutes
            },
        },
    });
    return queryClient;
}

export const App = () => {
    useChurchToolsTheme();

    return (
        <QueryClientProvider client={getQueryClient()}>
            <ReactFlowProvider>
                <MainComponent />
            </ReactFlowProvider>
        </QueryClientProvider>
    );
};
