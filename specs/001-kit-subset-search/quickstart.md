# Quickstart: Kit Subset-Aware Search & Showcase

**Feature**: `001-kit-subset-search` | **Branch**: `001-kit-subset-search`

A fast orientation for implementing and verifying this feature.

## What changes (and what doesn't)

- **Changes (kit mode only — `kit-token` present):**
  - Search uses `Kit.searchKit` (subset-aware) instead of legacy top-level `search`.
  - Opening showcase uses `Kit.showcaseIcons` per family-style (lazy) instead of `defaultIconsSearchResult.json`.
  - The kit's available family-styles come from `Kit.familyStylesPaginated` (subset, first page ≤50) instead of `release.familyStyles`, so only subset styles are offered.
  - `Kit.showcaseCacheKey` is captured and passed verbatim as the showcase cache key (replaces the old `token:kitRevision` composite).
  - **Kit-branded copy**: the search-status line, start-view heading, and start-view detail are personalized with the kit's `name` (truncated to 30 chars + `…`) and `token`. `slotDefaults` becomes a `slotDefaults({kitToken, name})` generator and `setupSlots({kitToken, name})` runs after `preload()`.
- **Unchanged:**
  - Non-kit (version-only) mode — legacy `search` + static default showcase + today's search-status / start-view copy, byte-for-byte (`slotDefaults({})`).
  - Public API — no new/changed props, events, or callbacks; slots remain host-overridable. React wrapper needs no source change (rebuilt in lockstep).

## Where the work happens

| File | Responsibility |
|------|----------------|
| `packages/fa-icon-chooser/src/utils/utils.ts` | Pure adapters/helpers: `searchKitIconsToIconLookups` (union), `showcaseIconsToIconLookups`, `showcaseCacheKeyFromResponse`, `kitFamilyStylePrefixesFromResponse`, `searchModeForPrefix`, `truncateKitName` (30 chars + `…`). |
| `packages/fa-icon-chooser/src/utils/slots.tsx` | `slotDefaults` → `slotDefaults({kitToken, name})` generator; computes kit-mode `searching-pro`/`searching-free`/`start-view-heading`/`start-view-detail`; returns today's copy for empty/non-kit params. See `contracts/slot-copy.md`. |
| `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx` | Control flow: kit-vs-legacy branching in search + opening view, family-styles from `Kit.familyStylesPaginated` (subset, carrying family/style/prefix directly), lazy showcase fetch + in-memory cache (`showcaseIconsByPrefix`), `showcaseCacheKey` capture, cache-hint options, and `setupSlots({kitToken, name})` moved to run after `preload()`. No fallback for the kit data source (assumed present). |
| `*.spec.ts(x)` / `*.e2e.ts` | New tests (Principle III). |

Key existing anchors (current line numbers, will drift):
- `loadKitMetadata()` ~ `fa-icon-chooser.tsx:281` — add `showcaseCacheKey` + `familyStylesPaginated(page:1,pageSize:50){familyStyles{familyStyle{prefix}}}` to query; populate `this.familyStyles` from the kit subset; capture `showcaseCacheKey`; `name` is already selected — retain and consume it for copy.
- `setupSlots()` ~ `:561` / `componentWillLoad()` ~ `:574` — change `setupSlots` to accept `{kitToken, name}` and move its call to **after** `preload()` resolves (currently invoked at `:587`, before `preload()`); pass `{ kitToken: this.kitToken, name: get(this,'kitMetadata.name') }`.
- `updateQueryResults()` ~ `:532` — branch to `searchKit` in kit mode (union response).
- `preload()/componentWillLoad` ~ `:431/:455` — opening showcase: kit-mode lazy fetch vs. `buildDefaultIconsSearchResult`.
- `onSearchInputChange()` ~ `:630` — empty query returns to kit showcase in kit mode.
- `setIcons()` ~ `:582` / `filteredIcons()` ~ `:607` — reuse the `{ iconName, prefix }` model via the new adapter.
- `ensureSelectedFamilyStyleIsValid()` ~ `:484` — implements FR-014; now reconciles over the kit subset (since `this.familyStyles` is subset-sourced); cover with tests.

## Contracts

- `contracts/search-kit.graphql` — kit search (pageSize 100, searchMode OFFICIAL/CUSTOM).
- `contracts/showcase-icons.graphql` — per-family-style showcase (prefix selector, 80/page; staging, release prerequisite).
- `contracts/kit-metadata.graphql` — existing query + `showcaseCacheKey` + `familyStylesPaginated(page:1,pageSize:50){familyStyles{familyStyle{prefix}}}`; `name` consumed for copy.
- `contracts/handle-query-options.md` — `{ cache, cacheKey }` options contract.
- `contracts/slot-copy.md` — `slotDefaults({kitToken, name})` generator, kit-mode copy strings, and `truncateKitName` truncation rule.

## Manual verification

Use `dev/local.json` (git-ignored) with a real kit token. With `npm start` in `packages/fa-icon-chooser`:

1. **Subset search** — open in kit mode, search a term; confirm results are all in the kit (no out-of-subset icons). (US1 / SC-001)
2. **Opening showcase** — open in kit mode; confirm the opening icons are subset-only and the network shows a single `showcaseIcons` call for the selected family-style. (US2 / SC-002, SC-004)
3. **Lazy load** — switch family-style; confirm exactly one new `showcaseIcons` call fires for that style, and re-selecting a prior style fires none. (Q1)
4. **Custom styles** — for a kit with uploads, select `fak`/`fakd`; confirm the opening view shows uploaded icons (no `showcaseIcons` call) and search returns custom matches. (US3 / SC-007)
5. **Cache by showcaseCacheKey** — reopen the same kit; confirm no duplicate `showcaseIcons` fetch (cache hit keyed by `Kit.showcaseCacheKey`). (US4 / SC-006)
   - Also confirm the offered family-styles match the kit's subset (`Kit.familyStylesPaginated`), and the default-selected style is one the subset contains. (FR-008/FR-014 / SC-009)
6. **No fallback** — confirm the opening view, family-styles, and cache key come solely from the kit data source: no library-wide default-showcase icons and no release/permits-derived styles ever appear in kit mode. (FR-012 / SC-008)
7. **Kit-branded copy** — open in kit mode; confirm the start-view heading reads "Add Icons from Your Font Awesome `<name>` Kit", the start-view detail points to fontawesome.com/kits, and the search-status line reads "You're searching the icons in your `<name>` Kit (`<token>`) set to Font Awesome Version `<version>`". Try a kit whose name is >30 chars and confirm it truncates with `…`. (US5 / SC-010, SC-011)
8. **Non-kit regression** — run version-only mode; confirm legacy search + default showcase **and** the original search-status / start-view heading / start-view detail copy are unchanged. (US1.3 / SC-003)

## Tests to run before merge

```bash
cd packages/fa-icon-chooser
npm test            # Stencil spec + e2e
npm run format.check
```

Per Constitution: spec + e2e green and Prettier clean before merge; both packages version-bumped (MINOR) and released in lockstep with `CHANGELOG.md` updated.
