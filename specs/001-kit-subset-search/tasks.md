---

description: "Task list for Kit Subset-Aware Search & Showcase"
---

# Tasks: Kit Subset-Aware Search & Showcase

**Input**: Design documents from `/specs/001-kit-subset-search/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED — Constitution Principle III (Test-First Quality) is NON-NEGOTIABLE, and plan.md mandates spec + e2e coverage. Test tasks precede their implementation within each phase.

**Organization**: Tasks are grouped by user story (from spec.md) so each story can be implemented, tested, and delivered independently.

> **Note (2026-06-26 regeneration)**: This task list reflects the spec update that (a) corrected the `Kit.searchKit` shape to the live schema — `SearchKitResult { icons, totalIconCount }` where `icons` is a `SearchKitIcon` union (`IconWithVariants | IconUpload`), not `iconVariants`/`totalIconVariantCount`; (b) sources the kit's available family-styles from `Kit.familyStylesPaginated(page:1,pageSize:50){familyStyles{familyStyle{family style prefix}}}` instead of `permits`/pro/lite filtering (FR-008/SC-009) — revised 2026-07-15 to select family/style directly and drop the `release.familyStyles` catalog selection entirely; and (c) caches showcase requests by the kit-provided `Kit.showcaseCacheKey`. **No fallback**: `Kit.showcaseIcons`, `Kit.showcaseCacheKey`, and `Kit.familyStylesPaginated` are available in staging and are a release prerequisite (this component does not ship until they are in production), so the code assumes they are present and contains no degradation/fallback path. The prior implementation was built against the old contracts and must be reworked accordingly.

> **Note (2026-07-02 update — kit-branded copy)**: Adds User Story 5 (Phase 7): in kit mode, three pieces of default copy identify the kit by name and token — the search-status line, the start-view heading, and the start-view detail. `slotDefaults` becomes a `slotDefaults({kitToken, name})` generator; `setupSlots({kitToken, name})` is moved to run **after** `preload()` so `Kit.name` is loaded; the kit name is truncated to 30 chars + `…`. `Kit.name` is already selected in `KIT_METADATA_QUERY` (an already-live field). Non-kit copy is unchanged (`slotDefaults({})`). See `contracts/slot-copy.md`. The Polish phase (now Phase 8) picks up the copy in CHANGELOG/docs/verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task serves (US1–US5)
- All paths are repository-relative

## Path Conventions

Stencil monorepo. Primary package: `packages/fa-icon-chooser/`. Key files:

- Component: `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`
- Utils/adapters: `packages/fa-icon-chooser/src/utils/utils.ts`
- Slot copy: `packages/fa-icon-chooser/src/utils/slots.tsx`
- Spec tests: `packages/fa-icon-chooser/src/utils/utils.spec.ts`, `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.spec.ts`
- e2e tests: `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.e2e.ts`
- React wrapper: `packages/fa-icon-chooser-react/`

Run tests from `packages/fa-icon-chooser/` with `npm test` (`stencil test --spec --e2e`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test fixtures and type scaffolding shared by all stories.

- [X] T001 [P] Add/refresh GraphQL response test fixtures as exported constants in `packages/fa-icon-chooser/src/utils/__fixtures__/kitResponses.ts`, modeled on `contracts/`: a `searchKit` OFFICIAL page (`data.me.kit.searchKit` with `totalIconCount`, `totalPageCount`, and `icons` as `IconWithVariants` members carrying `__typename`, `name`, `variants[].familyStyle.prefix`); a `searchKit` CUSTOM page (`icons` as `IconUpload` members with `__typename`, `name`, `pathData`); a `showcaseIcons` page (`iconVariants` shape); a `KitMetadata` response including `showcaseCacheKey`, `familyStylesPaginated` (nodes of `{ familyStyle { family style prefix } }`), and `release { version }`; and an empty-result variant of each page (for adapter empty-result coverage).
- [X] T002 [P] Add/refresh TypeScript interfaces in `packages/fa-icon-chooser/src/utils/utils.ts` matching `data-model.md` (types only; no logic): `SearchKitResult`, the `SearchKitIcon` union members `IconWithVariants` and `IconUpload`, `IconVariant`, `FamilyStyleSelector`, and the showcase `IconVariantsPaginated`. Remove the obsolete assumption that `searchKit` returns `iconVariants`.

**Checkpoint**: Fixtures + types available for adapters and tests.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared adapters, subset family-style sourcing, and showcase-cache-key plumbing consumed by search (US1) and showcase (US2/US4). MUST complete before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (write first, ensure they FAIL)

- [X] T003 [P] Spec tests for `searchKitIconsToIconLookups` in `packages/fa-icon-chooser/src/utils/utils.spec.ts` using T001 fixtures: OFFICIAL union members (`IconWithVariants`) map to one `{ iconName, prefix }` per `variant` (prefix from `variant.familyStyle.prefix`); CUSTOM union members (`IconUpload`) map to `{ iconName: name }`; an empty `icons` list maps to `[]`.
- [X] T004 [P] Spec tests for the remaining pure helpers in `packages/fa-icon-chooser/src/utils/utils.spec.ts`: `searchModeForPrefix` (`fak`/`fakd` → `'CUSTOM'`, else `'OFFICIAL'`), `showcaseIconsToIconLookups` (maps `showcaseIcons.iconVariants` → `{ iconName, prefix }`; empty → `[]`), `showcaseCacheKeyFromResponse` (reads `data.me.kit.showcaseCacheKey`), and `kitFamilyStylePrefixesFromResponse` (reads `data.me.kit.familyStyles[].prefix`).

### Implementation

- [X] T005 [P] Implement pure helper `searchModeForPrefix(prefix: string): 'OFFICIAL' | 'CUSTOM'` in `packages/fa-icon-chooser/src/utils/utils.ts`.
- [X] T006 [P] Implement pure adapter `searchKitIconsToIconLookups(response): Array<IconLookup>` in `packages/fa-icon-chooser/src/utils/utils.ts`: read `data.me.kit.searchKit.icons` (union), branch on `__typename` — `IconWithVariants` → one `{ iconName: name, prefix: variant.familyStyle.prefix }` per variant; `IconUpload` → `{ iconName: name }` — mapping a legitimately-empty result to `[]` (per `contracts/search-kit.graphql`).
- [X] T007 [P] Implement pure adapter `showcaseIconsToIconLookups(response): Array<IconLookup>` in `packages/fa-icon-chooser/src/utils/utils.ts` (reads `data.me.kit.showcaseIcons.iconVariants`, maps each variant to `{ iconName: name, prefix: familyStyle.prefix }`, empty → `[]`; per `contracts/showcase-icons.graphql`).
- [X] T008 [P] Implement pure helpers `showcaseCacheKeyFromResponse(response): string | undefined` and `kitFamilyStylePrefixesFromResponse(response): string[]` in `packages/fa-icon-chooser/src/utils/utils.ts`.
- [X] T009 Update the `KitMetadata` query selection in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx` per `contracts/kit-metadata.graphql`: add `showcaseCacheKey` and `familyStylesPaginated(page: 1, pageSize: 50) { familyStyles { familyStyle { prefix } } }`; keep `release.familyStyles` (used as the prefix→family/style catalog); remove the `kitRevision` cache selection. Capture `showcaseCacheKey` into new component state during `loadKitMetadata()` (replacing the `kitRevision` capture).
- [X] T010 Replace kit-mode family-style population in `loadKitMetadata()` (`packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`): build the offered styles from `kitFamilyStylesFromResponse(response)` (the kit subset, carrying family/style/prefix directly), then `updateFamilyStyles(...)` those, plus the custom-upload styles (`fak`/`fakd`) inferred from `iconUploads`. This supersedes the prior `permits`/pro/lite/default branches as the *selector* of styles; preserve the existing `embedSvgPrefixes` computation. No fallback to release/permits-derived styles. Then `ensureSelectedFamilyStyleIsValid()` reconciles over the subset. (FR-008, FR-012, FR-014, SC-009)
- [X] T011 Add component state `showcaseIconsByPrefix: { [prefix: string]: Array<IconLookup> }` (in-memory lazy showcase cache) and `showcaseCacheKey?: string`, and import the new utils helpers, in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`.

**Checkpoint**: Foundation ready — union/showcase adapters tested green, `this.familyStyles` = kit subset (+ custom uploads), `showcaseCacheKey` captured, showcase cache state in place.

---

## Phase 3: User Story 1 - Search returns only icons in the kit (Priority: P1) 🎯 MVP

**Goal**: In kit mode, route search through `Kit.searchKit` (union response) so results are constrained to the kit's subset; non-kit mode keeps using legacy `search`.

**Independent Test**: With a kit token for a known narrow subset, search a term with in- and out-of-subset matches; verify only subset icons appear. With no kit token, verify legacy results are unchanged.

### Tests (write first, ensure they FAIL)

- [X] T012 [P] [US1] Spec test: in kit mode, `updateQueryResults()` issues the `SearchKit` document (pageSize 100, `searchMode` from selected prefix) and populates `this.icons` by mapping `data.me.kit.searchKit.icons` (union) via `searchKitIconsToIconLookups`; in non-kit mode it issues the legacy `search` document unchanged — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.spec.ts` (mock `handleQuery`, use T001 fixtures). (FR-001, FR-004, FR-002)
- [X] T013 [P] [US1] e2e test: kit-mode search renders only subset icons (no out-of-subset matches); plus a non-kit regression asserting legacy search behavior — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.e2e.ts`. (SC-001, SC-003)

### Implementation

- [X] T014 [US1] Add/repair the `SearchKit` query path: update the `SEARCH_KIT_QUERY` document to the corrected union selection (`icons { __typename ... on IconWithVariants {...} ... on IconUpload {...} }`, `totalIconCount`) per `contracts/search-kit.graphql`, and branch `updateQueryResults(query)` so that when `this.kitToken` is set it calls `handleQuery` with variables `{ token, query, searchMode: searchModeForPrefix(getSelectedPrefix()) }`, maps the response via `searchKitIconsToIconLookups(response)`, and assigns `this.icons`; otherwise keeps the existing legacy `search` path — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`. (FR-001, FR-003, FR-004, FR-011)
- [X] T015 [US1] Update the unexpected-response guard for the kit search path to check `data.me.kit.searchKit.icons` (not `iconVariants`); warn via `CONSOLE_MESSAGE_PREFIX` and yield empty results on a malformed payload, mirroring the existing legacy guard — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`. (FR-011)

**Checkpoint**: Kit-mode search returns subset-only results from the corrected union response; non-kit search unchanged. MVP demonstrable.

---

## Phase 4: User Story 2 - Opening view showcases kit icons (Priority: P1)

**Goal**: In kit mode, replace the static default showcase with lazily-loaded per-family-style `Kit.showcaseIcons`; offer only the kit's subset family-styles and default-select within them; custom styles use the kit's uploads. The kit data source is assumed present — no default-showcase fallback.

**Independent Test**: Open in kit mode; verify the offered family-styles are exactly the kit's subset, the default-selected style is one the subset contains, the opening icons are subset-only, exactly one `showcaseIcons` fetch occurs for the selected family-style, and switching styles lazily fetches once per style. Verify no library-wide default-showcase icons appear. Non-kit mode shows the unchanged default showcase.

### Tests (write first, ensure they FAIL)

- [X] T016 [P] [US2] Spec test: in kit mode the offered family-styles (`this.familyStyles`) are exactly the kit subset (`Kit.familyStylesPaginated`) plus custom-upload styles — no style outside the kit's subset and no library-wide/release-only style is present — and the default-selected family-style is classic solid when the subset contains it, else the first subset family-style — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.spec.ts`. (FR-008, FR-012, FR-014, SC-008, SC-009)
- [X] T017 [P] [US2] Spec test: opening view in kit mode fetches `showcaseIcons` for the selected family-style only (lazy), caches it in `showcaseIconsByPrefix` (no refetch on re-select), and a custom (`fak`/`fakd`) selection uses `iconUploadsAsIconUploadLookups()` instead of a showcase fetch — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.spec.ts`. (FR-005, FR-005a, FR-006, FR-007)
- [X] T018 [P] [US2] e2e test: kit-mode open shows subset-only showcase with a single fetch; switching family-style triggers exactly one new fetch; no default-showcase icons appear; non-kit mode opening showcase is unchanged — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.e2e.ts`. (SC-002, SC-004, SC-008, SC-003)

### Implementation

- [X] T019 [US2] Implement `fetchShowcaseForSelectedFamilyStyle()`: if selected prefix is custom (`fak`/`fakd`) populate from `iconUploadsAsIconUploadLookups()`; else if `showcaseIconsByPrefix[prefix]` is cached use it; else call `handleQuery` with the `ShowcaseIcons` document (`contracts/showcase-icons.graphql`), variables `{ token, selector: { prefix } }`, map via `showcaseIconsToIconLookups(response)`, store in `showcaseIconsByPrefix`, and set `this.icons` — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`. (FR-005, FR-005a, FR-006, FR-007)
- [X] T020 [US2] Branch the opening-view population (currently `buildDefaultIconsSearchResult` + `setIcons` in `componentWillLoad`) so kit mode calls `fetchShowcaseForSelectedFamilyStyle()` after `ensureSelectedFamilyStyleIsValid()` (no default-showcase fallback in kit mode), and non-kit mode keeps the existing default-showcase path — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`. (FR-005, FR-012, FR-014, FR-002)
- [X] T021 [US2] Trigger lazy showcase loading on family-style change: invoke `fetchShowcaseForSelectedFamilyStyle()` from `selectFamily()`/`selectStyle()` when in kit mode and not currently searching — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`. (FR-006 lazy, Clarification Q1)
- [X] T022 [US2] Make clearing the search return to the kit showcase view in kit mode: in `onSearchInputChange()` empty-query branch, call `fetchShowcaseForSelectedFamilyStyle()` when `this.kitToken` is set instead of restoring `this.defaultIcons` — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`. (FR-013)

**Checkpoint**: US1 + US2 both work independently — kit-mode search and a subset-only, lazily-loaded opening showcase with subset-limited family-styles and default selection, no fallback.

---

## Phase 5: User Story 3 - Custom uploaded icons searchable (Priority: P2)

**Goal**: When a custom-upload family-style (`fak`/`fakd`) is selected, search uses `searchMode: CUSTOM` and surfaces the kit's uploaded custom icons.

**Independent Test**: With a kit that has uploads, select `fak`/`fakd`, search an uploaded icon's name, and verify the uploaded custom icons are returned and rendered.

### Tests (write first, ensure they FAIL)

- [X] T023 [P] [US3] Spec test: when the selected prefix is `fak`/`fakd`, the kit search uses `searchMode: CUSTOM` and the `IconUpload` union matches resolve to renderable `IconUploadLookup`s (with `pathData`); for an official prefix it uses `OFFICIAL` and maps `IconWithVariants` — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.spec.ts`. (FR-003, SC-007)
- [X] T024 [P] [US3] e2e test: in a custom family-style, searching an uploaded icon name renders the uploaded custom icon — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.e2e.ts`. (SC-007)

### Implementation

- [X] T025 [US3] In the kit search path (T014), when `searchMode` is `CUSTOM`, resolve the `searchKit` `IconUpload` matches (by name) to the kit's already-loaded `iconUploadsAsIconUploadLookups()` (carrying `pathData`) so custom results render correctly, instead of CDN-fetched `{ iconName, prefix }` — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`. (FR-003, FR-011)

**Checkpoint**: US1 + US2 + US3 functional — official and custom search both honor the kit.

---

## Phase 6: User Story 4 - Repeated opens of an unchanged kit are fast (Priority: P3)

**Goal**: Showcase requests carry a cache hint keyed by the kit-provided `Kit.showcaseCacheKey`, so an unchanged kit reuses cached results and a changed kit refreshes them.

**Independent Test**: Reopen the same unchanged kit; verify no duplicate `showcaseIcons` network fetch (cache hit). Change the kit so `showcaseCacheKey` changes; verify a refresh occurs.

### Tests (write first, ensure they FAIL)

- [X] T026 [P] [US4] Spec test: showcase `handleQuery` calls pass `options = { cache: true, cacheKey: this.showcaseCacheKey }`, a second open with the same `showcaseCacheKey` performs no additional showcase `handleQuery` call for an already-loaded prefix, and a different `showcaseCacheKey` is passed through unchanged — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.spec.ts`. (FR-009, FR-010, SC-006)
- [X] T027 [P] [US4] e2e test (with a cache-honoring `handleQuery` that keys on `cacheKey` + variables): reopening an unchanged kit issues zero extra showcase fetches — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.e2e.ts`. (SC-006)

### Implementation

- [X] T028 [US4] Pass `options = { cache: true, cacheKey: this.showcaseCacheKey }` on the `ShowcaseIcons` `handleQuery` call in `fetchShowcaseForSelectedFamilyStyle()` (per `contracts/handle-query-options.md`); keep the kit search call uncached — in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`. (FR-009, FR-010)

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: User Story 5 - Kit-mode copy names the kit (Priority: P3)

**Goal**: In kit mode, personalize three default copy strings with the kit's name (truncated to 30 chars + `…`) and token: the search-status line, the start-view heading, and the start-view detail. Convert `slotDefaults` into a `slotDefaults({kitToken, name})` generator, forward the same params through `setupSlots({kitToken, name})`, and move the `setupSlots` call to run after `preload()` so `Kit.name` is loaded. Non-kit copy is unchanged.

**Independent Test**: Open in kit mode for a kit with a known name/token; verify the search-status line reads "You're searching the icons in your `<name>` Kit (`<token>`) set to Font Awesome Version `<version>`", the start-view heading reads "Add Icons from Your Font Awesome `<name>` Kit", and the start-view detail points to fontawesome.com/kits. Use a name >30 chars and confirm truncation with `…`. Open with no kit token and confirm all three read exactly as today.

### Tests (write first, ensure they FAIL)

- [X] T035 [P] [US5] Spec test for `truncateKitName(name, max=30)` in `packages/fa-icon-chooser/src/utils/utils.spec.ts`: name ≤30 chars returned unchanged (no ellipsis); name >30 chars → first 30 chars + `'…'` (ellipsis not counted toward 30); missing/empty name → `''`. (FR-017, SC-011)
- [X] T036 [P] [US5] Spec test for the `slotDefaults({kitToken, name})` generator in `packages/fa-icon-chooser/src/utils/slots.spec.tsx`: with `{}`/no arg/empty `kitToken`, `searching-pro`, `searching-free`, `start-view-heading`, and `start-view-detail` equal today's exact strings; with a truthy `kitToken`, `searching-pro`===`searching-free`===`"You're searching the icons in your <truncateKitName(name)> Kit (<kitToken>) set to Font Awesome Version"`, `start-view-heading`===`"Add Icons from Your Font Awesome <truncateKitName(name)> Kit"`, `start-view-detail`===the fontawesome.com/kits string; a >30-char name is truncated; a missing name still yields valid copy; all other slot entries are identical between kit and non-kit. (FR-016, FR-017, FR-018, FR-019, FR-020)
- [X] T037 [P] [US5] e2e test in `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.e2e.ts`: in kit mode the rendered start-view heading, start-view detail, and search-status line show the kit-branded copy (with the token and truncated name); a non-kit render shows the original search-status / start-view heading / start-view detail copy unchanged. (SC-010, SC-011, SC-003)

### Implementation

- [X] T038 [P] [US5] Implement pure helper `truncateKitName(name?: string, max = 30): string` in `packages/fa-icon-chooser/src/utils/utils.ts` (≤max → unchanged; >max → `name.slice(0, max) + '…'`; missing/empty → `''`). (FR-017)
- [X] T039 [US5] Convert `slotDefaults` from a static object into `slotDefaults(params = {})` accepting `{ kitToken, name }` in `packages/fa-icon-chooser/src/utils/slots.tsx`, per `contracts/slot-copy.md`: when `kitToken` is truthy, compute `searching-pro`/`searching-free` (same kit string), `start-view-heading`, and `start-view-detail` using `truncateKitName(name)`; otherwise return today's copy verbatim for every entry. Must not throw on empty/missing `name`. (FR-016, FR-017, FR-018, FR-019, FR-020)
- [X] T040 [US5] In `packages/fa-icon-chooser/src/components/fa-icon-chooser/fa-icon-chooser.tsx`: change `setupSlots()` to `setupSlots(params = {})` and forward `params` to `slotDefaults(params)`; move the `setupSlots(...)` call out of the top of `componentWillLoad()` to **after** `preload()` resolves, invoking `this.setupSlots({ kitToken: this.kitToken, name: get(this, 'kitMetadata.name') })`; keep `Kit.name` selected/captured in `loadKitMetadata()` (already in the query). Verify all references to `slotDefaults[...]` (e.g. the `search-field-placeholder` fallback in the render) are updated to call the generator or read from `activeSlotDefaults`. (FR-015, FR-016)

**Checkpoint**: All five user stories independently functional — kit-mode copy is branded with the kit name/token; non-kit copy unchanged.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Release readiness and constitution compliance.

- [X] T029 [P] Run `npm run format.check` in `packages/fa-icon-chooser/` and fix any Prettier issues (Constitution III).
- [X] T030 [P] Update `CHANGELOG.md` with the kit subset-aware search & showcase entry, noting the corrected `searchKit` union response, subset-limited family-styles, `showcaseCacheKey` caching, and the kit-branded default copy (search-status / start-view heading / detail with kit name + token) (Constitution V).
- [ ] T031 Bump both packages to the same new MINOR version (from `0.10.2`) and update the React package's pinned dependency on the core, per `DEVELOPMENT.md` (Constitution IV/V): `packages/fa-icon-chooser/package.json`, `packages/fa-icon-chooser-react/package.json`.
- [X] T032 [P] Rebuild the React wrapper output so it stays in lockstep (no API change expected): `packages/fa-icon-chooser-react/` (Constitution IV).
- [X] T033 [P] Update component docs noting kit-mode subset search/showcase behavior, subset-limited family-styles, the `handleQuery` `options.cacheKey` (= `Kit.showcaseCacheKey`) hint, and the kit-branded default copy (and that the `searching-*`, `start-view-heading`, `start-view-detail` slots are still host-overridable) in `packages/fa-icon-chooser/readme.md` / `DEVELOPMENT.md`.
- [ ] T034 Execute the `quickstart.md` manual verification steps (1–8, including the kit-branded copy step) against a real kit token (staging) via `dev/local.json`; record results.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–7)**: US1–US4 depend on Foundational. US1 and US2 are both P1; US3 (P2) depends on US1's search path (T014); US4 (P3) depends on US2's showcase fetch (T019). US1 and US2 are otherwise independent and parallelizable. **US5 (P3, Phase 7)** depends only on the `KitMetadata` `name` capture in `loadKitMetadata()` (T009) — it is otherwise independent of US1–US4 (it touches `slots.tsx`, `utils.ts` truncation, and the `setupSlots`/`preload` sequencing) and can proceed in parallel with them once Foundational is done.
- **Polish (Phase 8)**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational. Independent.
- **US2 (P1)**: After Foundational. Independent of US1 (different methods; shares only the foundational adapters and subset family-style sourcing).
- **US3 (P2)**: After US1 (extends the kit search path T014 for `CUSTOM` mode).
- **US4 (P3)**: After US2 (adds cache options to the showcase fetch T019).
- **US5 (P3)**: After Foundational (needs `kitMetadata.name` from T009). Independent of US1–US4.

### Within Each User Story

- Tests are written first and must FAIL before implementation.
- Pure helpers (Foundational) before component wiring.
- Search path (US1) before custom-search extension (US3).
- Showcase fetch (US2) before cache hinting (US4).

### Parallel Opportunities

- Setup: T001, T002 in parallel.
- Foundational: T003–T008 in parallel (tests + pure helpers, all in `utils.ts`/`utils.spec.ts`); T009–T011 touch the component file and are sequential after.
- US1, US2, and US5 can be developed in parallel by different developers once Foundational is done.
- Within a story, the `[P]` test tasks run in parallel.
- US5: T035, T036, T037 (tests) in parallel; T038 (`truncateKitName` in `utils.ts`) and T039 (`slots.tsx`) in parallel; T040 (component sequencing) after T038/T039.
- Polish: T029, T030, T032, T033 in parallel; T031 (version bump) before T032 (rebuild).

---

## Parallel Example: Foundational Phase

```bash
# Write the adapter/helper spec tests and pure helpers together (same utils files, distinct exports):
Task: "Spec tests for searchKitIconsToIconLookups (union) in utils.spec.ts"   # T003
Task: "Spec tests for searchModeForPrefix/showcaseIconsToIconLookups/cacheKey/familyStyles" # T004
Task: "Implement searchModeForPrefix in utils.ts"                             # T005
Task: "Implement searchKitIconsToIconLookups (union) in utils.ts"             # T006
Task: "Implement showcaseIconsToIconLookups in utils.ts"                      # T007
Task: "Implement showcaseCacheKeyFromResponse + kitFamilyStylePrefixesFromResponse" # T008
```

## Parallel Example: P1 Stories After Foundational

```bash
# Developer A — US1 (search):
Task: "Spec test SearchKit routing (T012)"  ->  "Implement SearchKit path (T014)"
# Developer B — US2 (showcase + subset family-styles):
Task: "Spec test subset family-styles + lazy showcase (T016/T017)"  ->  "Implement fetchShowcaseForSelectedFamilyStyle (T019)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup → 2. Phase 2: Foundational → 3. Phase 3: US1.
4. **STOP and VALIDATE**: kit-mode search returns subset-only results from the corrected union response; non-kit unchanged.
5. Demo MVP.

### Incremental Delivery

1. Setup + Foundational → foundation ready (union/showcase adapters, subset family-styles, showcaseCacheKey).
2. US1 (kit search) → test → demo (MVP).
3. US2 (opening showcase + subset family-styles) → test → demo.
4. US3 (custom search) → test → demo.
5. US4 (showcaseCacheKey caching) → test → demo.
6. US5 (kit-branded copy) → test → demo.
7. Polish → release (MINOR bump, both packages in lockstep).

### Parallel Team Strategy

After Foundational: Dev A on US1, Dev B on US2, Dev C on US5 (all independent). US3 follows US1; US4 follows US2. Polish last.

---

## Notes

- `[P]` = different files / independent; avoid parallelizing tasks that edit `fa-icon-chooser.tsx` simultaneously (T009, T010, T011, T014, T015, T019–T022, T025, T028, T040 all touch it — sequence them).
- US5 note: `slotDefaults` becoming a function is a breaking change to every reader of the old object (e.g. the `search-field-placeholder` render fallback in `fa-icon-chooser.tsx` and any `slotDefaults[...]` access); T040 must update all such call sites. Non-kit copy must stay byte-for-byte identical (covered by T036/T037 regression assertions).
- Constitution gates: spec + e2e green and `format.check` clean before merge; non-kit mode behavior must remain unchanged (regression tests in T013/T018); both packages versioned and released in lockstep.
- **No fallback**: `Kit.showcaseIcons`, `Kit.showcaseCacheKey`, and `Kit.familyStylesPaginated` are available in staging and are a release prerequisite (this component ships only after they are in production), so the code assumes they are present — no empty-state degradation and no release/permits-derived family-style fallback. The `Kit.searchKit` union correction (US1) is verified against the live schema. Tests run against fixtures; final live validation (T034) runs against staging before release.
- Commit after each task or logical group.
