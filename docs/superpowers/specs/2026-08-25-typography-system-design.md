# Typography system redesign

## Goal

Give the platform a distinctive modern IT-school voice while improving Cyrillic readability, hierarchy, mobile scaling, and font-loading performance.

## Font roles

- **Manrope Variable:** default UI, navigation, buttons, forms, body copy, and compact labels; weights 400–800.
- **Unbounded Variable:** page heroes, major section titles, course-level names, and rare brand accents; weights 500–700. Never use for paragraphs or dense controls.
- **JetBrains Mono Variable:** time, XP, rankings, counters, code, IDs, and technical metadata.

All fonts are self-hosted through Fontsource packages with Cyrillic support. Remove the Google Fonts request. Use `font-display: swap`, preload only the critical Manrope Cyrillic/Latin variable files if package output allows stable file URLs, and retain system fallbacks.

## Scale and tokens

- Body remains at least `1rem` with unitless `1.5` line-height.
- Display sizes use rem-based `clamp()` tokens and never pure viewport units.
- Major headings use a compact 1.05–1.15 line-height and balanced wrapping.
- Body and descriptions use pretty wrapping and a maximum readable measure of 66ch.
- Human-readable labels never render below `0.6875rem` (11px).
- Numeric data uses tabular figures.

## Hierarchy rules

- Remove decorative italics from page and card titles.
- Replace repeated all-caps/tracking-widest styling with sentence case for normal labels.
- Reserve uppercase with moderate `0.08em` tracking for short eyebrow labels and statuses only.
- Use Unbounded on one dominant title per view, not every heading.
- Use Manrope semibold for card titles and controls; avoid unnecessary 800 weight in dense UI.
- Preserve logos and SVG wordmarks unchanged.

## Responsive and accessibility

- Typography must reflow at 320px and survive 200% zoom without clipping.
- Fixed-height text containers touched by the audit must become content-safe.
- Maintain at least 4.5:1 contrast for normal text.
- Headings remain semantic and ordered.
- No text animation is added.

## Target surfaces

Audit and update the global shell, Dashboard, Courses, Schedule, Community, Notifications, Profile, public profile, Admin, authentication, onboarding, modals, cards, empty/loading states, and shared controls.

## Verification

- Production build succeeds.
- Google Fonts request and direct Inter declarations are removed.
- Browser checks cover 1440px, 390px, 320px, and 200% zoom.
- Slow 3G keeps text visible during font loading with no blank-text period.
- Main screens have one clear dominant heading and readable secondary hierarchy.
