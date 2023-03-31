import './index.css';
import { App } from './App';
import { Logger } from './globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { fetchPermissions } from './api/routes/fetchPermissions';
import { isDev } from './globals/isDev';
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

// This is some logic to make the module work outside of churchtools for local development.
if (isDev) {
	Logger.log('Running in development mode.');

	churchtoolsClient.setBaseUrl(process.env.REACT_APP_CTURL ?? "");
	await churchtoolsClient.post('/login', {
		username: process.env.REACT_APP_USERNAME,
		password: process.env.REACT_APP_PASSWORD,
	})

	start();
} else {
	const baseUrl = `https://${window.location.host}`;

	Logger.log(`Setting base URL to ${baseUrl}`);

	churchtoolsClient.setBaseUrl(baseUrl);

	start();
}