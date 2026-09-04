# Tightline — marketing site

Follow-up automation for fishing charters, hunting guides, and outfitters.
Single-page marketing site: static HTML, CSS, and vanilla JavaScript. No build step.

Live: https://armon-jpg.github.io/tightline/ (GitHub Pages, served from the `main` branch root).

## Run it

Any static server works. From this folder:

    python -m http.server 8731

then open http://localhost:8731. Opening `index.html` directly from disk also works
(fonts load from Google Fonts, everything else is local).

## Files

- `index.html` — the page. Sections in order: hero, integrations strip, the 48-hour window,
  how it works (sticky phone), what it does (five feature deep-dives), your side of it
  (recap text + dashboard), results, pricing (tiers, off-season mode, guarantee, calculator),
  setup (steps, voice picker, what we don't do), FAQ, closing CTA, footer, and the
  sign-up modal (onboarding preview).
- `css/styles.css` — design tokens at the top (`:root`), then one block per section.
  Dark sections use the `.theme-dark` class, which swaps the semantic color variables.
- `js/main.js` — nav, reveal-on-scroll, counters, the contour-line canvas (3D simplex
  noise + marching squares), the animated text threads, scroll-driven step activation,
  pricing toggle, calculator, voice picker, live clock, and the modal.
- `assets/favicon.svg` — the mark (a float on a line).
- `.claude/launch.json` — local preview config.

## Brand

- Type: Archivo (variable width; display set condensed), Instrument Serif italic for accents,
  IBM Plex Mono for labels and timestamps.
- Color: deep-water ink `#0B1917`, cream paper `#F4EFE4`, blaze orange `#F4581C`
  (the one color anglers and hunters share), teal `#2C8C86`.
- Motif: contour lines. Bathymetry for the fishing side, topo for the hunting side.

## Placeholders to replace before launch

- Testimonials, operator names, review counts, and the per-100-trips numbers are illustrative.
- Phone numbers `(843) 555-0142` / `(305) 555-0199`, the `tl.ink` short links, and
  `g.page/reel-therapy/review` are placeholders.
- `assets/og.png` is referenced in the Open Graph tags but not included.
- Booking-platform names are used as text only; confirm partner/trademark usage.
- The sign-up modal is a front-end preview. It does not post anywhere.
- "Log in", "Talk to us", and footer links are inert (`href="#"`).

## Notes on the copy claims

Review solicitation is described as "everyone gets asked" with a private line back to the
operator. That is deliberate: selectively soliciting positive reviews (review gating) violates
Google's policy, so the product story avoids it. Referral rewards are credits, not cash for
reviews. SMS consent, quiet hours, and one-word opt-out are called out for TCPA reasons.
