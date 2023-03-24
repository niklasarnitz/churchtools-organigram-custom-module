/* eslint-disable unicorn/prefer-module */
/* eslint-disable no-console */
const { churchtoolsClient } = require('@churchtools/churchtools-client');
const axiosCookieJarSupport = require('axios-cookiejar-support');
const tough = require('tough-cookie');

require('dotenv').config();

const deployModule = async () => { }

const updateModule = async (module) => { }

const start = async () => {
	churchtoolsClient.setCookieJar(axiosCookieJarSupport.wrapper, new tough.CookieJar());

	churchtoolsClient.setBaseUrl(process.env.REACT_APP_CTURL ?? '');
	await churchtoolsClient.post('/login', {
		username: process.env.REACT_APP_USERNAME,
		password: process.env.REACT_APP_PASSWORD,
	});

	const module = await churchtoolsClient.get('/custommodules/organigram');

	if (module.id) {
		console.log('Module already exists, updating it.');
		updateModule(module);
	} else {
		console.log('Module does not exist. Installing it.');
		deployModule();
	}
};

// eslint-disable-next-line unicorn/prefer-top-level-await
start();