import './index.css';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom/client';

const root = ReactDOM.createRoot(
	document.querySelector('#root') as HTMLElement
);

async function start() {
	churchtoolsClient.setBaseUrl('https://asdf.church.tools'); // Replace with your login
	await churchtoolsClient.post('/login', {
		username: 'churchtools',
		password: 'churchtools',
	})

	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}


// eslint-disable-next-line unicorn/prefer-top-level-await
start();




