import { churchtoolsClient } from '@churchtools/churchtools-client';

interface TranslationKey {
	key: string;
	module: string;
	translations: Partial<Record<string, { translation: string }>>;
}

/** Build the frontend's module dictionaries from the dev installation's CORS-enabled API. */
export async function loadDevTranslations(): Promise<void> {
	const [user, config, keys] = await Promise.all([
		churchtoolsClient.get<{ id: number }>('/whoami'),
		churchtoolsClient.get<{ site_language: string }>('/config'),
		churchtoolsClient.get<TranslationKey[]>('/translations'),
	]);
	const settings = await churchtoolsClient.get<{ attribute: string; value: unknown }[]>(
		`/persons/${String(user.id)}/settings/churchcore`,
	);
	const preference = settings.find((setting) => setting.attribute === 'language')?.value;
	const language = typeof preference === 'string' && preference ? preference : config.site_language;
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
}
