// Bookmarks dumper v3.1 — DOM mode + seamless retry
// Doesn't rely on fetches. Reads tweet data directly from the rendered DOM
// as you scroll. Works even when X has bookmarks cached in memory.
//
// Usage (seamless — recommended for large collections):
//   1. Paste this whole file into the console on x.com/i/bookmarks
//   2. __dumper.autoResume()      ← retries stalls, snapshots, auto-saves
//
// Usage (simple, one-shot):
//   1. Paste this file
//   2. __dumper.autoScroll()      ← stops on first stall
//   3. __dumper.download()

(function () {
  if (window.__dumper) {
    console.log("[dumper] already loaded. count =", window.__dumper.count);
    return;
  }

  const bookmarks = new Map();

  function parseStatNumber(s) {
    if (!s) return null;
    const m = String(s).match(/([\d.,]+)\s*([KMB])?/i);
    if (!m) return null;
    let n = parseFloat(m[1].replace(/,/g, ""));
    const suf = (m[2] || "").toUpperCase();
    if (suf === "K") n *= 1e3;
    if (suf === "M") n *= 1e6;
    if (suf === "B") n *= 1e9;
    return Math.round(n);
  }

  function parseArticle(article) {
    // Find the tweet's permalink (also gives us username + id)
    let id = null;
    let username = null;
    let permalink = null;
    const links = article.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const m = href.match(/^\/([^\/]+)\/status\/(\d+)/);
      if (!m) continue;
      // skip /photo/, /video/, /analytics, /quotes etc.
      if (
        href.includes("/photo/") ||
        href.includes("/video/") ||
        href.includes("/analytics") ||
        href.includes("/likes") ||
        href.includes("/retweets") ||
        href.includes("/quotes")
      )
        continue;
      username = m[1];
      id = m[2];
      permalink = `https://x.com${href.split("?")[0]}`;
      break;
    }
    if (!id) return null;

    // Tweet text
    const textEl = article.querySelector('[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText : "";

    // Timestamp
    const timeEl = article.querySelector("time");
    const created_at = timeEl ? timeEl.getAttribute("datetime") : null;

    // Display name (above the @handle)
    let displayName = null;
    const userNameContainer = article.querySelector(
      '[data-testid="User-Name"]',
    );
    if (userNameContainer) {
      const firstSpanWithText = userNameContainer.querySelector("span span");
      if (firstSpanWithText) displayName = firstSpanWithText.textContent.trim();
    }

    // Media (images / video posters)
    const media = [];
    article.querySelectorAll('img[src*="/media/"]').forEach((img) => {
      media.push({ type: "photo", url: img.src });
    });
    article.querySelectorAll("video").forEach((v) => {
      const poster = v.getAttribute("poster");
      media.push({ type: "video", poster });
    });

    // Stats — the aria-label on the actions group has counts in it,
    // e.g. "12 replies, 34 reposts, 567 likes, 8 bookmarks, 9.1K views"
    let stats = {
      replies: null,
      retweets: null,
      likes: null,
      bookmarks: null,
      views: null,
    };
    const group = article.querySelector('[role="group"]');
    if (group) {
      const label = group.getAttribute("aria-label") || "";
      const re = (re) => {
        const m = label.match(re);
        return m ? parseStatNumber(m[1]) : null;
      };
      stats.replies = re(/([\d.,KMB]+)\s+repl/i);
      stats.retweets = re(/([\d.,KMB]+)\s+repost/i);
      stats.likes = re(/([\d.,KMB]+)\s+like/i);
      stats.bookmarks = re(/([\d.,KMB]+)\s+bookmark/i);
      stats.views = re(/([\d.,KMB]+)\s+view/i);
    }

    // Outbound links
    const outUrls = [];
    article
      .querySelectorAll('[data-testid="card.wrapper"] a, a[href^="https://t.co/"]')
      .forEach((a) => {
        const href = a.getAttribute("href");
        if (href && href.startsWith("http")) outUrls.push(href);
      });

    return {
      id,
      url: permalink,
      author: { username, name: displayName },
      text,
      created_at,
      stats,
      media,
      outbound_urls: outUrls,
    };
  }

  function captureFromDOM() {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    let added = 0;
    for (const article of articles) {
      const t = parseArticle(article);
      if (t && !bookmarks.has(t.id)) {
        bookmarks.set(t.id, t);
        added++;
      }
    }
    if (added > 0) {
      console.log(
        `%c[dumper] +${added} new (total: ${bookmarks.size})`,
        "color:#1d9bf0",
      );
    }
    return added;
  }

  // Initial capture (anything currently rendered)
  const initial = captureFromDOM();
  console.log(
    `[dumper] initial DOM scan found ${initial} tweets currently rendered`,
  );

  // Watch for new article elements as user scrolls and X mounts more
  const observer = new MutationObserver(() => {
    captureFromDOM();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let scrollHandle = null;

  window.__dumper = {
    get count() {
      return bookmarks.size;
    },
    get all() {
      return Array.from(bookmarks.values());
    },

    autoScroll(opts = {}) {
      // Backward compat: if called with positional args (intervalMs, maxStagnant)
      if (typeof opts === "number") {
        opts = { intervalMs: opts, maxStagnant: arguments[1] };
      }
      const {
        intervalMs = 1200,
        maxStagnant = 25,
        snapshotEvery = 0, // 0 = disabled
        onStop = null,
      } = opts;

      if (scrollHandle) {
        console.log("[dumper] already scrolling.");
        return;
      }
      console.log(
        `[dumper] auto-scrolling. Stops after ${maxStagnant} idle ticks${
          snapshotEvery ? `, snapshot every ${snapshotEvery} captures` : ""
        }.`,
      );
      let lastCount = bookmarks.size;
      let lastSnapshot = bookmarks.size;
      let stagnant = 0;
      scrollHandle = setInterval(() => {
        window.scrollBy(0, window.innerHeight * 0.7);
        captureFromDOM();
        if (bookmarks.size === lastCount) {
          stagnant++;
          if (stagnant >= maxStagnant) {
            clearInterval(scrollHandle);
            scrollHandle = null;
            console.log(
              `%c[dumper] stopped. Total: ${bookmarks.size}. Run autoResume() for retry-with-pause, or download() to save.`,
              "color:#1d9bf0;font-weight:bold;font-size:13px",
            );
            if (onStop) onStop();
          }
        } else {
          stagnant = 0;
          lastCount = bookmarks.size;

          if (
            snapshotEvery > 0 &&
            bookmarks.size - lastSnapshot >= snapshotEvery
          ) {
            window.__dumper.download(
              `bookmarks-checkpoint-${bookmarks.size}.json`,
            );
            lastSnapshot = bookmarks.size;
          }
        }
      }, intervalMs);
    },

    // Seamless mode: keeps scrolling, auto-pauses on stalls, retries, snapshots,
    // and only stops after N consecutive empty rounds (real end of feed).
    async autoResume(opts = {}) {
      const {
        pauseMinutes = 3,
        maxIdleRetries = 3,
        snapshotEvery = 500,
        intervalMs = 1200,
        maxStagnant = 25,
      } = opts;

      console.log(
        `%c[dumper] autoResume started — pause ${pauseMinutes}min between rounds, give up after ${maxIdleRetries} empty rounds.`,
        "color:#1d9bf0;font-weight:bold",
      );

      let idleRetries = 0;
      let round = 0;

      while (idleRetries < maxIdleRetries) {
        round++;
        const before = bookmarks.size;
        console.log(`[dumper] round ${round} starting (have ${before})`);

        await new Promise((resolve) => {
          this.autoScroll({
            intervalMs,
            maxStagnant,
            snapshotEvery,
            onStop: resolve,
          });
        });

        const gained = bookmarks.size - before;
        console.log(
          `[dumper] round ${round} stopped: +${gained} new (total ${bookmarks.size})`,
        );

        if (gained === 0) {
          idleRetries++;
          if (idleRetries >= maxIdleRetries) {
            console.log(
              `%c[dumper] truly at end. Final: ${bookmarks.size}. Auto-saving.`,
              "color:#1d9bf0;font-weight:bold;font-size:13px",
            );
            this.download();
            return;
          }
          console.log(
            `[dumper] empty round ${idleRetries}/${maxIdleRetries}. Pausing ${pauseMinutes}min before retry.`,
          );
        } else {
          idleRetries = 0;
          console.log(
            `[dumper] gained ${gained}. Pausing ${pauseMinutes}min before next round.`,
          );
        }

        await new Promise((r) => setTimeout(r, pauseMinutes * 60_000));
      }
    },

    stop() {
      if (scrollHandle) {
        clearInterval(scrollHandle);
        scrollHandle = null;
        console.log(`[dumper] stopped at ${bookmarks.size}.`);
      }
    },

    rescan() {
      const before = bookmarks.size;
      captureFromDOM();
      console.log(
        `[dumper] rescanned. delta: ${bookmarks.size - before} (total ${bookmarks.size})`,
      );
    },

    download(filename) {
      const data = JSON.stringify(
        Array.from(bookmarks.values()),
        null,
        2,
      );
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download =
        filename ||
        `bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log(
        `[dumper] downloaded ${bookmarks.size} bookmarks → ${a.download}`,
      );
    },
  };

  console.log(
    "%c[dumper v3.1 / DOM mode] ready ✓",
    "color:#1d9bf0;font-weight:bold;font-size:13px",
  );
  console.log("MutationObserver active. Currently captured:", bookmarks.size);
  console.log("Two ways to run:");
  console.log("  __dumper.autoResume()   ← seamless: retries on stalls, auto-snapshots, auto-saves at end");
  console.log("  __dumper.autoScroll()   ← simple: stops on first stall");
})();
