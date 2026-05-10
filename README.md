# x-bookmarks-dumper

A tiny browser-console script to export **all your X (Twitter) bookmarks** to JSON.

No API keys. No Python. No paid tier. Paste it into DevTools on `x.com/i/bookmarks`, scroll, download the JSON.

---

## Why I built this

X removed bookmarks from the official archive download. So if you want your own bookmarks as data, you have two paths:

1. Pay **$200/month** for the X API Basic tier
2. Scrape it yourself

I went down path 2 in May 2026. First I tried Python with [`twikit`](https://github.com/d60/twikit) — broke immediately on X's anti-bot transaction-ID generation. Then I tried hooking `fetch` from the browser console — captured zero, because X had already cached my bookmarks client-side and scrolling fired no network calls. Then I gave up on intercepting the network entirely and just read the rendered DOM. That worked.

The full debugging journey is in [`CHANGELOG.md`](CHANGELOG.md). TL;DR: **when the network layer is locked down, read the DOM.**

---

## Usage

1. Open [https://x.com/i/bookmarks](https://x.com/i/bookmarks) (logged in)
2. Open DevTools console
   - macOS: `⌘ + ⌥ + J`
   - Windows / Linux: `Ctrl + Shift + J`
3. If X warns about pasting, type `allow pasting` and hit Enter
4. Paste the contents of [`bookmarks_dumper.js`](bookmarks_dumper.js) into the console, hit Enter
5. Run:
   ```javascript
   __dumper.autoScroll()
   ```
6. Wait for the "done" message (could be minutes or hours depending on count)
7. Save:
   ```javascript
   __dumper.download()
   ```

A file like `bookmarks-2026-05-10.json` lands in your Downloads folder.

---

## What you get

Each bookmark in the output JSON looks like this:

```json
{
  "id": "1234567890",
  "url": "https://x.com/example/status/1234567890",
  "author": { "username": "example", "name": "Example User" },
  "text": "the tweet body",
  "created_at": "2024-12-01T10:23:45.000Z",
  "stats": {
    "replies": 12,
    "retweets": 34,
    "likes": 567,
    "bookmarks": 8,
    "views": 9100
  },
  "media": [{ "type": "photo", "url": "..." }],
  "outbound_urls": ["https://t.co/..."]
}
```

---

## API reference

Once the script is loaded, `window.__dumper` exposes:

| Call | What it does |
|---|---|
| `__dumper.count` | Current count of captured bookmarks (live) |
| `__dumper.all` | Array of all captured bookmarks |
| `__dumper.autoScroll()` | Auto-scroll until no new bookmarks appear for 10 idle ticks |
| `__dumper.stop()` | Halt auto-scroll early; keep what's captured |
| `__dumper.rescan()` | Re-parse currently rendered DOM (manual sweep) |
| `__dumper.download(filename?)` | Save captured bookmarks as JSON to Downloads |

---

## Tips

- **Keep DevTools open.** Chrome throttles background tabs less when DevTools is attached.
- **Don't switch tabs in Chrome** during auto-scroll. Switching apps (`⌘+Tab`) is fine; switching to another X tab freezes the dumper tab's timers.
- **Big collections (10k+):** call `__dumper.download()` periodically as a snapshot. Auto-scroll keeps going. Insurance against tab crashes.
- **Resume after rate-limit:** if scroll stops early, wait 5–10 minutes and run `__dumper.autoScroll()` again. It picks up from the current scroll position and deduplicates by ID.

---

## Sorting the output

The JSON is in capture order (newest-bookmarked first by default). To flip:

```bash
# Oldest tweet first (by tweet creation date)
jq 'sort_by(.created_at)' bookmarks.json > bookmarks_chrono.json

# Or: oldest-bookmarked first (just reverse capture order)
jq 'reverse' bookmarks.json > bookmarks_oldest_first.json
```

---

## Limitations

- **Capture order is fixed** — X paginates newest-bookmarked first. There is no "start from oldest" parameter on their API. Sort post-hoc.
- **No raw GraphQL payload** — DOM mode reads only what the UI renders. No `lang` field, no quoted-tweet trees, no precise view counts beyond the displayed `K`/`M` rounding.
- **x.com only** (or `twitter.com` if X ever resurrects the legacy domain).
- **One-time dumps** — not designed for incremental sync. For recurring captures you'd want a server-side scraper, which is a different beast.

---

## License

MIT — see [`LICENSE`](LICENSE).

---

## Author

Built by [Furyoktria](https://github.com/furyoktria) in May 2026 because X's anti-bot stack defeated every easy path. Documenting the debugging journey here in case it saves someone else a few hours.

If this script breaks against future X changes, PRs welcome. The DOM selectors are the most likely thing to drift — see `parseArticle()` in [`bookmarks_dumper.js`](bookmarks_dumper.js).
