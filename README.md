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
  translations and avoids the static translation files' cross-origin restrictions. The resulting
  dictionaries are cached in session storage for 15 minutes, separately per installation, user
  and language; reloading no longer downloads all translations again.
- **Production:** The module uses the host frontend's existing `window.i18n` translator and
  `window.lang` dictionaries. It makes no additional translation requests.

No translation dictionaries or development translation downloader are shipped in the production bundle.

### Group cache and large installations

When available, the module uses the host frontend's `window.vComps.queryClient` directly,
without persisting or changing its global cache settings. It uses the group module's
`['groups', 'filter', 'ids', filter]` lists and `['groups', 'single', id, 'raw']` entities.
Only missing, invalidated or expired groups are downloaded; existing include caches (roles,
tags, etc.) remain untouched. Translations and organigram-specific fields are applied only
to the displayed data, not the shared entities. Host group-list invalidations also refresh
the organigram. A complete filtered ID list is always required: one cached page is not
mistaken for the whole installation.

Group, membership and person downloads use batches of at most 100 IDs and at most four
concurrent requests per download, avoiding both sequential page waterfalls and unbounded
request bursts. Persons are requested only after the initial role exclusions have been applied.

The diagram and all export formats share one layout calculation. PDF libraries are loaded
only when exporting, rather than on startup.

The host cache is in-memory and cannot survive a full ChurchTools page navigation. In local
development, or on older frontends without the exposed client, the module falls back to its
own session cache. No ChurchTools frontend packages are bundled to achieve cache sharing.

## Building for production

To build the project for production, run the following command:

```bash
bun run build:module
```

You can then install the custom module in ChurchTools by uploading the `.zip` file.

**Important: The shorty of the custom module must be `organigram`.**
