# Implementation Plan: Kit Subset-Aware Search & Showcase

**Branch**: `001-kit-subset-search` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-kit-subset-search/spec.md`

## Summary

When the `fa-icon-chooser` runs in kit mode (a `kit-token` is supplied), search and the opening showcase must be constrained to the kit's subset instead of the full Font Awesome library. Technically this replaces the two data sources used in kit mode:

- **Search**: route the user's query through the kit's `Kit.searchKit(query, searchMode)` field (one page, `pageSize: 100` to match the legacy `search(first: 100)`) instead of the legacy top-level `search`. `searchMode` is `OFFICIAL` for official family-styles and `CUSTOM` when the selected family-style is a custom upload style (`fak`/`fakd`). `Kit.searchKit` returns `SearchKitResult { icons, page, pageSize, totalIconCount, totalPageCount }` where `icons` is a `SearchKitIcon` union (`IconWithVariants | IconUpload`) — read with inline fragments + `__typename` (verified live 2026-06-26; the earlier `iconVariants`/`totalIconVariantCount` selection was rejected by the server).
- **Family-styles**: in kit mode the chooser's available family-styles are sourced from the kit's own subset list, `Kit.familyStylesPaginated(page: 1, pageSize: 50) { familyStyles { familyStyle { family style prefix } } }`, which carries `{ family, style, prefix }` directly. This replaces the prior `permits`/pro/lite filtering as the selector of styles, so only family-styles in the kit's subset are offered and the default selection lands within the subset. The `release.familyStyles` catalog is **not** selected (revised 2026-07-15); `release { version }` remains for `activeVersion()`.
- **Opening showcase**: replace the static `defaultIconsSearchResult.json` with per-family-style queries against the kit's `Kit.showcaseIcons(selector, pageSize: 80, limitPerFamilyStyle: 80)` field, loaded lazily (only the selected family-style on open; each other style on first selection). `Kit.showcaseCacheKey` is selected on the kit-metadata query and passed verbatim as the cache identity to `handleQuery` with `{ cache: true, cacheKey: showcaseCacheKey }` (replacing the previously planned `kitToken` + `kitRevision` composite).

This iteration (2026-07-02) adds **kit-branded copy**. In kit mode three pieces of default guidance copy identify the kit by name and token: the search-status line ("You're searching the icons in your `<name>` Kit (`<token>`) set to Font Awesome Version"), the start-view heading ("Add Icons from Your Font Awesome `<name>` Kit"), and the start-view detail (pointing to fontawesome.com/kits). To support this:

- `Kit.name` is added to the kit-metadata selection so the kit's human-readable name is available (FR-015). (`name` is already present in `KIT_METADATA_QUERY`; this formalizes it and ensures it is consumed.)
- `slotDefaults` changes from a static object into a generator function `slotDefaults(params?)` that accepts `{ kitToken, name }` and returns the full default-copy object. Called with no args / empty object (non-kit mode), it returns today's copy verbatim (FR-016). The kit name is truncated to 30 characters with a trailing ellipsis when longer (FR-017).
- `setupSlots(params?)` takes the same `{ kitToken, name }` params and passes them through to `slotDefaults`. Because the personalized copy needs the loaded kit name/token, `setupSlots(...)` is invoked **after** `preload()` resolves (currently it runs before), so kit metadata (name) is available when defaults are computed.

Non-kit (version-only) mode is completely unchanged: it keeps using the legacy `search` field, the static default showcase, and today's copy (search-status, start-view heading, start-view detail). The component's public API (props, events, callbacks) does not change, so the React wrapper requires no API changes.

`Kit.showcaseIcons`, `Kit.showcaseCacheKey`, and `Kit.familyStylesPaginated` are available in the staging environment and are a release prerequisite — this component will not ship until they are in production. The implementation therefore assumes these fields are present and includes **no fallback** for their absence (no empty-state degradation, no release/permits-derived family-style fallback), per FR-012. It is built and tested against their agreed shape via fixtures, with final validation against the live fields before release. `Kit.name` is an already-available field and carries no such gating.

## Technical Context

**Language/Version**: TypeScript ~3.x compiled by Stencil (`@stencil/core`); ES2017 target web component.

**Primary Dependencies**: `@stencil/core`, `lodash` (get/set/find/debounce/size), `semver`; Font Awesome SVG/JS runtime loaded at runtime for icon rendering. Data is fetched through the consumer-supplied `handleQuery` callback against the Font Awesome GraphQL API at `api.fontawesome.com`.

**Storage**: N/A in the component. Response caching is delegated to the host application's `handleQuery` implementation; the component supplies a cache hint (`{ cache: true }`) and the kit-provided `Kit.showcaseCacheKey` as the cache key.

**Testing**: Stencil test harness — spec tests (`*.spec.ts`/`*.spec.tsx`, Jest) for logic/adapters and e2e tests (`*.e2e.ts`, Puppeteer) for rendered behavior. Run via `npm test` in `packages/fa-icon-chooser`. Prettier `format.check` must be clean.

**Target Platform**: Any DOM environment (browsers); shipped as two npm packages — core `@fortawesome/fa-icon-chooser` and React wrapper `@fortawesome/fa-icon-chooser-react`.

**Project Type**: Framework-agnostic web component library (Stencil monorepo, core + React wrapper).

**Performance Goals**: Open in kit mode with a single showcase fetch for the default family-style (lazy load others on demand); reuse cached showcase results for an unchanged kit (unchanged `showcaseCacheKey`) with zero additional showcase fetches. Copy generation is synchronous string work with no added network cost.

**Constraints**: No breaking changes to the component's public API (props/events/callbacks) — additive/MINOR only. Non-kit mode behavior must be byte-for-byte unchanged, including the search-status, start-view heading, and start-view detail copy. Must not render any icon outside the kit subset in kit mode. In kit mode the opening showcase, family-styles, and cache key come solely from the kit data source — no fallback to the default showcase or release/permits-derived styles (the supporting fields are a release prerequisite). Changing `slotDefaults` to a function and moving `setupSlots()` after `preload()` are internal refactors that must not alter non-kit copy or slot-override behavior.

**Scale/Scope**: Up to 80 showcase icons per family-style (one page); up to 100 search results per query (one page). Kit name truncated to 30 characters for display. Changes localized to the core component file, its utils, and `src/utils/slots.tsx`; new GraphQL query documents; spec + e2e tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| **I. Framework-Agnostic Web Component Core** | All changes live in the core Stencil component (`packages/fa-icon-chooser/src/...`), including the `slotDefaults` generator and `setupSlots` sequencing; no host-framework assumptions introduced. Data still flows through the `handleQuery` callback. | ✅ Pass |
| **II. Consumer-Owned Data & Authorization** | New GraphQL documents/selections (`searchKit`, `showcaseIcons`, `familyStyles`, `showcaseCacheKey`, `name`) are executed exclusively via the consumer's `handleQuery` callback. No credentials, endpoints, or auth are embedded; `kits_read` authorization remains the host's responsibility. The kit name/token used in copy come from data the host already authorizes. | ✅ Pass |
| **III. Test-First Quality (NON-NEGOTIABLE)** | Plan adds spec tests for the new response→icons adapters, search-mode selection, default family-style selection, lazy/cache behavior, the `slotDefaults(params)` generator (kit vs non-kit copy, truncation, empty/missing name/token), and `setupSlots`-after-`preload` sequencing; e2e tests for kit-mode search, opening showcase, and the rendered kit-branded copy. `format.check` kept clean. | ✅ Pass |
| **IV. Cross-Framework Parity** | No change to public props/events/callbacks (the `kit-token` prop and `handleQuery` signature already exist; the third `options` argument is already part of the type). Copy defaults remain overridable via the existing named slots. React wrapper needs no API change; it is rebuilt/released in lockstep per Principle V. | ✅ Pass |
| **V. Semantic Versioning & Coordinated Releases** | Additive, backward-compatible behavior (kit-mode copy only; non-kit copy unchanged) → MINOR bump for both packages, released together, `CHANGELOG.md` updated. | ✅ Pass |

**Result**: PASS — no violations. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-kit-subset-search/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (+ Clarifications)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── kit-metadata.graphql
│   ├── search-kit.graphql
│   ├── showcase-icons.graphql
│   ├── slot-copy.md
│   └── handle-query-options.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/fa-icon-chooser/                      # Core web component (primary changes)
├── src/
│   ├── components/fa-icon-chooser/
│   │   ├── fa-icon-chooser.tsx                 # Kit-mode search routing, lazy showcase loading,
│   │   │                                       #   searchMode selection, default family-style, caching;
│   │   │                                       #   setupSlots({kitToken, name}) called AFTER preload()
│   │   ├── fa-icon-chooser.spec.ts(x)          # Spec tests (logic/adapters/slots) [+ new cases]
│   │   └── fa-icon-chooser.e2e.ts              # e2e tests (rendered behavior + kit-branded copy) [+ new cases]
│   └── utils/
│       ├── slots.tsx                           # slotDefaults becomes slotDefaults({kitToken, name}) generator;
│       │                                       #   kit-mode search-status/start-view heading/detail copy + truncation
│       ├── utils.ts                            # New adapters: IconVariant[] -> IconLookup[],
│       │                                       #   showcase/search response mappers, cache-key helper,
│       │                                       #   kit-name truncation helper (30 chars + ellipsis)
│       ├── utils.spec.ts                        # Spec tests for adapters + truncation [new/extended]
│       └── defaultIconsSearchResult.json        # Unchanged (still used in non-kit mode)

packages/fa-icon-chooser-react/                # React wrapper (rebuilt in lockstep; no API change)
```

**Structure Decision**: Existing Stencil monorepo. The feature is implemented in the core package only — primarily `src/components/fa-icon-chooser/fa-icon-chooser.tsx` for control flow (when to use kit queries vs. legacy, lazy showcase fetching, search-mode selection, cache hinting, and calling `setupSlots({kitToken, name})` after `preload()`), `src/utils/slots.tsx` for the `slotDefaults(params)` copy generator, and `src/utils/utils.ts` for pure, unit-testable adapter/helper functions (mapping GraphQL results into `{ iconName, prefix }`, building the cache key, and truncating the kit name). The React wrapper is rebuilt and version-bumped in lockstep but needs no source changes because the public API is unchanged.

## Complexity Tracking

> No constitution violations — section intentionally empty.
