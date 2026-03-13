import { useEffect, useState } from 'react';

type ChurchToolsTheme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'theme';

export function useChurchToolsTheme() {
	useEffect(() => {
		applyTheme(readTheme());

		const onStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) {
				applyTheme(readTheme());
			}
		};
		window.addEventListener('storage', onStorage);

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const onMediaChange = () => {
			if (readTheme() === 'system') {
				applyTheme('system');
			}
		};
		mediaQuery.addEventListener('change', onMediaChange);

		// Poll for same-tab localStorage changes (since storage event only fires cross-tab)
		let lastValue = localStorage.getItem(STORAGE_KEY);
		const interval = setInterval(() => {
			const current = localStorage.getItem(STORAGE_KEY);
			if (current !== lastValue) {
				lastValue = current;
				applyTheme(readTheme());
			}
		}, 1000);

		return () => {
			window.removeEventListener('storage', onStorage);
			mediaQuery.removeEventListener('change', onMediaChange);
			clearInterval(interval);
		};
	}, []);
}

export function useIsDarkMode() {
	const [isDark, setIsDark] = useState(() => getEffectiveDark(readTheme()));

	useEffect(() => {
		const update = () => { setIsDark(getEffectiveDark(readTheme())); };

		const onStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) update();
		};
		window.addEventListener('storage', onStorage);

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', update);

		const interval = setInterval(update, 1000);

		return () => {
			window.removeEventListener('storage', onStorage);
			mediaQuery.removeEventListener('change', update);
			clearInterval(interval);
		};
	}, []);

	return isDark;
}

function applyTheme(theme: ChurchToolsTheme) {
	const isDark = getEffectiveDark(theme);
	document.documentElement.classList.toggle('dark', isDark);
	document.body.classList.toggle('dark', isDark);
}

function getEffectiveDark(theme: ChurchToolsTheme): boolean {
	if (theme === 'dark') return true;
	if (theme === 'light') return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readTheme(): ChurchToolsTheme {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'dark' || stored === 'light' || stored === 'system') {
		return stored;
	}
	return 'system';
}
