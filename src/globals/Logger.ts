/* eslint-disable no-console */

const logPrefix = '[CCM - churchtools-organigram-custom-module] ';

export const Logger = {
	log: (message: any, ...optionalParams: any[]) => {
		const optional = optionalParams.length > 0 ? optionalParams : '';

		if (typeof message === 'object') {
			console.log(`${logPrefix} ${JSON.stringify(message)}`, optional);
			return;
		}

		console.log(`${logPrefix} ${message}`, optional);
	},
	error: (message: any, ...optionalParams: any[]) => {
		const optional = optionalParams.length > 0 ? optionalParams : '';

		if (typeof message === 'object') {
			console.error(`${logPrefix} ${JSON.stringify(message)}`, optional);
			return;
		}
		console.error(logPrefix + message, optional);
	},
};
