<!--
SYNC IMPACT REPORT
Version change: (template, unversioned) → 1.0.0
Bump rationale: Initial ratification — template placeholders replaced with concrete,
project-specific principles derived from repo context (Stencil web component monorepo,
core + React wrapper, consumer-owned data/auth, spec+e2e testing, coordinated releases).
Modified principles:
  - [PRINCIPLE_1_NAME] → I. Framework-Agnostic Web Component Core
  - [PRINCIPLE_2_NAME] → II. Consumer-Owned Data & Authorization
  - [PRINCIPLE_3_NAME] → III. Test-First Quality (NON-NEGOTIABLE)
  - [PRINCIPLE_4_NAME] → IV. Cross-Framework Parity
  - [PRINCIPLE_5_NAME] → V. Semantic Versioning & Coordinated Releases
Added sections:
  - Technology & Distribution Constraints (was [SECTION_2_NAME])
  - Development Workflow (was [SECTION_3_NAME])
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ reviewed (generic Constitution Check gate; no edits needed)
  - .specify/templates/spec-template.md ✅ reviewed (no constitution-specific mandatory sections affected)
  - .specify/templates/tasks-template.md ✅ reviewed (testing/versioning task types consistent)
Deferred TODOs: none
-->

# Font Awesome Icon Chooser Constitution

## Core Principles

### I. Framework-Agnostic Web Component Core
The icon chooser MUST be implemented as a standalone, framework-agnostic Stencil web
component (`fa-icon-chooser`) that runs anywhere the DOM is available. Framework
integrations (e.g. React) MUST be thin wrappers generated from or built on top of the
core component, never forks of its logic. Core features MUST NOT depend on any specific
host framework being present.
Rationale: The component's value is portability across host apps (WordPress, React, plain
DOM); embedding framework assumptions in the core would fracture that portability.

### II. Consumer-Owned Data & Authorization
The component is a presentation and interaction layer, not a data or auth client. All
network requests, kit/API tokens, and authorization MUST be owned by the host
application and supplied through documented props and callback functions (e.g.
`handleQuery`). The component MUST NOT embed credentials, hardcode endpoints that bypass
the consumer's callbacks, or assume a particular backend.
Rationale: Separation of concerns keeps secrets in the host's control and lets the same
component serve kit mode (Pro) and version-only mode (Free) without code changes.

### III. Test-First Quality (NON-NEGOTIABLE)
Behavioral changes MUST be covered by tests using the established harness: Stencil spec
tests for unit/logic and e2e tests for rendered behavior (`stencil test --spec --e2e`).
Tests SHOULD be written or updated alongside the change and MUST pass before merge. All
source MUST conform to the repository Prettier configuration (`format.check` clean).
Rationale: As an embedded component running inside unknown host environments, regressions
are costly to consumers and hard to debug remotely; automated tests and consistent
formatting are the primary safety net.

### IV. Cross-Framework Parity
The React integration (`@fortawesome/fa-icon-chooser-react`) MUST stay functionally in
sync with the core component. When the core's public props, events, or callbacks change,
the wrapper and its build output MUST be updated in the same change set so consumers of
either package observe consistent behavior.
Rationale: Divergence between the core and its wrappers produces silent, version-specific
breakage that is difficult for downstream integrators to diagnose.

### V. Semantic Versioning & Coordinated Releases
Both published packages MUST share a single semantic version (MAJOR.MINOR.PATCH) and be
released together following the documented release process. Breaking changes to public
props, events, callbacks, or distributed artifact paths require a MAJOR bump; additive,
backward-compatible features a MINOR bump; fixes and internal changes a PATCH bump. Every
release MUST update `CHANGELOG.md` and the contributors lists.
Rationale: Downstream integrators pin versions; predictable, coordinated, documented
releases are what make safe upgrades possible.

## Technology & Distribution Constraints

- The project is a Stencil monorepo with two independently published NPM packages: the
  core library `packages/fa-icon-chooser` and the React integration
  `packages/fa-icon-chooser-react`. The core builds assets consumed by the React package.
- Inside the component, Font Awesome icons MUST be rendered using the Font Awesome SVG/JS
  technology regardless of how (or whether) Font Awesome is loaded in the host DOM.
- The component MUST support both supported configuration modes: kit mode (via kit token,
  enabling Pro/uploads per kit settings) and version-only mode (Free).
- Development requires a developer-created, git-ignored `dev/local.json`; secrets and
  tokens MUST NOT be committed to the repository.

## Development Workflow

- Work proceeds on feature branches; changes are integrated via pull request.
- Before merge, the relevant package's `npm test` (spec + e2e) and `npm run format.check`
  MUST pass.
- Public API changes MUST be reflected in documentation (`readme.md` / `DEVELOPMENT.md`)
  and, when behavior changes, in `CHANGELOG.md`.
- Releases follow the documented procedure in `DEVELOPMENT.md`, updating both packages'
  versions in lockstep and the React package's pinned dependency on the core.

## Governance

This constitution supersedes other ad-hoc practices for this repository. Amendments MUST
be made by updating this document, selecting the correct semantic version bump, and
recording the change in the Sync Impact Report at the top of this file.

- Versioning of this constitution follows semantic rules: MAJOR for backward-incompatible
  governance or principle removals/redefinitions, MINOR for new or materially expanded
  principles/sections, PATCH for clarifications and non-semantic refinements.
- All pull requests and reviews SHOULD verify compliance with these principles;
  deviations MUST be justified in the PR description or refactored to comply.
- Additional complexity beyond what a principle requires MUST be justified by a concrete
  need, not added speculatively.

**Version**: 1.0.0 | **Ratified**: 2026-06-26 | **Last Amended**: 2026-06-26
