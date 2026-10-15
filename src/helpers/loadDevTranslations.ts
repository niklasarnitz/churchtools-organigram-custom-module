import { churchtoolsClient } from '@churchtools/churchtools-client';

interface TranslationKey {
	key: string;
	module: string;
	translations: Partial<Record<string, { translation: string }>>;
}

/** Build the frontend's module dictionaries from the dev installation's CORS-enabled API. */
export async function loadDevTranslations(): Promise<void> {
	const [user, config] = await Promise.all([
		churchtoolsClient.get<{ id: number }>('/whoami'),
		churchtoolsClient.get<{ site_language: string }>('/config'),
	]);
	const settings = await churchtoolsClient.get<{ attribute: string; value: unknown }[]>(
		`/persons/${String(user.id)}/settings/churchcore`,
	);
	const preference = settings.find((setting) => setting.attribute === 'language')?.value;
	const language = typeof preference === 'string' && preference ? preference : config.site_language;
	const cacheKey = `organigram-translations-v1:${churchtoolsClient.getBaseUrl() ?? ''}:${String(user.id)}:${language}`;
	try {
		const cached = JSON.parse(sessionStorage.getItem(cacheKey) ?? 'null') as null | {
			dictionaries: Record<string, Record<string, string>>;
			expiresAt: number;
		};
		if (cached && cached.expiresAt > Date.now()) {
			globalThis.lang = cached.dictionaries;
			return;
		}
	} catch {
		// Storage can be disabled or full. Translation loading must still work.
	}
	const keys = await churchtoolsClient.get<TranslationKey[]>('/translations');
	const dictionaries: Record<string, Record<string, string>> = {};
	for (const entry of keys) {
		// ChurchTools fills missing non-German/non-English translations from English.
		const translation =
			entry.translations[language] ??
			(language !== 'de' && language !== 'en' ? entry.translations.en : undefined);
		if (translation) {
			(dictionaries[entry.module] ??= {})[entry.key] = translation.translation;
		}
	}
	globalThis.lang = dictionaries;
	try {
		sessionStorage.setItem(cacheKey, JSON.stringify({ dictionaries, expiresAt: Date.now() + 15 * 60 * 1000 }));
	} catch {
		// Session caching is an optional development-only optimization.
	}
}
