import "@fontsource/lato";
import 'reactflow/dist/style.css';
import { MainComponent } from "./components/MainComponent";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowProvider } from "reactflow";
import { useChurchToolsTheme } from './hooks/useChurchToolsTheme';

let queryClient: QueryClient;

function getQueryClient() {
    if (!queryClient) {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 1000 * 60 * 5, // 5 minutes
                    refetchOnWindowFocus: false,
                },
            },
        });
    }
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
