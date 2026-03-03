import baseConfig from '@the-unicorns/prettier-config';

export default {
	...baseConfig,
	semi: true,
	trailingComma: 'all',
	singleQuote: true,
	printWidth: 120,
	tabWidth: 4,
	useTabs: true,
	plugins: ['prettier-plugin-tailwindcss'],
};
