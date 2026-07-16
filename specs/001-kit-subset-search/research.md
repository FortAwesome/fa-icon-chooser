# Phase 0 Research: Kit Subset-Aware Search & Showcase

**Feature**: `001-kit-subset-search` | **Date**: 2026-06-26

This document resolves the technical unknowns behind the plan. All GraphQL facts below were verified by live introspection of `https://api.fontawesome.com/graphql` on 2026-06-26 (POST with an introspection query). Three fields — `Kit.showcaseIcons`, `Kit.showcaseCacheKey`, and `Kit.familyStylesPaginated` — are not yet in the production schema but are **available in staging** and are a release prerequisite (this component does not ship until they reach production). The implementation therefore **assumes they are present and includes no fallback** for their absence; it is built and tested against their agreed shape via fixtures. The `Kit.searchKit` shape below was re-verified on 2026-06-26 and corrected — an earlier draft assumed an `IconVariantsPaginated`/`iconVariants` return that the server rejects (see D2).

---

## D1. Kit-mode vs. legacy mode switch

- **Decision**: Branch on `this.kitToken`. When present (kit mode), use `Kit.searchKit` for search and `Kit.showcaseIcons` for the opening showcase. When absent, keep the existing legacy `search` field and the static `defaultIconsSearchResult.json` showcase, unchanged.
- **Rationale**: Matches the existing convention — the component already gates kit behavior on `this.kitToken` (e.g. `preload()` calls `loadKitMetadata()` only when `kitToken` is set, `fa-icon-chooser.tsx:432`). FR-002/FR-003 require non-kit mode to be untouched.
- **Alternatives considered**: A new boolean prop to force kit mode — rejected as redundant and an unnecessary public-API addition (violates "no breaking/needless API change"; `kit-token` already implies it).

## D2. Search field — `Kit.searchKit`

- **Decision**: Replace the legacy query with, in kit mode (corrected to the live shape):
  ```graphql
  query SearchKit($token: String!, $query: String!, $searchMode: KitSearchMode!) {
    me { kit(token: $token) {
      searchKit(query: $query, searchMode: $searchMode, page: 1, pageSize: 100) {
        page pageSize totalIconCount totalPageCount
        icons {
          __typename
          ... on IconWithVariants {
            name label unicodeHex
            variants { name unicodeHex familyStyle { family style prefix } }
          }
          ... on IconUpload { name unicodeHex width height pathData }
        }
      }
    } }
  }
  ```
  `pageSize: 100` matches the legacy `search(... first: 100)` page size (`fa-icon-chooser.tsx:540`). One page only; no continued pagination.
- **Earlier-draft error (fixed)**: the prior contract selected `totalIconVariantCount` and `iconVariants` on `SearchKitResult`; the server rejects both ("Cannot query field … on type \"SearchKitResult\""). Re-introspection gave the correct shape below.
- **Verified schema facts** (introspection 2026-06-26):
  - `Kit.searchKit` args: `query: String!`, `searchMode: KitSearchMode!`, `page: Int`, `pageSize: Int`. **No `version` arg** — the kit scopes the search, so the legacy `version` variable is dropped in kit mode.
  - `KitSearchMode` enum values: `OFFICIAL`, `CUSTOM`.
  - Returns `SearchKitResult { icons: [SearchKitIcon!]!, page: Int!, pageSize: Int!, totalIconCount: Int!, totalPageCount: Int! }` — NOT `IconVariantsPaginated`. The list field is `icons` and the count field is `totalIconCount`.
  - `SearchKitIcon` is a **union**: `IconWithVariants | IconUpload`.
    - `IconWithVariants { name, label, unicodeHex, unicodeInt, variants: [IconVariant!]! }` — returned for OFFICIAL searches.
    - `IconUpload { name, unicodeHex, unicodeInt, version, width, height, pathData, html, iconDefinition }` — returned for CUSTOM searches.
  - `IconVariant { name: String!, familyStyle: FamilyStyle!, svg: Svg, unicodeHex: String!, unicodeInt: Int! }`.
  - `FamilyStyle { family, style, prefix, shorthand, visualTags }`.
- **Rationale**: `searchKit` is the kit-subset-aware analogue of `search`. Because `icons` is a union, the selection uses inline fragments + `__typename`. For OFFICIAL results, each `variant.familyStyle.prefix` + `icon.name` maps onto the component's internal `{ iconName, prefix }` model (one `{iconName,prefix}` per variant), so the existing `filteredIcons()` (filter by selected prefix) continues to work. For CUSTOM results, `IconUpload.name` is resolved to the kit's already-loaded `IconUploadLookup`s for rendering (see D3/D6).
- **Alternatives considered**: Using top-level `search` and filtering client-side against the subset — rejected: the client does not know the subset, and `searchKit` is purpose-built and authoritative.

## D3. `searchMode` selection (OFFICIAL vs. CUSTOM)

- **Decision**: Derive `searchMode` from the currently selected family-style's prefix: `CUSTOM` when the selected prefix is `fak` or `fakd`; `OFFICIAL` otherwise. (`getSelectedPrefix()` already returns the selected prefix, `fa-icon-chooser.tsx:241`.)
- **Rendering nuance for CUSTOM**: Custom icons (`fak`/`fakd`) are rendered from the kit's **uploaded** path data (`iconUploadsAsIconUploadLookups()`, which carries `iconUpload.pathData`), not from the CDN. So for a `CUSTOM` search the component will use `searchKit(... CUSTOM)` to determine which custom icons match the query within the kit, then resolve those matches to the already-loaded `IconUploadLookup`s for rendering. This honors the explicit instruction to use `searchMode: CUSTOM` while preserving correct custom-icon rendering. (The existing local name-filter over `iconUploads` at `fa-icon-chooser.tsx:558` remains the rendering source; `searchKit CUSTOM` is the authoritative match set.)
- **Rationale**: Directly implements FR-003 and the feature request ("when searching for `fak`/`fakd` icons, searchMode should be CUSTOM; otherwise OFFICIAL").
- **Alternatives considered**: Always `OFFICIAL` and treating custom purely client-side — rejected: contradicts the explicit `CUSTOM` instruction and would not reflect server-side custom search semantics.

## D4. Opening showcase — `Kit.showcaseIcons` (per family-style, lazy)

- **Decision**: In kit mode, replace `buildDefaultIconsSearchResult(...)` as the opening data source with a per-family-style query:
  ```graphql
  query ShowcaseIcons($token: String!, $selector: FamilyStyleSelector!) {
    me { kit(token: $token) {
      showcaseIcons(selector: $selector, page: 1, pageSize: 80, limitPerFamilyStyle: 80) {
        page pageSize totalIconVariantCount
        iconVariants { name familyStyle { family style prefix } unicodeHex }
      }
    } }
  }
  ```
  - **Selector**: use `{ prefix: "<prefix>" }` of the target family-style (the `family_style_selector` `oneOf` input accepts `pair`/`shorthand`/`prefix`; `prefix` is the most direct since the component already tracks prefixes).
  - **Lazy loading (per Clarification Q1)**: on open, fetch only the currently selected family-style's showcase; fetch each other family-style's showcase the first time that style is selected. Cache fetched showcases in-memory per prefix for the component's lifetime.
  - **Capacity**: `pageSize: 80` and `limitPerFamilyStyle: 80`, one page, per FR-006.
- **Schema status**: `Kit.showcaseIcons` is not yet in production as of 2026-06-26 but is available in staging and is a release prerequisite. It is implemented against the agreed definition provided in the feature request (returns `IconVariantsPaginated`-style `iconVariants`); the component assumes it is present (no fallback, per D8).
- **Custom family-styles (per Clarification Q2)**: `showcaseIcons` returns **official** variants only. For `fak`/`fakd`, do **not** call `showcaseIcons`; populate the opening view from the kit's already-loaded uploaded custom icons (`iconUploadsAsIconUploadLookups()`).
- **Rationale**: Implements FR-005/FR-005a/FR-006/FR-007 and the request's "one page of up to 80 showcase icons per family-style."
- **Alternatives considered**: Single unfiltered `showcaseIcons` call across all family-styles on open — rejected: conflicts with the lazy-per-selected-style clarification and would fetch styles the user may never view.

## D5. Caching by kit-provided `showcaseCacheKey`

- **Decision**: Select `showcaseCacheKey` on the kit-metadata query and retain it. For **showcase** requests, call `handleQuery` with `options = { cache: true, cacheKey: "<showcaseCacheKey>" }` — the single server-provided value, used verbatim as the cache identity. Keep the existing kit-metadata call's `{ cache: true }`. Search requests are **not** cached (matching legacy `search`, which passes no cache option). This replaces the earlier approach that selected `kitRevision` and built a `"<token>:<revision>:showcase:<prefix>"` composite client-side; `kitRevision` is no longer selected for caching.
- **Per-family-style disambiguation**: every family-style's showcase request for a kit carries the same `showcaseCacheKey`, so the host combines it with the request `variables` (which carry the family-style `selector`) to avoid cross-style collisions. The component's own in-memory `showcaseIconsByPrefix` map already prevents re-fetching within a session.
- **Rationale**: FR-009/FR-010 require the cache identity to come from the kit so an unchanged kit reuses results and a changed kit refreshes them. The server exposes `Kit.showcaseCacheKey` as that single value; passing it via the `options` object (already an accepted third argument of `handleQuery`) is the backward-compatible way to convey it. Hosts that ignore `cacheKey` still function, preserving Principle II (consumer owns caching). `Kit.showcaseCacheKey` is available in staging and assumed present (release prerequisite); the component reads it directly with no fallback.
- **Alternatives considered**:
  - Keeping the client-built `token:revision:prefix` composite — rejected: the feature request directs using the single server-provided `showcaseCacheKey`, which lets the server own invalidation semantics.
  - Component-side caching — rejected: violates Principle II (consumer owns network/caching) and duplicates the existing `handleQuery`-delegated model.

## D6. Mapping `IconVariant[]` into the component's icon model

- **Decision**: Add pure adapter helpers in `utils.ts` that convert a `searchKit`/`showcaseIcons` response into the component's existing `Array<IconLookup>` shape (`{ iconName, prefix }`), e.g. `iconVariant => ({ iconName: v.name, prefix: v.familyStyle.prefix })`. Feed the result into the existing `this.icons` state so `filteredIcons()` (filter by selected prefix, `fa-icon-chooser.tsx:607`) and rendering are reused unchanged.
- **Rationale**: The legacy path reduces `data.search` (icon + `familyStylesByLicense`) into `{ iconName, prefix }` via `setIcons()` (`fa-icon-chooser.tsx:582`). `IconVariant` already carries the concrete family-style, so the mapping is simpler and one variant → one `{ iconName, prefix }`. Keeping the same internal model avoids touching rendering/selection logic.
- **Alternatives considered**: Re-shaping `IconVariant` responses into the legacy `data.search`/`familyStylesByLicense` structure to reuse `setIcons()` verbatim — rejected: a lossy, awkward round-trip; a dedicated mapper is clearer and directly unit-testable.

## D7. Default selected family-style in kit mode

- **Decision**: Reuse the existing `ensureSelectedFamilyStyleIsValid()` (`fa-icon-chooser.tsx:484`), which keeps the default `classic/solid` when present and otherwise falls back to the first available family-style. Its input is `this.familyStyles`, which in kit mode is now populated from the kit's subset family-styles (see D10) — so the reconciliation already operates only over the kit's subset and satisfies FR-014. Confirm/extend with explicit tests rather than new logic.
- **Rationale**: FR-014 (classic solid if present in the subset, else the first subset family-style) is exactly the existing reconciliation behavior once `this.familyStyles` is the kit's subset list. The correctness now hinges on D10 feeding it the subset, not on new branching in this method.
- **Alternatives considered**: New dedicated default-selection logic — rejected as duplication; the existing method is sufficient once it reads the subset family-styles.

## D10. Family-styles limited to the kit's subset — `Kit.familyStylesPaginated`

- **Decision** *(revised 2026-07-15 — see "Revision" below; the original prefix-only form is kept here for history)*: In kit mode, drive `this.familyStyles` from the kit's OWN subset list, selected on the kit-metadata query as `familyStylesPaginated(page: 1, pageSize: 50) { familyStyles { familyStyle { family style prefix } } }` (verified on staging 2026-06-26: the field is `familyStylesPaginated`, returning `FamilyStyleSubsetPaginated`; each `FamilyStyleSubset` node exposes a `FamilyStyle` at `familyStyle`). Mechanism: `Kit.familyStylesPaginated` yields the subset family-styles directly as `{ family, style, prefix }`; pass them to `updateFamilyStyles(...)`. Add custom-upload styles (`fak`/`fakd`) from `iconUploads` as today. This REPLACES the prior kit-mode family-style population (permits-based filtering + pro/lite/default branches at `fa-icon-chooser.tsx:407-440`) as the source of *which* styles are offered; the `embedSvgPrefixes` (embeddable-SVG) computation is preserved. Only the first page (≤50) is requested; real kits hold far fewer family-styles.

- **Revision (2026-07-15)**: The original decision selected only `prefix` here and resolved it to `{family, style}` by intersecting with the `release.familyStyles` catalog, which stayed on the query as a lookup table. That indirection is now gone: `FamilyStyleSubset.familyStyle` is a full `FamilyStyle` whose `family`, `style`, and `prefix` are all `String!` (confirmed by live introspection of `api.fontawesome.com` on 2026-07-15), so the subset is self-sufficient. The `release.familyStyles` selection was **dropped from the query**; `release { version }` remains (used by `activeVersion()`). Beyond removing a redundant selection and the intersection step, this makes FR-008 structural rather than procedural — the whole-release catalog is no longer in the response at all, so no future edit can accidentally widen the offered styles beyond the kit's subset. The prefix-only form also silently dropped any subset family-style absent from the catalog; the direct selection cannot.
- **`release.familyStyles` role**: NONE — the selection was dropped (see the 2026-07-15 revision below). `release { version }` remains, used by `activeVersion()`.
- **Rationale**: FR-008 requires the chooser to offer only family-styles actually present in the kit's subset. `release.familyStyles` (or permits) reflects what the license/release could offer, which can be broader than the kit's subset; `Kit.familyStylesPaginated` is the authoritative subset list. Driving `this.familyStyles` from the subset also makes D7's default-selection automatically subset-correct.
- **Schema status**: `Kit.familyStylesPaginated` is not yet in production as of 2026-06-26 but is available in staging (alongside `showcaseIcons`/`showcaseCacheKey`) and is a release prerequisite. Verified shape: `familyStylesPaginated(page, pageSize): FamilyStyleSubsetPaginated { familyStyles: [FamilyStyleSubset], page, pageSize, totalFamilyStyleCount, totalPageCount }`, where `FamilyStyleSubset.familyStyle` is a `FamilyStyle!` and `family`/`style`/`prefix` are the selected node fields. The component assumes it is present and does NOT fall back to release/permits-derived styles (per D8).
- **Alternatives considered**:
  - Continue using `release.familyStyles` + `permits` filtering as the *selector* of styles — rejected: it is not subset-accurate and can present family-styles the kit excludes (violates FR-008/SC-009).
  - Selecting `family`/`style` on `Kit.familyStylesPaginated` instead of resolving via the release catalog — originally rejected as unnecessary ("probably we only need the `prefix`"), since the catalog already carried `family`/`style`. **This alternative was ADOPTED on 2026-07-15** (see revision below).

## D8. No fallback for the kit data source (assume the new fields are present)

- **Decision**: In kit mode, source the opening showcase, the available family-styles, and the showcase cache key **exclusively** from the kit data source, with NO fallback path: no degrading to an empty opening state for a missing `showcaseIcons`, and no reverting to `release.familyStyles`/`permits` for family-styles. The supporting fields (`showcaseIcons`, `familyStyles`, `showcaseCacheKey`) are available in staging and are a release prerequisite, so the component assumes they exist.
- **Rationale**: FR-012/SC-008 (revised) — the component ships only after these fields are in production, so designing for their absence adds dead code and divergent behavior. Adapters still parse defensively (an empty/legitimately-empty result set maps to `[]`), but there is no alternate data source. Out-of-subset icons can never appear because there is no library-wide fallback.
- **Alternatives considered**: Keeping the previous graceful-degradation/empty-opening-state and release-derived family-style fallbacks — rejected per the explicit decision that this code does not ship until the fields are live (no fallbacks).

## D9. Testing strategy

- **Decision**:
  - **Spec tests** (`utils.spec.ts`, `fa-icon-chooser.spec.tsx`): union adapter mapping (`searchKit.icons` → `{iconName,prefix}`, official per-variant + custom by name); showcase adapter mapping; `searchMode` selection from selected prefix; `showcaseCacheKey` capture/usage; subset family-style sourcing + default family-style reconciliation over the subset. Mock `handleQuery` to return canned `searchKit`/`showcaseIcons`/`KitMetadata` payloads.
  - **e2e tests** (`fa-icon-chooser.e2e.ts`): kit-mode open shows only subset icons (lazy single fetch); switching family-style triggers that style's showcase fetch once; kit-mode search renders subset results; non-kit mode regression (legacy search + default showcase unchanged).
- **Rationale**: Principle III (test-first, spec + e2e). `handleQuery` is injectable, making both layers straightforward to drive with fixtures.
- **Alternatives considered**: Live API integration tests — rejected: `showcaseIcons` isn't live yet and tests must be deterministic/offline; fixtures model the agreed shape.

## D11. Kit-branded default copy — `slotDefaults` as a generator

- **Decision**: Convert `slotDefaults` (currently a static object in `src/utils/slots.tsx`) into a function `slotDefaults(params = {})` that accepts `{ kitToken, name }` and returns the same shape of default-copy object it returns today. Three entries are computed from the params when `kitToken` is present (kit mode):
  - `searching-pro` / `searching-free` (the search-status line, rendered as `{slot('searching-…')} {version}`): `"You're searching the icons in your <TRUNCATED_NAME> Kit (<kitToken>) set to Font Awesome Version"` — the trailing version number is still appended by the existing render, yielding "…Font Awesome Version 6.x.x".
  - `start-view-heading`: `"Add Icons from Your Font Awesome <TRUNCATED_NAME> Kit"`.
  - `start-view-detail`: `"Search your Kit's icons or browse them by style. Need to add or remove icons? Head to fontawesome.com/kits to update your Kit."`
  When `kitToken` is absent/empty (non-kit mode or a call with no/empty arg), every entry — including those three — returns today's exact copy. `setupSlots(params = {})` forwards the same `{ kitToken, name }` to `slotDefaults(params)`, and is moved to run **after** `preload()` resolves so the loaded `Kit.name`/token are available; the component calls `this.setupSlots({ kitToken: this.kitToken, name: get(this, 'kitMetadata.name') })`.
- **Truncation** (FR-017): a helper `truncateKitName(name, max = 30)` returns `name` unchanged when `name.length <= 30`, else `name.slice(0, 30) + '…'`. A missing/empty name yields an empty string (copy still renders; FR-016 graceful handling).
- **Rationale**: FR-015/FR-016/FR-017/FR-018/FR-019/FR-020. Making `slotDefaults` a pure function of `{ kitToken, name }` keeps the copy logic unit-testable and preserves non-kit copy byte-for-byte (call with `{}`). Both `searching-pro` and `searching-free` get the same kit-mode string so the status line reads correctly regardless of `pro()`; the kit-mode line is the same for Free and Pro because it describes the kit, not the license. Slots remain host-overridable, so consumers can still replace any of this copy.
- **Alternatives considered**: (a) Computing the copy inline in the render/`slot()` method — rejected: scatters copy across the component and is harder to test than a single generator. (b) Keeping `slotDefaults` an object and mutating three keys after load — rejected: mutation-in-place is error-prone and the maintainer explicitly requested the parameterized-function shape. (c) Truncating to 30 chars *including* the ellipsis — rejected: the spec's rule is first 30 characters then an ellipsis affordance (SC-011), so the ellipsis is not counted toward the 30.

---

## Resolved unknowns summary

| # | Unknown | Resolution |
|---|---------|------------|
| D1 | When to use kit vs. legacy | Branch on `kitToken` presence |
| D2 | Kit search field & page size | `Kit.searchKit` → `SearchKitResult { icons (union), totalIconCount }`, `pageSize: 100`, no `version` arg |
| D3 | OFFICIAL vs. CUSTOM | From selected prefix; `fak`/`fakd` → CUSTOM; render custom from uploads |
| D4 | Showcase source & loading | `Kit.showcaseIcons` per family-style, `prefix` selector, 80/page, lazy |
| D5 | Cache identity | `{cache:true, cacheKey:"<showcaseCacheKey>"}` via `handleQuery` options |
| D6 | Result mapping | `utils.ts` adapter: official `variant → {iconName, prefix}`; custom `IconUpload → uploads` |
| D7 | Default family-style | Existing `ensureSelectedFamilyStyleIsValid()`, now fed the kit subset (D10) |
| D8 | Data-source fallback | None — fields available in staging (release prerequisite); assume present, no fallback |
| D9 | Testing | Spec adapters + e2e flows with mocked `handleQuery` |
| D10 | Family-styles limited to subset | Populate from `Kit.familyStylesPaginated(page:1,pageSize:50){familyStyles{familyStyle{family style prefix}}}`; `release.familyStyles` not selected at all (revised 2026-07-15) |
| D11 | Kit-branded copy | `slotDefaults({kitToken,name})` generator computes search-status / start-view heading / detail in kit mode; `setupSlots` runs after `preload()`; name truncated to 30 chars + `…` |

No outstanding `NEEDS CLARIFICATION` items remain.
