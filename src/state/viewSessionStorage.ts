import type { StateStorage } from 'zustand/middleware';

// Storage can be unavailable in embedded/private contexts. The view still works
// in memory in that case. Only this application's view key is accessed.
export const viewSessionStorage: StateStorage = {
	getItem: (name) => {
		try {
			return window.sessionStorage.getItem(name);
		} catch {
			return null;
		}
	},
	removeItem: (name) => {
		try {
			window.sessionStorage.removeItem(name);
		} catch {
			// Persistence is optional.
		}
	},
	setItem: (name, value) => {
		try {
			window.sessionStorage.setItem(name, value);
		} catch {
			// Persistence is optional.
		}
	},
};
