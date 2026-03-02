import "@fontsource/lato";
import { CssBaseline, GeistProvider } from '@geist-ui/core';
import { MainComponent } from "./components/MainComponent";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
                <MainComponent />
            </GeistProvider>
        </QueryClientProvider>
    );
};
