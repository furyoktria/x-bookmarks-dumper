# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

---

## [v3.1.0] — 2026-05-10

Seamless mode for big collections.

### Added
- **`__dumper.autoResume(opts)`** — multi-round runner. Auto-scrolls, pauses on stalls, retries after a configurable wait, takes periodic snapshots, and only stops after N consecutive empty rounds (real end of feed). Auto-downloads the final JSON.
- **Snapshot support in `autoScroll`** — pass `{ snapshotEvery: 500 }` to download a checkpoint every N captures. Loss-tolerant for huge dumps.
- **Stop callback** — `autoScroll({ onStop })` for chaining (used internally by `autoResume`).

### Changed
- `autoScroll` default `maxStagnant`: **10 → 25**. Less false-positive stops when X is just slow to paginate.
- `autoScroll` API now accepts an options object: `autoScroll({ intervalMs, maxStagnant, snapshotEvery, onStop })`. Old positional args still work for backwards compat.

### Why
Reports of the dumper stopping prematurely on collections with 1k+ bookmarks. Root cause: X paginates inconsistently — sometimes 10s between batches — and `maxStagnant: 10` declared "done" before X had a chance to load more. The fix is patience plus retry-with-pause for genuine rate limits.

---

## [v3.0.0] — 2026-05-10

The version that actually works.

### Changed
- **Switched from network interception to DOM scraping.** Hooks a `MutationObserver` on `document.body` and parses each `<article data-testid="tweet">` element as it mounts during scroll. Doesn't depend on fetches firing at all.
- Removed `fetch` and `XMLHttpRequest` interception (no longer needed).

### Why
v2 reliably captured **zero** bookmarks. `__dumper.debug()` confirmed no GraphQL, bookmark, or timeline URLs were intercepted at all — meaning X had everything cached client-side and scrolling rendered from in-memory state instead of refetching. DOM scraping bypasses the network layer entirely; we just read what's on screen.

### Trade-offs vs v2
- ✅ Works regardless of cache state, Service Workers, or what X does on the network
- ✅ Survives X's future GraphQL endpoint renames
- ✅ No anti-bot transaction-ID problem (we make no requests)
- ❌ Loses the rich `_raw` GraphQL payload (we only get fields the UI renders)
- ❌ Stat counts are rounded as the UI displays them (`9.1K` becomes `9100`)

---

## [v2.0.0] — 2026-05-10

### Added
- Permissive URL matcher: any `/graphql/`, anything containing `bookmark`, or `/timeline/`
- `XMLHttpRequest` interception in addition to `fetch` (in case X mixes transports)
- Recursive tweet-finder that walks any response shape looking for tweet-like objects (`rest_id` + a `legacy` block with text)
- `__dumper.debug()` to dump intercepted URLs and capture events for diagnosis

### Why
v1 was too narrow — it only matched `/Bookmarks?` exactly. v2 was meant to catch any endpoint shape X might use, plus surface diagnostics so we could see *why* nothing was captured.

### Result
Still zero bookmarks. The `debug()` output told the real story: no fetches were firing during scroll. v2's improvements weren't wrong — they were solving the wrong layer of the problem.

---

## [v1.0.0] — 2026-05-10

### Added
- Initial console script that hooks `window.fetch`, intercepts responses to `/Bookmarks?`, parses `bookmark_timeline_v2` instructions, collects unique tweets into a `Map`
- `__dumper.autoScroll()` — auto-scroll the page so X paginates more bookmarks
- `__dumper.download()` — save the Map as JSON to disk

### Why
Started here because GraphQL interception would give the cleanest, richest data — every internal field X computes per tweet.

### Result
Worked in theory, didn't in practice. X's bookmarks were already in client memory and scrolling never triggered new fetches. v2 added more nets; v3 changed the layer.

---

## Pre-v1: failed Python attempts

Before going to the browser console, I tried:

1. **[`twikit`](https://github.com/d60/twikit) (Python).** Failed with `Couldn't get KEY_BYTE indices`. X had changed the home-page HTML structure that twikit's transaction-ID generator parses. The library was a generation behind the live site.
2. **Considered [`twscrape`](https://github.com/vladkens/twscrape), `tweety-ns`, raw `httpx` + GraphQL.** All of these still need to compute X's `x-client-transaction-id` header, which means parsing X's obfuscated client JS. Same root issue, would have hit the same wall. Skipped.
3. **Considered Playwright.** Would have worked (real browser → real transaction IDs computed natively) but felt like overkill for a one-off personal dump. Saved for a future server-side scraper.

The console route is faster, lighter, and uses the already-authenticated session in your browser. Lesson: when X locks down the API, the easiest place to read your own data is the page that's already showing it to you.
