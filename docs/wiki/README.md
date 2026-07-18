# Wiki staging (not a wiki page)

Markdown here is published to https://github.com/jondmarien/rngdle-unlocked/wiki via:

```bash
pnpm wiki:publish
```

Do not edit pages only on GitHub — change files here and re-publish.

## First-time bootstrap

GitHub does not create `*.wiki.git` until **one** page exists in the UI:

1. Open https://github.com/jondmarien/rngdle-unlocked/wiki (signed in as a repo admin).
2. Create the initial **Home** page (any short body is fine; publish overwrites it).
3. Run `pnpm wiki:publish`.
