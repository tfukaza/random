# Working agreements

## Release notes

When making a major product update, add a concise, user-facing entry to `src/lib/releases.js` as part of the same change. Keep the newest release first, use the version and release date, and describe observable additions or fixes in plain language. Do not include internal refactors unless they change the user experience.

Update the version in `package.json` and `package-lock.json` at the same time. Use semantic versioning: patch for fixes, minor for backward-compatible features, and major for breaking changes.
