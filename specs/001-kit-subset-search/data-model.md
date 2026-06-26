# Phase 1 Data Model: Kit Subset-Aware Search & Showcase

**Feature**: `001-kit-subset-search` | **Date**: 2026-06-26

This feature introduces no persisted storage. The "data model" here is (a) the GraphQL response shapes consumed in kit mode and (b) the component's existing in-memory icon model they are adapted into. Existing TypeScript interfaces live in `packages/fa-icon-chooser/src/utils/utils.ts`.

## Existing internal entities (reused, unchanged)

### IconLookup
The atomic icon reference rendered by the component.
```ts
interface IconLookup { prefix: string; iconName: string; }
```
- `this.icons: Array<IconLookup | IconUploadLookup>` is the single source of truth for what may be displayed.
- `filteredIcons()` filters `this.icons` by the selected family-style's prefix.

### FamilyStyle
```ts
interface FamilyStyle { family: string; style: string; prefix: string; }
```
- In kit mode the kit's family-styles are derived in `loadKitMetadata()` solely from `Kit.familyStylesPaginated` (the kit's own subset list, first page ≤50), whose `familyStyle` node is a full `FamilyStyle` carrying `{ family, style, prefix }` directly; then custom-upload styles (`fak`, `fakd`) inferred from `iconUploads` are added. This supersedes the prior `permits`/pro/lite/default derivation as the *selector* of styles, so only family-styles in the kit's subset are offered (FR-008). The `release.familyStyles` catalog is no longer selected at all — the subset is self-sufficient, which removes any structural possibility of a whole-release style leaking into the chooser.

### IconUpload / IconUploadLookup
```ts
type IconUpload = { name: string; unicode: number; version: number; width: string; height: string; pathData: string; };
interface IconUploadLookup extends IconLookup { iconUpload: IconUpload; }
```
- Custom icons (`fak`/`fakd`) render from `IconUpload.pathData`. This is the rendering source for custom search results and the custom-style opening view.

## GraphQL response entities (kit mode — new consumption)

### SearchKitResult (return type of `searchKit`) — verified live shape (introspection 2026-06-26)
```graphql
type SearchKitResult {
  icons: [SearchKitIcon!]!      # union list — NOT `iconVariants`
  page: Int!
  pageSize: Int!
  totalIconCount: Int!          # NOT `totalIconVariantCount`
  totalPageCount: Int!
}

union SearchKitIcon = IconWithVariants | IconUpload

type IconWithVariants {         # OFFICIAL results
  name: String!                 # icon name (e.g. "arrow-right")
  label: String!
  unicodeHex: String!
  unicodeInt: Int!
  variants: [IconVariant!]!     # one per concrete family-style
}

type IconVariant {
  name: String!
  familyStyle: FamilyStyle!     # { family, style, prefix, shorthand, visualTags }
  svg: Svg                      # optional; gated by SVG auth scopes
  unicodeHex: String!
  unicodeInt: Int!
}

type IconUpload {               # CUSTOM results (also the Kit.iconUploads element)
  name: String!
  unicodeHex: String!
  unicodeInt: Int!
  version: Int!
  width: String!
  height: String!
  pathData: [String!]!
  html: String!
  iconDefinition: Json!
}
```
> The earlier draft assumed an `IconVariantsPaginated { iconVariants, totalIconVariantCount }` return; the live server rejects those field names. `icons` is a **union** and must be read with inline fragments + `__typename`.

**Adapter rules** → internal `IconLookup`:
```
OFFICIAL (IconWithVariants): for each variant ->
  { iconName: icon.name, prefix: variant.familyStyle.prefix }
CUSTOM   (IconUpload):       { iconName: icon.name } resolved to the kit's
  already-loaded IconUploadLookup for rendering (prefix = selected fak/fakd)
```
- Only `icons` is consumed for rendering; pagination counts are available but the feature reads a single page (search: 100; showcase: 80).
- `showcaseIcons` (available in staging; release prerequisite) is built against its agreed shape (official `iconVariants`); if it mirrors this `SearchKitResult` union when promoted to production, reconcile then.

### Kit (fields newly selected)
```graphql
type Kit {
  name: String                               # NEW selection — kit's human-readable name, used in kit-mode copy (FR-015)
  showcaseCacheKey: String!                  # NEW selection — single showcase cache identity (staging; release prerequisite)
  familyStylesPaginated(page: Int, pageSize: Int): FamilyStyleSubsetPaginated!   # NEW selection — kit's SUBSET family-styles (staging; release prerequisite)
  searchKit(query: String!, searchMode: KitSearchMode!, page: Int, pageSize: Int): SearchKitResult!
  showcaseIcons(selector: FamilyStyleSelector, page: Int, pageSize: Int, limitPerFamilyStyle: Int): IconVariantsPaginated!  # staging; release prerequisite
  # existing: kitRevision, version, release { version }, iconUploads { ... }   # release.familyStyles selection REMOVED (subset carries family/style)
}
type FamilyStyleSubsetPaginated { familyStyles: [FamilyStyleSubset!]!  page: Int!  pageSize: Int!  totalFamilyStyleCount: Int!  totalPageCount: Int! }
type FamilyStyleSubset { familyStyle: FamilyStyle!  iconVariantsPaginated: IconVariantsPaginated  only: Boolean }   # the prefix is at familyStyle.prefix
enum KitSearchMode { OFFICIAL CUSTOM }
input FamilyStyleSelector { pair: FamilyStylePair  shorthand: String  prefix: String }  # @oneOf — exactly one
```
- `kitRevision` is no longer selected for caching; `showcaseCacheKey` is the cache identity.
- The kit's subset family-styles are requested as `familyStylesPaginated(page: 1, pageSize: 50) { familyStyles { familyStyle { family style prefix } } }` (first page only). Verified on staging 2026-06-26: the field is `familyStylesPaginated` (NOT `familyStyles`). Each node's `familyStyle` is a full `FamilyStyle`, so `family`/`style`/`prefix` (all `String!`) come straight from it — the `release.familyStyles` catalog is not selected and plays no part in family-style derivation.

## New helper/adapter functions (to add in `utils.ts`)

| Function | Signature (conceptual) | Purpose |
|----------|------------------------|---------|
| `searchKitIconsToIconLookups` | `(response) => Array<IconLookup>` | Map `data.me.kit.searchKit.icons` (union) to `{ iconName, prefix }`: for `IconWithVariants`, one entry per `variant` using `variant.familyStyle.prefix`; for `IconUpload`, one entry by `name`. Maps a legitimately-empty result to `[]`. |
| `showcaseIconsToIconLookups` | `(response) => Array<IconLookup>` | Map `data.me.kit.showcaseIcons.iconVariants` to `{ iconName, prefix }`. Maps a legitimately-empty result to `[]`. |
| `showcaseCacheKeyFromResponse` | `(response) => string \| undefined` | Read `data.me.kit.showcaseCacheKey` from the kit-metadata response. |
| `kitFamilyStylesFromResponse` | `(response) => FamilyStyle[]` | Read `data.me.kit.familyStylesPaginated.familyStyles[].familyStyle` (the kit's subset family-styles, each carrying `family`/`style`/`prefix`). Nodes missing any of the three are skipped. |
| `searchModeForPrefix` | `(prefix) => 'OFFICIAL' \| 'CUSTOM'` | `fak`/`fakd` → `CUSTOM`, else `OFFICIAL`. |
| `truncateKitName` | `(name, max = 30) => string` | Kit name for display in copy: returns `name` unchanged when `name.length <= 30`; otherwise `name.slice(0, 30) + '…'`. Missing/empty name → `''`. (FR-017/SC-011) |

## Slot-copy generator (in `src/utils/slots.tsx`)

`slotDefaults` changes from a static object to a generator: `slotDefaults(params = {}) => { [slotName]: content }`, where `params` is `{ kitToken?: string; name?: string }`.

| Slot | Non-kit (no/empty `kitToken`) | Kit mode (`kitToken` present) |
|------|-------------------------------|-------------------------------|
| `searching-pro` | `"You're searching Font Awesome Pro icons in version"` (unchanged) | `"You're searching the icons in your <truncateKitName(name)> Kit (<kitToken>) set to Font Awesome Version"` |
| `searching-free` | `"You're searching Font Awesome Free icons in version"` (unchanged) | same kit-mode string as `searching-pro` |
| `start-view-heading` | current library-wide heading (unchanged) | `"Add Icons from Your Font Awesome <truncateKitName(name)> Kit"` |
| `start-view-detail` | current library-wide detail (unchanged) | `"Search your Kit's icons or browse them by style. Need to add or remove icons? Head to fontawesome.com/kits to update your Kit."` |
| all other slots | unchanged | unchanged (identical to non-kit) |

> The render still appends the resolved version after the `searching-*` slot (`{slot('searching-…')} {version}`), so the kit-mode line reads "…set to Font Awesome Version 6.x.x". `setupSlots(params = {})` forwards the same `{ kitToken, name }` and is invoked after `preload()` so `Kit.name` is loaded.

## New component state (in `fa-icon-chooser.tsx`)

| State | Type | Purpose |
|-------|------|---------|
| `showcaseCacheKey` | `string \| undefined` | Captured during `loadKitMetadata()`; passed verbatim as `options.cacheKey` on showcase requests. |
| `showcaseIconsByPrefix` | `{ [prefix: string]: Array<IconLookup> }` | In-memory per-family-style showcase cache enabling lazy loading (fetch once per prefix per component lifetime). |

> Note: `this.familyStyles` is populated in kit mode from `Kit.familyStylesPaginated` (subset list) rather than `release.familyStyles`. The `KitMetadata` type and GraphQL query gain `name`, `showcaseCacheKey`, and `familyStylesPaginated { familyStyles { familyStyle { family style prefix } } }` selections (and drop the `kitRevision` cache selection and the `release.familyStyles` selection). `name` (`kitMetadata.name`) feeds the kit-branded copy generator. No public prop/event/callback changes.

## Validation & invariants

- **INV-1 (subset)**: every entry placed into `this.icons` in kit mode originates from a `searchKit`/`showcaseIcons` `iconVariant` or from the kit's own `iconUploads` — never from `defaultIconsSearchResult.json`. (FR-011)
- **INV-2 (page caps)**: showcase per family-style ≤ 80; search ≤ 100 results consumed. (FR-004, FR-006)
- **INV-3 (search mode)**: `searchMode === 'CUSTOM'` iff selected prefix ∈ {`fak`,`fakd`}. (FR-003)
- **INV-4 (cache identity)**: the showcase cache key passed to `handleQuery` is the kit-provided `showcaseCacheKey`; it changes iff the kit changes. (FR-009/FR-010)
- **INV-5 (no fallback)**: in kit mode the opening showcase, family-styles, and cache key come solely from the kit data source — never from `defaultIconsSearchResult.json` or `release.familyStyles`/`permits`. The supporting fields are assumed present (release prerequisite); adapters still map a legitimately-empty result to `[]`, but there is no alternate data source. (FR-012, SC-008)
- **INV-6 (non-kit unchanged)**: with no `kitToken`, neither new query is issued; legacy `search` + default showcase are used verbatim. (FR-002)
- **INV-7 (subset family-styles)**: in kit mode every family-style in `this.familyStyles` (and thus every selectable/default style) originates from `Kit.familyStylesPaginated` (subset) or from `iconUploads` (custom) — never from `release.familyStyles`, which is no longer selected. (FR-008/SC-009)
- **INV-8 (copy parity)**: with no `kitToken`, `slotDefaults({})` returns copy byte-for-byte identical to today's for every slot; only kit mode alters `searching-pro`/`searching-free`/`start-view-heading`/`start-view-detail`. `setupSlots(...)` runs after `preload()` so the kit `name`/token are loaded before the copy is computed. (FR-016/FR-018/FR-019/FR-020)

## State transitions (opening view, kit mode)

```
open (kitToken set)
  -> loadKitMetadata(): familyStyles from Kit.familyStylesPaginated (subset) + iconUploads + showcaseCacheKey + name  (FR-008, FR-009, FR-015)
  -> after preload() resolves: setupSlots({kitToken, name}) -> slotDefaults({kitToken, name}) computes kit-branded copy  (FR-016, FR-018/019/020)
  -> ensureSelectedFamilyStyleIsValid(): classic/solid if in subset, else first subset style   (FR-014)
  -> selected style is custom (fak/fakd)?
        yes -> opening icons = filtered iconUploads (no showcase fetch)                    (FR-005a)
        no  -> showcaseIconsByPrefix[prefix] cached?
                 yes -> render cached
                 no  -> handleQuery(showcaseIcons, {prefix}, {cache:true, cacheKey: showcaseCacheKey})  (FR-006, D5)
                          -> map (searchKit union / showcase variants) -> cache -> render
                             (kit data source assumed present; no default-showcase fallback)  (FR-012)
user selects a different family-style
  -> repeat the "selected style is custom?" branch for the newly selected prefix (lazy)    (Q1)
user types a query
  -> searchKit(query, searchMode from prefix), map -> this.icons                           (FR-001, FR-003)
user clears the query
  -> return to opening showcase view for the selected family-style                          (FR-013)
```
