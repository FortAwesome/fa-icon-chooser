# API Change Analysis — `fa-icon-chooser` (feature: Kit Subset-Aware Search & Showcase)

This document summarizes the changes this feature introduces to how clients and
callers of the `fa-icon-chooser` component use it, relative to `main`. It covers
the public custom-element API (props/attributes, events, slots), the `handleQuery`
contract, and observable runtime behavior.

## Headline: no breaking changes to the component's declared surface

The set of `@Prop`s (attributes), `@Event`s, and named slots is **identical** to
`main`. Concretely:

- **Props/attributes** — same seven, unchanged: `_assetsBaseUrl`, `getUrlText`,
  `handleQuery`, `includeFamilyStyle`, `kitToken`, `searchInputPlaceholder`,
  `version`. None added, removed, renamed, or retyped.
- **Events** — unchanged.
- **Slot names** — same set; none added or removed.
- **`handleQuery` type signature** — byte-identical on both branches:
  `(document: string, variables?: object, options?: object) => Promise<any>`.
  The optional third `options` argument already existed in the type on `main`;
  TypeScript consumers see no compile-time change.

An existing embedder that upgrades will not hit type errors or missing-prop errors.

## The real changes are in the `handleQuery` contract and runtime behavior

These are the things a caller's implementation actually needs to be aware of, even
though the signatures did not move.

### 1. `handleQuery` now uses (and asks callers to honor) the `options` argument — additive, backward-compatible

In kit mode the component now calls `handleQuery(document, variables, { cache, cacheKey })`:

- Cacheable kit requests pass `{ cache: true, cacheKey }`, where `cacheKey` is a
  self-contained identity hash (query document + variables + kit revision +
  showcase cache key).
- A small kit-identity **probe** runs first with `{ cache: false }`.

Callers that ignore `options` continue to work correctly — they just cache less or
not at all (explicitly documented). **Not breaking.** To benefit, an implementer
should use `cacheKey` as its cache key and must honor `cache: false` (never serve
or store those responses from cache).

### 2. Kit-mode GraphQL documents changed — the most consequential caller-facing change (soft-breaking, backend-dependent)

Previously, kit-mode search hit the top-level `search(version, query)` field — the
same query used in version mode. Now kit mode queries kit-subset-aware fields:
`Kit.searchKit`, `Kit.showcaseIcons`, `Kit.kitRevision`, `Kit.showcaseCacheKey`.

- If a caller's `handleQuery` transparently proxies to the current
  `api.fontawesome.com` GraphQL API, this is invisible.
- If a caller pins to / mocks / whitelists an older schema that lacks these `Kit`
  fields, **kit mode will break.** Anyone with a fixture-based or query-allowlisting
  `handleQuery` must update it.

### 3. More and different requests in kit mode — behavioral; watch rate-limiting/logging

Kit mode now issues an extra un-cached revision-probe query plus per-family-style
showcase queries. Callers that count, rate-limit, log, or assert on request volume
inside `handleQuery` will see different traffic than before.

### 4. Kit search is now genuinely subset-aware — behavioral result change

Previously kit search returned matches from the full catalog for the version; now
it returns only the kit's own subset (plus the kit's custom icon uploads). This is
the feature itself — result sets legitimately differ from `main`.

### 5. Slot default copy changed for kit mode — only matters if you do *not* override

Four slots render new kit-specific default text when in kit mode: `searching-free`,
`searching-pro`, `start-view-heading`, `start-view-detail` (they now name the
kit/token and link to fontawesome.com/kits). Slot *names* are unchanged, so any
embedder already supplying these slots is unaffected. Only embedders relying on the
previous default text will see different copy.

## Additive TypeScript exports (internal-package consumers only)

`utils.ts` adds exported types/helpers for the new GraphQL shapes: `IconVariant`,
`IconWithVariants`, `SearchKitIconUpload`, `SearchKitIcon`, `SearchKitResult`,
`IconVariantsPaginated`, `FamilyStyleSelector`, plus helpers like `computeCacheKey`,
`kitRevisionFromResponse`, `showcaseCacheKeyFromResponse`. Purely additive; relevant
only to code importing package internals, not to the custom-element API.

## Bottom line for embedders

| Change | Type | Action needed |
|---|---|---|
| Props / events / slot names | none | none |
| `handleQuery` type | none | none |
| `handleQuery` `options` (`cache`/`cacheKey`) | additive | optional — honor it to gain caching |
| Kit-mode now uses `Kit.searchKit`/`showcaseIcons`/`kitRevision`/`showcaseCacheKey` | soft-breaking | update only if your GraphQL layer restricts/mocks the schema |
| Extra kit-mode requests | behavioral | review rate-limit/logging assumptions |
| Kit search returns subset only | behavioral | expected (the feature) |
| Kit-mode slot default text | cosmetic | none if you override those slots |

The only way an upgrade breaks a caller is at the **GraphQL transport layer**
(point 2) or in **test/monitoring code that asserts on request shape/count**
(point 3) — not through the component's declared TypeScript/attribute/event/slot API.
