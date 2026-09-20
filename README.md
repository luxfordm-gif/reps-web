# Reps — marketing site

The landing page for [Reps](https://github.com/luxfordm-gif/reps), a workout
tracker that reads the training plan your coach already wrote.

Static HTML, CSS and a little JavaScript. No build step: open `index.html`, or
serve the folder.

```bash
npx http-server -p 5300
```

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The whole page |
| `styles.css` | Design tokens and every rule. Tokens mirror the app's `tailwind.config.js` so the site and the product agree |
| `main.js` | Sticky-nav hairline, scroll reveals, the calculator cross-fade and the count-ups. Entirely optional — the page reads fine without it |
| `assets/shots/` | Screenshots of the real app, captured at 1170×2532 (iPhone, 3×) |
| `assets/` | Wordmark and icons, copied from the app |

## Screenshots

The phone screenshots are captured from the app's own components rather than
mocked up, using [`capture-website`](https://github.com/sindresorhus/capture-website)
(the only dependency). Every screen is captured at a 390×844 viewport at 3× so
the frames keep true iPhone proportions; `.phone img` pins `aspect-ratio` to
1170/2532 as a backstop.

## Deploying

Netlify, configured in `netlify.toml`. No build step — the repo root is the
publish directory.

To connect it: Netlify → **Add new site** → **Import an existing project** →
GitHub → `reps-web`. The settings come from `netlify.toml`, so leave the build
command empty and the publish directory as `.`.

The config also sets security headers and a Content-Security-Policy. The CSP
pins a `sha256` hash of the single inline script in `index.html` (the one that
sets the `.js` class before first paint). **If you edit that line, recompute
the hash**, or the script is blocked and every animated element stays hidden:

```bash
printf "%s" "document.documentElement.classList.add('js');" | openssl dgst -sha256 -binary | openssl base64
```

Stagger indices live in `styles.css` as `:nth-child` rules rather than
`style="--i:n"` attributes, so the CSP can forbid inline styles outright.

## Notes

- Light and dark both supported, from semantic tokens.
- Body text runs at 4.86:1 on light and 7.44:1 on dark.
- All motion is behind `prefers-reduced-motion`, and anything JS animates is
  hidden only under a `.js` class, so the page is complete without scripting.
- The "Join for free" CTA is still `href="#"`, pending the deployed app URL.
