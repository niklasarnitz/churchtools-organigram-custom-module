import "@fontsource/lato";
import 'reactflow/dist/style.css';
import { MainComponent } from "./components/MainComponent";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowProvider } from "reactflow";

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
            <ReactFlowProvider>
                <MainComponent />
            </ReactFlowProvider>
        </QueryClientProvider>
    );
};
