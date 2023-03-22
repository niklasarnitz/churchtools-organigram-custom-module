/* eslint-disable no-console */

const logPrefix = '[CCM - churchtools-organigram-custom-module] ';

export const Logger = {
	log: (message: any) => {
		console.log(logPrefix + message);
	},
	error: (message: any) => {
		console.error(logPrefix + message);
	},
};
