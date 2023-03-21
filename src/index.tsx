import './index.css';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';

const root = ReactDOM.createRoot(
	document.querySelector('#root') as HTMLElement
);

if (process.env.NODE_ENV === 'development') {
	// eslint-disable-next-line no-inner-declarations
	churchtoolsClient.setBaseUrl(process.env.REACT_APP_CTURL ?? "");
	await churchtoolsClient.post('/login', {
		username: process.env.REACT_APP_USERNAME,
		password: process.env.REACT_APP_PASSWORD,
	})
}

root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);






