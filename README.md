# ChurchTools Organigram Custom Module

This project is a custom module for ChurchTools. It allows you to create an organigram of your church.

## Installing

You can just download the latest release and install it in ChurchTools.

**Important: The shorty of the custom module must be `organigram`.** But you may change the display name of the module.

## Running Locally in a dev environment

To run churchtools-organigram-custom-module locally, you need to create a .env file from the .env.example file and fill in the required values.

Then you can run the following commands:

```bash
bun install
bun run dev
```

The project will then be reachable via `http://localhost:5173`.
(Styling can be a bit broken, because ChurchTools' CSS is not loaded locally.)

### ChurchTools translations

Group names containing ChurchTools translation keys are translated throughout the diagram,
filters, search and exports. Group types, roles, categories, age groups and campuses also use
translated names, preferring the API's `nameTranslated` value and otherwise translating `name`.
Ordinary names without a matching translation remain unchanged. Cached API data is not modified.

Use `t(key, { name: 'value' })` from `src/helpers/churchToolsTranslations.ts` for other
ChurchTools translations (including placeholders and count-based plurals).

- **Development:** After login, the module downloads translations from the configured
  installation's `/translations` API and builds the frontend's module dictionaries for the
  logged-in user's language (or the installation's default language). This includes customized
  translations and avoids the static translation files' cross-origin restrictions.
- **Production:** The module uses the host frontend's existing `window.i18n` translator and
  `window.lang` dictionaries. It makes no additional translation requests.

No translation dictionaries or development translation downloader are shipped in the production bundle.

## Building for production

To build the project for production, run the following command:

```bash
bun run build:module
```

You can then install the custom module in ChurchTools by uploading the `.zip` file.

**Important: The shorty of the custom module must be `organigram`.**
