# Gemini Project Instructions

## Changelog Management
- All significant changes should be recorded in `src/changelog.json`.
- The changelog is visible to users in the UI via the History button in the `FloatingHeader`.
- When completing a task, check if a new entry should be added to the changelog.
- The `src/changelog.json` follows this structure:
```json
{
  "versions": [
    {
      "version": "X.Y.Z",
      "date": "YYYY-MM-DD",
      "changes": [
        "Description of change 1",
        "Description of change 2"
      ]
    }
  ]
}
```
- If you are making multiple changes, group them under a single version entry for the current date.
- If a version for today already exists, append your changes to its `changes` array.
- Increment the version number according to semantic versioning principles.

## Development Standards
- Use `bun` for package management.
- Adhere to the existing project structure and styling (Tailwind CSS, React, TypeScript).
- Prefer Server Components where possible (though this project seems to be a client-side SPA).
