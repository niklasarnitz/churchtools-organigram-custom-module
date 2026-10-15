type TranslationArguments = Record<string, number | string>;

declare global {
	var i18n: ((key: string, args: false | TranslationArguments, errorMarker?: false) => string) | undefined;
	var lang: Record<string, Record<string, string>> | undefined;
	var masterData: undefined | { modulename?: string };
}

/** Translate ChurchTools keys while leaving user-entered names unchanged. */
export function t(key: string, args?: TranslationArguments): string {
	if (globalThis.i18n) return globalThis.i18n(key, args ?? false, false);

	const tables = globalThis.lang ?? {};
	const modules = new Set(['churchcore', globalThis.masterData?.modulename ?? '', ...Object.keys(tables)]);
	let translation = key;
	for (const module of modules) {
		if (Object.hasOwn(tables[module] ?? {}, key) && tables[module][key]) {
			translation = tables[module][key];
			break;
		}
	}

	if (args) {
		const forms = translation.split('|');
		if (Object.hasOwn(args, 'count')) {
			if (forms.length === 2) translation = forms[args.count === 1 ? 0 : 1];
			if (forms.length === 3) translation = forms[args.count === 0 ? 0 : args.count === 1 ? 1 : 2];
		}
		translation = translation.replace(/\{([^{}]+)\}/g, (placeholder: string, name: string) =>
			Object.hasOwn(args, name) ? String(args[name]) : placeholder,
		);
	}
	return translation.replace(/\\n/g, '<br/>');
}

/** Prefer the API's translated master-data name, as the ChurchTools frontend does. */
export function translateNames<T extends { name: string; nameTranslated?: string }>(entries: T[]): T[] {
	return entries.map((entry) => ({
		...entry,
		name: entry.nameTranslated?.length ? entry.nameTranslated : t(entry.name),
	}));
}
