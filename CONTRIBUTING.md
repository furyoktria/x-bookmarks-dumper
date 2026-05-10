# Contributing to x-bookmarks-dumper

Thanks for considering a contribution! Here's how it works.

## The flow

This repo follows the standard **fork & pull request** model. Only the repo owner has merge authority — your contribution gets reviewed and merged by [@furyoktria](https://github.com/furyoktria).

### Step by step

1. **Fork** this repo (top-right "Fork" button)
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/x-bookmarks-dumper.git
   cd x-bookmarks-dumper
   ```
3. **Branch** for your change:
   ```bash
   git checkout -b fix/some-short-description
   ```
4. **Edit, commit, push** to your fork:
   ```bash
   git add .
   git commit -m "fix: short description of the change"
   git push origin fix/some-short-description
   ```
5. **Open a pull request** from your fork to `furyoktria/x-bookmarks-dumper:main`
6. Fill in the PR template
7. Wait for review. Only the maintainer can merge.

## What I look for in a PR

- **Clear title** with a conventional prefix: `fix:`, `feat:`, `docs:`, `chore:`, `refactor:`
- **Why, not just what** — explain the problem you're solving in the description
- **Smallest possible diff** — one concern per PR
- **Manual test notes** — how you verified the change works on x.com (count of bookmarks captured, browser used, etc.)

## What's likely to get merged

- Fixes for broken DOM selectors after X UI changes
- Performance improvements (faster scroll, less memory)
- New utility methods on `__dumper`
- Documentation improvements
- Bug reports → fixes

## What's unlikely to get merged

- Heavy dependencies — this project is intentionally a single paste-able file
- Build tooling, bundlers, transpilers
- Account-credential handling — we deliberately do not touch cookies or tokens
- Features that turn this into a server-side scraper — that's a different project; fork it instead

## Reporting bugs

Open an issue using the bug-report template. Include:
- What X is showing on screen
- What `__dumper.count` reports
- Console errors (if any) — **never paste anything containing your `auth_token` or `ct0` cookie values**
- Browser + OS

## Code style

- 2-space indent, double quotes, semicolons
- Match the surrounding style
- Comments only for the "why" of non-obvious code — no prose docstrings

## License

By submitting a PR, you agree your contribution will be licensed under [MIT](LICENSE), same as the rest of the repo.
