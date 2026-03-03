/* eslint-disable no-console */

const logPrefix = '[CCM - churchtools-organigram-custom-module] ';

export const Logger = {
	error: (message: unknown, ...optionalParams: unknown[]) => {
		const optional = optionalParams.length > 0 ? optionalParams : '';

		if (typeof message === 'object' && message !== null) {
			console.error(`${logPrefix} ${JSON.stringify(message)}`, optional);
			return;
		}
		console.error(`${logPrefix}${String(message)}`, optional);
	},
	log: (message: unknown, ...optionalParams: unknown[]) => {
		const optional = optionalParams.length > 0 ? optionalParams : '';

		if (typeof message === 'object' && message !== null) {
			console.log(`${logPrefix} ${JSON.stringify(message)}`, optional);
			return;
		}

		console.log(`${logPrefix}${String(message)}`, optional);
	},
};
