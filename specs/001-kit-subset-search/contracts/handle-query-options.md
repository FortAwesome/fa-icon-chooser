# Contract: `handleQuery` options (caching) — kit mode

The component already calls the consumer-supplied callback as:

```ts
type QueryHandler = (document: string, variables?: object, options?: object) => Promise<any>;
```

This feature uses the third `options` argument to convey caching intent. No signature change — `options` is already part of the type and already used (`{ cache: true }` on the kit-metadata query). This is backward compatible.

## Options by query (kit mode)

| Query | `options` passed | Cached? | Cache key semantics |
|-------|------------------|---------|---------------------|
| `KitMetadata` | `{ cache: true }` | yes (unchanged) | Host-defined; token-scoped is sufficient (response carries `showcaseCacheKey`). |
| `ShowcaseIcons` | `{ cache: true, cacheKey: "<showcaseCacheKey>" }` | yes | `<showcaseCacheKey>` is the single value read from `Kit.showcaseCacheKey`. Reuse for an unchanged kit; refresh when the kit changes and the key changes (FR-010). The host disambiguates per-family-style requests by the request `variables` (the selector). |
| `SearchKit` | `{}` (or omitted) | no | Search is not cached, matching legacy `search`. |

## Host responsibilities (unchanged model — Constitution Principle II)

- The host's `handleQuery` owns the network request, authorization (`kits_read` scope), and the actual cache implementation.
- When `options.cache === true`, the host MAY cache the response.
- When `options.cacheKey` is present, the host SHOULD use it as the cache identity. A host that ignores `cacheKey` remains correct — it simply caches less precisely (e.g. token-only) or not at all.

## Why a kit-provided `cacheKey` rather than a GraphQL variable

`Kit.showcaseIcons` takes no cache-busting argument, so a revision/identity value cannot be a *used* GraphQL variable to differentiate cache entries. The server now provides `Kit.showcaseCacheKey` — a single value that changes when the kit changes. The component reads it from the kit-metadata response and passes it through `options.cacheKey`, letting the host key the cache on it without changing the query contract. This replaces the earlier `token:revision:showcase:prefix` composite the component used to build itself.

Because every family-style's showcase request for a given kit carries the *same* `showcaseCacheKey`, the host should combine it with the request `variables` (which include the family-style `selector`) so distinct family-styles do not collide in the cache.

## Example (illustrative host implementation)

```js
const cache = new Map();
async function handleQuery(document, variables, options = {}) {
  // Combine the kit-provided cacheKey with the request variables so per-family-style
  // showcase requests (which share one showcaseCacheKey) are cached distinctly.
  const key = options.cacheKey
    ? options.cacheKey + ':' + JSON.stringify(variables)
    : JSON.stringify([document, variables]);
  if (options.cache && cache.has(key)) return cache.get(key);
  const res = await fetch('https://api.fontawesome.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ query: document, variables }),
  }).then(r => r.json());
  if (options.cache) cache.set(key, res);
  return res;
}
```
