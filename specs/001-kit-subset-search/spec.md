# Feature Specification: Kit Subset-Aware Search & Showcase

**Feature Branch**: `001-kit-subset-search`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "When the fa-icon-chooser component is used in kit mode, it will respect the kit's subset. That means when icons are searched, it will use the new `Kit.searchKit` field instead of the legacy `search` field... When the fa-icon-chooser is not used in kit mode, the behavior will remain unchanged. Kit mode is invoked when there's a `kit-token` prop specifying the kit's token..."

## Clarifications

### Session 2026-06-26

- Q: When the chooser opens in kit mode, how should the showcase be loaded across the kit's family-styles? → A: Lazy — on open, fetch only the currently selected family-style's showcase (≤80); fetch each other family-style's showcase the first time that style is selected.
- Q: When a custom-upload family-style (fak/fakd) is selected in kit mode, what populates its opening (pre-search) view? → A: The kit's already-loaded uploaded custom icons (no showcase fetch for custom styles); the curated showcase covers official styles only.
- Q: Which family-style is selected by default when the chooser opens in kit mode? → A: Classic solid if the kit's subset contains it; otherwise the kit's first available family-style.

### Session 2026-06-26 (spec update)

- Refinement: In kit mode, the chooser's available family-styles MUST be limited to those actually present in the kit's subset, obtained from the kit's own subset family-style list (the first page, up to 50 family-styles), rather than from the full release/license family-styles. The default selection then operates only over those subset family-styles.
- Refinement: Showcase caching uses a single kit-provided showcase cache key (obtained together with the kit's metadata) as the cache identity, replacing the previously specified kit-token + kit-revision composite key.

### Session 2026-07-02 (kit-branded copy)

- Addition: The kit-metadata load MUST also retrieve the kit's `name`, so kit-mode copy can identify the kit by name.
- Addition: In kit mode, three pieces of default copy MUST be personalized with the kit's name and token — the search-status line ("You're searching…"), the start-view heading, and the start-view detail. When not in kit mode, these keep their current wording exactly.
- Decision: The kit name is shown truncated to 30 characters; when the name is longer than 30 characters, the first 30 characters are shown followed by an ellipsis ("…"). Names of 30 characters or fewer are shown in full with no ellipsis.
- Decision: Default slot copy is produced from the kit's token and name so kit-mode wording can be computed. When there is no kit (non-kit mode), the copy is generated without a token/name and yields today's wording; the generator handles a missing/empty token and name gracefully. Personalized defaults are resolved after kit metadata loads, so the kit name and token are available.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search returns only icons that exist in the kit (Priority: P1)

A person picking an icon inside a product that embeds the icon chooser with a kit token searches for a term (e.g. "arrow"). Because the kit is subsetted, they should only see icons that are actually part of that kit's subset — never icons that the kit does not include and therefore could not render.

**Why this priority**: This is the core promise of kit mode. Showing icons that are not in the kit's subset leads users to pick icons that will not display, which is the single most damaging failure of the feature. Without this, the rest is cosmetic.

**Independent Test**: Embed the chooser with a kit token for a kit whose subset is known and narrow. Search for a term that has matches both inside and outside the subset. Verify every returned icon belongs to the kit's subset and that known out-of-subset matches do not appear.

**Acceptance Scenarios**:

1. **Given** the chooser is configured with a kit token, **When** the user searches for a term, **Then** results are drawn from the kit's subset and contain no icons absent from the kit.
2. **Given** the chooser is configured with a kit token, **When** the user searches a term that has no matches within the subset, **Then** an empty / "no results" state is shown rather than out-of-subset matches.
3. **Given** the chooser has no kit token, **When** the user searches, **Then** results come from the full library exactly as they do today (no behavior change).

---

### User Story 2 - Opening view showcases icons that are really in the kit (Priority: P1)

When the chooser first opens in kit mode (before the user types anything), it presents a curated "showcase" of icons. Because a kit's subset is unpredictable, that showcase must be built from the kit's actual subset rather than from the generic, library-wide default showcase, so users never see opening icons that the kit cannot render.

**Why this priority**: The opening view is the first thing every user sees. The legacy default showcase is a fixed, curated library-wide set that may include icons a kit does not contain. In kit mode that produces broken/un-renderable icons on first paint, undermining trust before the user does anything.

**Independent Test**: Open the chooser with a kit token for a known narrow subset and take no action. Verify all icons in the opening showcase belong to the kit's subset, that they are grouped by the family-styles the kit contains, and that no more than the per-family-style cap (80) appear for any one family-style.

**Acceptance Scenarios**:

1. **Given** the chooser opens with a kit token, **When** no search has been entered, **Then** the opening showcase contains only icons present in the kit's subset.
2. **Given** a kit whose subset omits some popular icons, **When** the showcase is displayed, **Then** only the popular icons actually present appear, with the remainder filled by the kit's curated showcase, and no out-of-subset icons are shown.
3. **Given** the chooser has no kit token, **When** it opens, **Then** the existing library-wide default showcase is shown unchanged.

---

### User Story 3 - Custom uploaded icons are searchable in kit mode (Priority: P2)

A kit may include custom icons uploaded by the account owner (single-path custom and duotone custom). When the user is browsing those custom family-styles, search must find the kit's uploaded custom icons rather than official-library icons.

**Why this priority**: Custom uploads are a paid, differentiating capability of kits. If search silently ignores them when the user is in a custom family-style, the kit appears to be missing the user's own icons. It is one notch below the core subset behavior because it applies only to kits that have uploads and only while a custom style is selected.

**Independent Test**: Use a kit that contains custom uploads. Select the custom (single-path) and custom-duotone family-styles in turn, search for an uploaded icon's name, and verify the uploaded custom icons are returned.

**Acceptance Scenarios**:

1. **Given** the selected family-style is a kit custom-upload style, **When** the user searches, **Then** results are drawn from the kit's custom (uploaded) icons.
2. **Given** the selected family-style is any non-custom (official) style, **When** the user searches, **Then** results are drawn from the kit's official subset.

---

### User Story 4 - Repeated opens of an unchanged kit are fast (Priority: P3)

When the same kit (unchanged) is opened repeatedly, the curated showcase and kit metadata should be served from cache rather than re-fetched, so the chooser opens quickly and avoids redundant network work. When the kit changes, the cache must refresh automatically.

**Why this priority**: A performance and cost optimization, not a correctness requirement. It improves perceived speed and reduces API load but does not change which icons are shown. It depends on US1/US2 being in place first.

**Independent Test**: Open the chooser twice for the same kit without changing the kit, and confirm the showcase is served from cache the second time (no redundant fetch). Then change the kit (new revision) and confirm the showcase refreshes.

**Acceptance Scenarios**:

1. **Given** a kit was opened and its showcase fetched, **When** the same kit (same revision) is opened again, **Then** the showcase is served from cache and not re-fetched.
2. **Given** a kit's revision has changed, **When** the chooser opens, **Then** the cached showcase is bypassed and current data is fetched.

---

### User Story 5 - Kit-mode copy names the kit the user is working in (Priority: P3)

When the chooser is used in kit mode, the default guidance copy identifies the kit by name and token so the user knows they are searching and adding icons within their specific kit — not the whole Font Awesome library. This affects the search-status line, the start-view heading, and the start-view detail. When not in kit mode, all of this copy keeps its current wording.

**Why this priority**: A clarity and trust improvement. It reassures the user that results are scoped to their kit and points them to where they can change the kit's contents. It does not change which icons are shown, so it ranks below the correctness stories, but it directly shapes what every kit-mode user reads on the opening view.

**Independent Test**: Open the chooser in kit mode for a kit with a known name and token. Verify the search-status line reads "You're searching the icons in your <name> Kit (<token>) set to Font Awesome Version <version>", the start-view heading reads "Add Icons from Your Font Awesome <name> Kit", and the start-view detail points to fontawesome.com/kits. Repeat with a name longer than 30 characters and confirm it is truncated with an ellipsis. Open with no kit token and confirm all three read exactly as they do today.

**Acceptance Scenarios**:

1. **Given** the chooser is in kit mode for a kit named "Marketing Site" with token "abc123", **When** the opening view is shown, **Then** the search-status line reads "You're searching the icons in your Marketing Site Kit (abc123) set to Font Awesome Version" followed by the resolved version.
2. **Given** the chooser is in kit mode, **When** the opening view is shown, **Then** the start-view heading reads "Add Icons from Your Font Awesome <truncated kit name> Kit" and the start-view detail reads "Search your Kit's icons or browse them by style. Need to add or remove icons? Head to fontawesome.com/kits to update your Kit."
3. **Given** a kit whose name exceeds 30 characters, **When** kit-mode copy is shown, **Then** the name appears truncated to its first 30 characters followed by an ellipsis ("…").
4. **Given** the chooser has no kit token, **When** the opening view is shown, **Then** the search-status line, start-view heading, and start-view detail all read exactly as they do today, with no kit name or token.

---

### Edge Cases

- **Family-style present in the kit but empty for showcase**: A real family-style that the kit contains but for which the showcase yields nothing returns an empty page; that family-style simply contributes no opening icons.
- **Kit omits popular default icons**: Narrow (e.g. Pro-Plus) styles show only the popular icons they actually include; the showcase does not pad with out-of-subset icons.
- **Showcase capacity**: Each family-style contributes at most 80 showcase icons (one page); larger subsets are not exhausted, only the first page is shown.
- **Search page size**: A search returns at most one page of results (the same page size used by legacy search today, 100); deeper pagination is out of scope for this feature.
- **Custom vs official mode mismatch**: Selecting a custom family-style routes search to custom mode; selecting an official family-style routes search to official mode. Switching between them re-issues the appropriate search.
- **Kit lacks classic solid**: If the kit's subset does not contain classic solid, the default selected family-style on open falls back to the first family-style in the kit's subset (FR-014), so the opening showcase is never empty solely because of the default selection.
- **Family-styles beyond the first page**: The kit's subset family-style list is read as a single first page of up to 50 family-styles (FR-008). Real kits contain far fewer family-styles than this, so this cap is not expected to truncate any kit in practice; if a kit ever exceeds it, only the first 50 are offered.
- **Kit subset narrower than the license/release styles**: The available family-styles come from the kit's own subset list, not from what the license/release could theoretically offer, so styles a kit excludes are never presented even if the account's plan would otherwise allow them.
- **No kit token**: Every legacy behavior — search source, page size, default showcase, and the search-status / start-view heading / start-view detail copy — is preserved exactly. The copy generator is invoked without a kit token or name and returns today's wording.
- **Long kit name**: A kit name longer than 30 characters is shown as its first 30 characters followed by an ellipsis ("…") everywhere kit-mode copy uses the name; a name of 30 characters or fewer is shown in full with no ellipsis.
- **Missing/empty kit name**: If the kit metadata yields no name (or an empty name), the copy generator MUST still produce valid copy (the name portion is simply empty) rather than error; kit-mode copy still names the token.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a kit token is present (kit mode), the chooser MUST source icon search results from the kit's subset rather than from the full icon library.
- **FR-002**: When no kit token is present, the chooser MUST preserve all current search and showcase behavior unchanged.
- **FR-003**: In kit mode, search MUST respect the currently selected family-style when choosing how to search: a custom-upload family-style (single-path custom or duotone custom) MUST search the kit's custom icons, and any other family-style MUST search the kit's official subset.
- **FR-004**: In kit mode, a single search MUST request one page of results sized to match the page size currently used by legacy search (100), so result volume is consistent with today's experience.
- **FR-005**: In kit mode, the opening (pre-search) view MUST present a curated showcase built from the kit's actual subset instead of the library-wide default showcase. The curated showcase covers official family-styles only.
- **FR-005a**: When a custom-upload family-style (single-path custom or duotone custom) is selected in kit mode, its opening (pre-search) view MUST be populated from the kit's already-loaded uploaded custom icons rather than from a curated showcase request.
- **FR-006**: The opening showcase MUST be organized per family-style that the kit contains, requesting one page of up to 80 showcase icons per family-style. Showcases MUST be loaded lazily: on open, only the currently selected family-style's showcase is fetched; each other family-style's showcase is fetched the first time that family-style is selected.
- **FR-007**: The showcase for a given family-style MUST be obtained by selecting exactly that one family-style, so its icons are constrained to that family-style.
- **FR-008**: In kit mode, the chooser MUST limit the available family-styles to those actually present in the kit's subset, determined from the kit's own subset family-style list (the first page, up to 50 family-styles), together with any custom-upload styles the kit's uploads imply. The chooser MUST NOT offer any family-style that the kit's subset does not include.
- **FR-009**: The chooser MUST obtain and retain the kit-provided showcase cache key as part of loading kit data, for use as the showcase cache identity.
- **FR-010**: In kit mode, showcase requests MUST be marked as cacheable, and the cache identity MUST be the kit-provided showcase cache key, so that an unchanged kit reuses cached results and a changed kit refreshes them.
- **FR-011**: The chooser MUST NOT display, in either search results or the opening showcase, any icon that is not part of the kit's subset while in kit mode.
- **FR-012**: In kit mode, the chooser MUST source the opening showcase, the available family-styles, and the showcase cache key exclusively from the kit data source. It MUST NOT include any fallback to the library-wide default showcase or to release/license-derived family-styles. (The kit data source is assumed available; the component is not released until the supporting fields are in production.)
- **FR-013**: When the user clears a search in kit mode, the chooser MUST return to the kit's curated showcase view (the kit-mode equivalent of returning to the default icons today).
- **FR-014**: When the chooser opens in kit mode, the default selected family-style MUST be classic solid when the kit's subset contains it; otherwise it MUST be the first family-style in the kit's subset. The default-selection reconciliation MUST operate only over the kit's subset family-styles (FR-008), so the opening view always lands on a family-style the kit actually has.
- **FR-015**: The kit-metadata load MUST retrieve the kit's name in addition to the fields it already selects, so kit-mode copy can identify the kit by name.
- **FR-016**: Default copy MUST be produced by a generator that accepts the kit's token and name as parameters and returns the full set of default copy. When invoked with no token/name (or empty values), it MUST return the current (non-kit) copy for every piece of copy and MUST NOT error. The personalized copy MUST be resolved after the kit metadata has loaded, so the kit's name and token are available when the copy is generated.
- **FR-017**: The kit's name, wherever it appears in kit-mode copy, MUST be truncated to at most 30 characters: if the name exceeds 30 characters, the first 30 characters MUST be shown followed by an ellipsis ("…"); a name of 30 characters or fewer MUST be shown in full with no ellipsis.
- **FR-018**: In kit mode, the search-status copy (the line shown above results / on the opening view that today reads "You're searching Font Awesome Pro icons in version") MUST read "You're searching the icons in your <truncated kit name> Kit (<kit token>) set to Font Awesome Version", immediately followed by the resolved version as today. When not in kit mode, this copy MUST remain unchanged.
- **FR-019**: In kit mode, the start-view heading copy MUST read "Add Icons from Your Font Awesome <truncated kit name> Kit". When not in kit mode, the start-view heading MUST keep its current value.
- **FR-020**: In kit mode, the start-view detail copy MUST read "Search your Kit's icons or browse them by style. Need to add or remove icons? Head to fontawesome.com/kits to update your Kit." When not in kit mode, the start-view detail MUST keep its current value.

### Key Entities *(include if feature involves data)*

- **Kit**: An account-owned, subsetted collection of icons identified by a token. Key attributes for this feature: token (identity), name (human-readable label used in kit-mode copy), a showcase cache key (cache identity for showcase requests), the subset of icons it contains, and the subset family-styles it makes available.
- **Family-style**: A combination of icon family and style (e.g. classic solid), identified by a prefix. In kit mode the set of family-styles is drawn from the kit's own subset family-style list (first page, up to 50) plus any custom-upload styles the kit's uploads imply. Includes official styles and, for kits with uploads, custom-upload styles (single-path custom and duotone custom). Determines whether search runs in official or custom mode.
- **Icon / Icon variant**: A single icon as it appears within a particular family-style. The unit shown in search results and in the showcase. Must always belong to the kit's subset in kit mode.
- **Showcase set**: A deterministic, curated selection of **official** icons from the kit's subset, capped per family-style, shown as the opening view for official family-styles in kit mode. Stable for a given kit token and revision. Custom-upload family-styles are not covered by the showcase; their opening view comes from the kit's uploaded custom icons.
- **Search result set**: One page of icons matching a user's query, drawn from the kit's subset (official or custom depending on the selected family-style).
- **Cache key**: A single kit-provided showcase cache key, obtained with the kit's metadata, used to identify reusable showcase data. It changes when the kit changes, so an unchanged kit reuses cached showcase data and a changed kit refreshes it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In kit mode, 100% of icons shown in search results belong to the kit's subset (zero out-of-subset icons across a representative set of searches).
- **SC-002**: In kit mode, 100% of icons shown in the opening showcase belong to the kit's subset.
- **SC-003**: With no kit token, search results and the opening showcase are identical to the pre-feature behavior (no regressions in non-kit mode).
- **SC-004**: The opening showcase presents no more than 80 icons per family-style the kit contains.
- **SC-005**: A search in kit mode returns at most one page of results matching the legacy page size (100).
- **SC-006**: Opening the same unchanged kit a second time reuses cached showcase data (keyed by the kit-provided showcase cache key) with zero additional showcase fetches; opening after the kit changes (a different showcase cache key) triggers a refresh.
- **SC-007**: When the selected family-style is a custom-upload style, searches surface the kit's uploaded custom icons (a known uploaded icon is findable by name).
- **SC-008**: In kit mode, no library-wide default showcase icon and no release/license-derived family-style ever appears; the opening view and the offered family-styles are built solely from the kit data source (showcase icons, kit family-styles, and uploads).
- **SC-009**: In kit mode, every family-style the chooser offers is present in the kit's subset; no family-style the kit excludes is ever presented, and the default-selected family-style is always one the kit's subset contains.
- **SC-010**: In kit mode, the search-status line, start-view heading, and start-view detail each show the kit-specific wording including the kit's name (truncated per SC-011) and, for the search-status line, the kit's token; with no kit token, all three read identically to the pre-feature copy.
- **SC-011**: Any kit name longer than 30 characters is displayed as exactly its first 30 characters plus an ellipsis; a name of 30 characters or fewer is displayed in full with no ellipsis.

## Assumptions

- **Kit mode trigger**: Kit mode is determined solely by the presence of a kit token prop, consistent with current behavior.
- **Search page size source**: The kit search page size is set to the value legacy search uses today (100). No deeper/continued pagination is added in this feature.
- **Showcase capacity**: Each family-style's showcase is a single page of up to 80 icons. The showcase is not exhaustively paginated.
- **Showcase loading granularity**: The showcase is requested per family-style (a separate request per family-style), restricting each request to one family-style, and loaded lazily (see FR-006). On open only the currently selected family-style's showcase is fetched; other family-styles' showcases are fetched on first selection of each.
- **Showcase data source availability**: The kit data source fields this feature depends on (`showcaseIcons`, the kit's family-style list, and the showcase cache key) are available in the staging environment and are a release prerequisite — the component is not shipped until they are in production. The component therefore assumes they are present and contains NO fallback for their absence (FR-012). It is built and tested against their agreed shape (fixtures), with final validation against the live fields before release.
- **Caching responsibility**: The component marks showcase requests as cacheable and supplies the cache identity (the kit-provided showcase cache key); the actual cache implementation is the responsibility of the host application's query handler, consistent with how kit metadata caching works today.
- **Showcase cache key availability**: The kit-provided showcase cache key is a single value obtained alongside the kit's metadata. It is assumed available (see the data-source availability assumption below); the component reads it directly with no fallback.
- **Family-style discovery**: The kit's available family-styles are derived from the kit's own subset family-style list (read as a single first page of up to 50), plus custom-upload styles (`fak`/`fakd`) implied by the kit's uploads — not from the full release/license family-styles. This deliberately narrows the chooser's styles to the kit's actual subset.
- **Authorization**: Requests for kit data continue to require the host application's existing kit-read authorization; this feature does not change the auth model.
- **Kit name availability**: The kit's `name` is available from the kit-metadata source alongside the other kit fields and is retrieved in the same load (FR-015). Kit-mode copy is generated after that load completes, so the name and token are present when the copy is built.
- **Truncation rule**: "Truncated to 30 characters" means the first 30 characters of the name followed by an ellipsis when (and only when) the original name is longer than 30 characters. The ellipsis is a display affordance and is not counted toward the 30-character limit.
- **Copy generation**: The set of default copy is produced by a generator parameterized by the kit's token and name. In non-kit mode it is invoked with no token/name (or empty values) and returns the existing copy unchanged; only the search-status line, start-view heading, and start-view detail differ between kit and non-kit invocations.
