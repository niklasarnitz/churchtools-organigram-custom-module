import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss(), react()],
    base: '/ccm/organigram',
    build: {
        outDir: 'build',
        target: 'es2022',
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
});
