import "@fontsource/lato";
import 'reactflow/dist/style.css';
import { CssBaseline, GeistProvider } from '@geist-ui/core';
import { MainComponent } from "./components/MainComponent";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowProvider } from "reactflow"; // Ensure reactflow styles are loaded

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
        },
    },
});

export const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <GeistProvider>
                <CssBaseline />
                <ReactFlowProvider>
                    <MainComponent />
                </ReactFlowProvider>
            </GeistProvider>
        </QueryClientProvider>
    );
};
