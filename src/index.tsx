import './index.css';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';

const root = ReactDOM.createRoot(
	document.querySelector('#root') as HTMLElement
);

async function start() {
	churchtoolsClient.setBaseUrl('https://test.church.tools'); // Replace with your login
	await churchtoolsClient.post('/login', {
		username: 'username',
		password: 'password',
	})

	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}


// eslint-disable-next-line unicorn/prefer-top-level-await
start();




