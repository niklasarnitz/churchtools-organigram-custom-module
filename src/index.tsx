import './index.css';
import { Logger } from './globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { isDev } from './globals/isDev';
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';

const start = () => {
	const rootElement = document.querySelector('#root') as HTMLElement;

	if (!rootElement) {
		alert('Failed initializing custom module.');
		throw new Error('No root element found');
	}

	Logger.log('Starting custom module...');
	Logger.log(rootElement)

	const root = ReactDOM.createRoot(rootElement);

	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}

if (isDev) {
	// eslint-disable-next-line no-inner-declarations
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