import './index.css';
import { App } from './App';
import { Logger } from './globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { fetchPermissions } from './queries/usePermissions';
import { useAppStore } from './state/useAppStore';
import React from 'react';
import ReactDOM from 'react-dom/client';
import moment from 'moment';

const start = async () => {
    moment.locale('de');
    const permissions = await fetchPermissions();

    if (permissions && !permissions.churchcore['administer persons']) {
        alert('churchtools-organigram-custom-module: You do not have the permission to administer persons. This right is needed to use this module.');
        return;
    }

    const rootElement = document.querySelector('#root') as HTMLElement;

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
    useAppStore.getState().setBaseUrl(import.meta.env.VITE_CTURL);

    await churchtoolsClient.post('/login', {
        username: import.meta.env.VITE_CT_USERNAME,
        password: import.meta.env.VITE_CT_PASSWORD,
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
