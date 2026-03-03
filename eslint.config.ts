import js from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["build/**", "node_modules/**"],
	},
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		plugins: {
			react,
			"react-hooks": reactHooks,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			"no-console": "error",
			"@typescript-eslint/consistent-type-imports": "error",
		},
		settings: {
			react: {
				version: "detect",
			},
		},
	},
	perfectionist.configs["recommended-natural"],
);
