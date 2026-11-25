# Parent Pass

Your pass into the games your kids play.

Clear, practical guides for parents to Roblox, Brawl Stars, Minecraft, Fortnite and YouTube: what children actually do, what's popular right now, the real risks, and step-by-step parental controls. A "Not yet" page covers popular games rated for older children, and a "Get ahead" page has a 5-week family online-safety course.

## How the site is built

- **Edit only `src/site.html`.** It holds every page as a `<section class="page" id="...">` with `data-title` and `data-desc`.
- `node build.js` turns it into one page per section in `dist/` (for example `/roblox/`, `/youtube/`, `/not-yet/`), rewrites `#links` to the right page, and writes `sitemap.xml`. Netlify runs this automatically on every deploy (see `netlify.toml`).
- `src/site.html` also works on its own as a single-page preview: open it in a browser.
- `public/` is copied as it is: self-hosted fonts (SIL Open Font License, see `public/fonts/`), `robots.txt` and the Google Search Console verification file (do not delete it).
- The feedback form uses Netlify Forms (form name `feedback`). Messages appear in Netlify under Forms.
- Visitor counts: set `GOATCOUNTER` in `build.js` to the GoatCounter site code to switch on cookie-free counting.

## Checks

- "Right now" notes and the "Coming soon" box are checked weekly; parental-control steps, age ratings, contacts and links are fact-checked monthly. Changes arrive as pull requests to approve.
