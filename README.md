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
pins a `sha256` hash of every inline script on the site, and there are two: the
one in `index.html` that sets the `.js` class before first paint, and the gtag
bootstrap that appears on all four pages. **If you edit either, recompute its
hash**, or the script is blocked — for the first that means every animated
element stays hidden, and for the second that analytics quietly stop. This
prints the hash of each inline script it finds, so the output can be compared
against the `script-src` list:

```bash
python3 -c "
import re, hashlib, base64
for f in ['index.html', 'thanks.html', 'thanks-notify.html', 'thanks-coach.html']:
    for b in re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', open(f).read(), re.S):
        print(f, 'sha256-' + base64.b64encode(hashlib.sha256(b.encode()).digest()).decode())
"
```

Stagger indices live in `styles.css` as `:nth-child` rules rather than
`style="--i:n"` attributes, so the CSP can forbid inline styles outright.

## Analytics

Google Analytics 4 (property `G-B41RFPJ6BQ`), as the standard gtag snippet in
the `<head>` of `index.html`, `thanks.html`, `thanks-notify.html` and
`thanks-coach.html`. The thanks pages are the only signal that a request actually went through, so they
are worth counting; `tools/og.html` is a local screenshot rig and is left out.

The CSP has to allow all of it — `www.googletagmanager.com` to load the script,
and `*.google-analytics.com` / `*.analytics.google.com` to receive the beacons.
Those last two are wildcards on purpose: GA4 routes collection through a
regional host (`region1.google-analytics.com` from the UK), so pinning the
literal `www.google-analytics.com` would pass a local test and then drop every
hit in production.

Two things this setup does not do yet. It fires before any consent, which UK
PECR expects for analytics cookies — Consent Mode v2 or a small banner would
settle that. And it records page views only, so form submissions are inferred
from thanks-page views rather than measured; marking those as key events in the
GA4 admin is the cheapest way to get a conversion number.

## Social share card

`assets/og.png` (2400×1260, the 1.91:1 ratio platforms crop to) is generated
from `tools/og.html`, so it can be rebuilt when the page changes:

```bash
npx http-server -p 5300      # in one shell
node tools/shoot-og.mjs      # in another
```

**The Open Graph tags hard-code the site URL.** Scrapers need an absolute
`og:image` and show nothing if it 404s, so if the deployed domain is not
`getrepsapp.app`, update every `https://getrepsapp.app` in `index.html` to
match. The canonical points at the apex, so whichever of the apex and `www`
is set primary in Netlify has to be the one named here.

## Notes

- Light and dark both supported, from semantic tokens.
- Body text runs at 4.86:1 on light and 7.44:1 on dark.
- All motion is behind `prefers-reduced-motion`, and anything JS animates is
  hidden only under a `.js` class, so the page is complete without scripting.
- Access is by request. The CTAs point at the form in `#request`, which posts
  to **Netlify Forms** (form name: `access`). The app URL is deliberately not
  on the site — signup in the app is open, so a link would be an open door.

  **Turn on the email notification** in Netlify → Forms → Settings, or
  submissions sit in the dashboard and nobody hears about them. The CSP sets
  `form-action 'self'`; tightening it back to `'none'` breaks the form.

  The form collects name, email, phone (`device`) and default browser
  (`browser`), plus the two consent boxes. Netlify reads a form's fields off
  the deployed HTML, so a new field only appears in submissions — and as a
  column in the CSV export — from the deploy that added it onwards; requests
  already in the dashboard keep the shape they were sent with.
- Coaches have their own form, `coach` (name and email), behind the line under
  the access form. They can't honestly tick the plan checkbox, and one coach can
  bring several clients, so it's kept separate. It posts to `thanks-coach.html`.
