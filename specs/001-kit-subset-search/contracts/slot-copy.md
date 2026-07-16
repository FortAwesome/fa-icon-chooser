# Contract: kit-branded default slot copy

This feature changes `slotDefaults` in `packages/fa-icon-chooser/src/utils/slots.tsx` from a
static object into a **generator function**, and personalizes three slots in kit mode. The
named slots themselves are unchanged public API — consumers can still override any of this
copy by supplying slotted content. Only the **default** copy (used when a slot is not
overridden) changes, and only in kit mode.

## Signature

```ts
type SlotDefaultsParams = { kitToken?: string; name?: string };

// Returns the same shape of default-copy map it returns today.
function slotDefaults(params?: SlotDefaultsParams): { [slotName: string]: string | JSX.Element };
```

- Called with no argument, `{}`, or a params object whose `kitToken` is falsy/empty → **non-kit
  mode**: every entry equals today's copy exactly.
- Called with a truthy `kitToken` → **kit mode**: the three entries below are personalized;
  all other entries are identical to non-kit mode.
- MUST NOT throw for any input, including a missing/empty `name` (FR-016).

## Kit-name truncation (FR-017 / SC-011)

```ts
function truncateKitName(name?: string, max = 30): string; // in utils.ts
```

- `name` with length ≤ 30 → returned unchanged, no ellipsis.
- `name` with length > 30 → first 30 characters + `'…'` (the ellipsis is not counted toward the 30).
- Missing/empty `name` → `''`.

## Personalized slots (kit mode only)

Let `N = truncateKitName(name)` and `T = kitToken`.

| Slot | Kit-mode default | Non-kit default (unchanged) |
|------|------------------|------------------------------|
| `searching-pro` | `You're searching the icons in your {N} Kit ({T}) set to Font Awesome Version` | `You're searching Font Awesome Pro icons in version` |
| `searching-free` | `You're searching the icons in your {N} Kit ({T}) set to Font Awesome Version` | `You're searching Font Awesome Free icons in version` |
| `start-view-heading` | `Add Icons from Your Font Awesome {N} Kit` | (current library-wide heading, unchanged) |
| `start-view-detail` | `Search your Kit's icons or browse them by style. Need to add or remove icons? Head to fontawesome.com/kits to update your Kit.` | (current library-wide detail, unchanged) |

Notes:
- The render appends the resolved version after the `searching-*` slot
  (`{slot('searching-…')} {version}`), so the kit-mode status line reads
  "…set to Font Awesome Version 6.x.x".
- `searching-pro` and `searching-free` share the same kit-mode string: in kit mode the line
  describes the kit (name + token), independent of Free/Pro license.

## Invocation sequencing

- `setupSlots(params?: SlotDefaultsParams)` forwards its params to `slotDefaults(params)`.
- The component MUST call `this.setupSlots({ kitToken: this.kitToken, name: kitMetadata?.name })`
  **after** `preload()` resolves, so the kit `name`/token are loaded before the defaults are
  computed. In non-kit mode `preload()` loads nothing kit-related and `setupSlots` is invoked
  with an empty/absent `name` and no `kitToken`, yielding today's copy.
