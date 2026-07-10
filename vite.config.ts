import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), react()],
	base: '/ccm/organigram',
	// Existing local setups still use the former Create React App variable names.
	envPrefix: ['VITE_', 'REACT_APP_'],
	server: {
		port: 5173,
		strictPort: true,
	},
	build: {
		outDir: 'build',
		target: 'es2022',
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
	},
});
