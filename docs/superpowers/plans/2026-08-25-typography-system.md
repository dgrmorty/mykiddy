# Typography System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace generic Inter typography with a self-hosted, responsive Manrope/Unbounded/JetBrains Mono system across the complete application.

**Architecture:** Fontsource variable packages provide local WOFF2 assets. Tailwind tokens and global CSS define the roles and fluid scale; component edits apply semantic roles and remove accumulated microtype anti-patterns without changing application behavior.

**Tech Stack:** React, TypeScript, Tailwind CSS, Fontsource variable fonts, Vite.

## Global Constraints

- Manrope is the UI/body family, Unbounded is sparse display type, and JetBrains Mono is numeric/technical type.
- Body is at least 1rem/1.5; human-readable labels are at least 0.6875rem.
- Display sizes use rem-based clamp tokens.
- Unbounded appears on one dominant title per view and never on paragraphs or dense controls.
- Remove decorative title italics and excessive uppercase/tracking-widest.
- Preserve all application behavior and current motion.
- Do not commit, stage, stash, reset, or revert.

---

### Task 1: Font delivery and global tokens

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `index.tsx`
- Modify: `index.html`
- Modify: `tailwind.config.js`
- Modify: `styles/globals.css`

- [ ] Install `@fontsource-variable/manrope`, `@fontsource-variable/unbounded`, and `@fontsource-variable/jetbrains-mono` through npm.
- [ ] Import each variable family’s Cyrillic and Latin CSS entry from `index.tsx`; remove the Google Fonts stylesheet/preconnects from `index.html`.
- [ ] Map Tailwind `sans`, `display`, and `mono` to the three families with system fallbacks.
- [ ] Define rem-based fluid type tokens, readable measure, balanced headings, pretty body wrapping, tabular figures, `font-synthesis: none`, and `font-optical-sizing: auto`.
- [ ] Run `npm run build`; expected exit 0.

### Task 2: Application-wide hierarchy audit

**Files:**
- Modify shared components and active `views/*.tsx` files containing typography classes.
- Exclude archived `views/AdminPanel.old.tsx` and temporary files.

- [ ] Give each major view exactly one dominant Unbounded title; keep secondary headings in Manrope.
- [ ] Remove decorative italic page/card titles.
- [ ] Convert normal labels from uppercase/tracking-widest to sentence case; retain moderate caps only for short eyebrows/statuses.
- [ ] Replace 9–10px human-readable labels with at least 11px; keep purely decorative marks exempt.
- [ ] Apply mono role to times, XP, rankings, IDs, counters, and code.
- [ ] Add readable measures to descriptions and content-safe wrapping where current fixed/truncated settings clip important text.
- [ ] Run `npm run build` and `npm run lint`; identify pre-existing lint failures separately.

### Task 3: Responsive and production verification

**Files:**
- Modify: `index.html` build ID.

- [ ] Check Dashboard, Courses, Schedule, Community, Notifications, Profile, Admin, Auth, and onboarding at 1440px, 390px, and 320px.
- [ ] Check 200% zoom for clipping and horizontal overflow.
- [ ] Emulate Slow 3G and verify immediate fallback text with no invisible-font period.
- [ ] Set build ID to `typography-system-v1-2026-08-25`.
- [ ] Run `npm run build`, deploy via Railway, wait for `SUCCESS`, and verify the production build marker.
