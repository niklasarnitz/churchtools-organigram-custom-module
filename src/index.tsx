import { churchtoolsClient } from '@churchtools/churchtools-client';
import moment from 'moment';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import { Logger } from './globals/Logger';
import './index.css';
import { fetchPermissions } from './queries/usePermissions';
import { useAppStore } from './state/useAppStore';

const start = async () => {
    moment.locale('de');

    await fetchPermissions();

    const rootElement = document.querySelector('#root');

    if (!rootElement) {
        alert('churchtools-organigram-custom-module: Failed initializing custom module.');
        throw new Error('No root element found');
    }

    Logger.log('Starting custom module...');

    const root = ReactDOM.createRoot(rootElement);

    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

// Ensure development-only logic is excluded from production builds
if (import.meta.env.DEV) {
    Logger.log('Running in development mode.');

    // These environment variables are only available during local development
    useAppStore.getState().setBaseUrl(import.meta.env.VITE_CT_URL as string);

    await churchtoolsClient.post('/login', {
        password: import.meta.env.VITE_CT_PASSWORD as string,
        username: import.meta.env.VITE_CT_USERNAME as string,
    });

    try {
        await start();
    } catch (error) {
        Logger.error('Failed to start in development mode:', error);
    }
} else {
    const baseUrl = `https://${window.location.host}`;

    Logger.log(`Setting base URL to ${baseUrl}`);

    useAppStore.getState().setBaseUrl(baseUrl);

    try {
        await start();
    } catch (error) {
        Logger.error('Failed to start in production mode:', error);
    }
}
