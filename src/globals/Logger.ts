/* eslint-disable no-console */

const logPrefix = '[CCM - churchtools-organigram-custom-module] ';

export const Logger = {
	log: (message: any) => {
		if (typeof message === 'object') {
			console.log(`${logPrefix} ${JSON.stringify(message)}`);
			return;
		}

		console.log(`${logPrefix} ${message}`);
	},
	error: (message: any) => {
		if (typeof message === 'object') {
			console.error(`${logPrefix} ${JSON.stringify(message)}`);
			return;
		}
		console.error(logPrefix + message);
	},
};
