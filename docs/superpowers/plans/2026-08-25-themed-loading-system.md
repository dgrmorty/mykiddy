# Themed Loading System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every user-visible loading spinner with one lightweight laptop/code/cherry loading language that remains clear on slow networks.

**Architecture:** A CSS-only `ThemedLoader` owns the reusable React variants and delayed slow-network copy. The pre-React loader in `index.html` duplicates the same SVG geometry and critical CSS so it renders before the bundle; all data screens and controls consume the React component.

**Tech Stack:** React 18, TypeScript, inline SVG, Tailwind CSS, project-global CSS, Vite.

## Global Constraints

- Use inline SVG and CSS only; no GSAP, JavaScript animation loop, image, font, or remote asset dependency.
- Boot scene is 120px, fullscreen scene is 112px, section scene is 80px, and inline indicator is 20px.
- After exactly 5 seconds, non-inline variants show `Сеть отвечает медленнее обычного`.
- Loading copy uses `role="status"` and `aria-live="polite"`.
- Animate only `stroke-dashoffset`, `opacity`, and `transform`.
- Under `prefers-reduced-motion`, show the complete laptop and only pulse cursor opacity.
- Preserve all existing loading/error/data branching; this project has no automated test runner, so each task uses typecheck/build plus focused browser checks.

---

### Task 1: Reusable laptop loader

**Files:**
- Create: `components/ui/ThemedLoader.tsx`
- Modify: `styles/globals.css`
- Delete: `components/ui/BrandLoaderSvg.tsx`
- Delete: `components/ui/AnimatedLearningScene.tsx`
- Modify: `components/ui/AnimatedEmptyState.tsx`
- Modify: `views/CourseDetail.tsx`

**Interfaces:**
- Produces:

```ts
type ThemedLoaderProps =
  | { variant: 'inline'; className?: string; message?: never }
  | { variant?: 'section' | 'fullscreen'; className?: string; message: string };

export const ThemedLoader: React.FC<ThemedLoaderProps>;
```

- `AnimatedEmptyState` remains source-compatible as `React.FC<{ message?: string }>` and delegates to `ThemedLoader variant="section"`.

- [ ] **Step 1: Create the typed loader shell and delayed message behavior**

Implement `ThemedLoader.tsx` with a `slow` state and cleanup-safe timer:

```tsx
import React, { useEffect, useState } from 'react';

type ThemedLoaderProps =
  | { variant: 'inline'; className?: string; message?: never }
  | { variant?: 'section' | 'fullscreen'; className?: string; message: string };

export const ThemedLoader: React.FC<ThemedLoaderProps> = (props) => {
  const variant = props.variant ?? 'section';
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (variant === 'inline') return;
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 5000);
    return () => window.clearTimeout(timer);
  }, [variant, props.message]);

  const size = variant === 'fullscreen' ? 112 : variant === 'section' ? 80 : 20;
  // Return the SVG below; inline renders no copy.
};
```

- [ ] **Step 2: Add the exact SVG scene**

Define an internal `LoaderArtwork({ size }: { size: number })` component using a `viewBox="0 0 120 96"` with these named geometry groups so boot and React loaders can match:

```tsx
const LoaderArtwork: React.FC<{ size: number }> = ({ size }) => (
<svg className="themed-loader__svg" viewBox="0 0 120 96" width={size} height={size * 0.8} aria-hidden="true">
  <path pathLength="1" className="themed-loader__lid" d="M28 14h64a6 6 0 0 1 6 6v46H22V20a6 6 0 0 1 6-6Z" />
  <path pathLength="1" className="themed-loader__screen" d="M29 22h62v36H29z" />
  <path pathLength="1" className="themed-loader__base" d="M15 68h90l-7 10H22l-7-10Z" />
  <path pathLength="1" className="themed-loader__code themed-loader__code--one" d="M38 34h20" />
  <path pathLength="1" className="themed-loader__code themed-loader__code--two" d="M38 42h35" />
  <path pathLength="1" className="themed-loader__code themed-loader__code--three" d="M38 50h26" />
  <circle className="themed-loader__cursor" cx="70" cy="50" r="2.5" />
</svg>
);
```

Wrap non-inline variants in:

```tsx
<div className={`themed-loader themed-loader--${variant} ${props.className ?? ''}`} role="status" aria-live="polite">
  {/* SVG */}
  <p className="themed-loader__message">{props.message}</p>
  {slow && <p className="themed-loader__slow">Сеть отвечает медленнее обычного</p>}
</div>
```

For the inline branch, keep the control accessible:

```tsx
<span
  className={`themed-loader themed-loader--inline ${props.className ?? ''}`}
  role="status"
  aria-label="Загрузка"
>
  <LoaderArtwork size={20} />
</span>
```

- [ ] **Step 3: Add deterministic CSS animation**

Add component-scoped rules to `styles/globals.css`:

```css
.themed-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.themed-loader--fullscreen { min-height: 100dvh; padding: 1.5rem; }
.themed-loader--section { padding: 2rem; }
.themed-loader__svg { fill: none; stroke: rgba(255,255,255,.72); stroke-linecap: round; stroke-linejoin: round; }
.themed-loader__lid, .themed-loader__base, .themed-loader__screen, .themed-loader__code {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: themed-loader-draw 2.8s var(--ease-in-out) infinite;
}
.themed-loader__screen { stroke: rgba(255,255,255,.18); animation-delay: 120ms; }
.themed-loader__base { animation-delay: 240ms; }
.themed-loader__code { stroke: #e6002b; }
.themed-loader__code--one { animation-delay: 520ms; }
.themed-loader__code--two { animation-delay: 680ms; }
.themed-loader__code--three { animation-delay: 840ms; }
.themed-loader__cursor { fill: #e6002b; stroke: none; opacity: 0; animation: themed-loader-cursor 2.8s ease-in-out infinite; }
.themed-loader__message { margin-top: 1rem; color: #fff; font-size: .875rem; font-weight: 600; }
.themed-loader__slow { margin-top: .375rem; color: #a1a1aa; font-size: .75rem; }
@keyframes themed-loader-draw {
  0%, 8% { stroke-dashoffset: 1; opacity: 0; }
  38%, 78% { stroke-dashoffset: 0; opacity: 1; }
  92%, 100% { stroke-dashoffset: 0; opacity: 0; }
}
@keyframes themed-loader-cursor {
  0%, 38%, 100% { opacity: 0; transform: scale(.8); }
  48%, 78% { opacity: 1; transform: scale(1); }
  58%, 68% { opacity: .25; }
}
@media (prefers-reduced-motion: reduce) {
  .themed-loader__lid, .themed-loader__base, .themed-loader__screen, .themed-loader__code {
    animation: none; stroke-dashoffset: 0; opacity: 1;
  }
  .themed-loader__cursor { animation: themed-loader-reduced 1.8s ease-in-out infinite; }
  @keyframes themed-loader-reduced { 50% { opacity: .35; } }
}
```

Set `.themed-loader--inline { display: inline-flex; padding: 0; }`; `pathLength="1"` keeps every line animation consistent at 20px.

- [ ] **Step 4: Convert the legacy wrapper and remove obsolete implementations**

Replace `AnimatedEmptyState` with:

```tsx
import React from 'react';
import { ThemedLoader } from './ThemedLoader';

export const AnimatedEmptyState: React.FC<{ message?: string }> = ({
  message = 'Загружаем данные',
}) => <ThemedLoader variant="section" message={message} />;
```

Replace the `AnimatedLearningScene` branch in `CourseDetail.tsx` with:

```tsx
<ThemedLoader variant="section" message="Загружаем урок" />
```

Remove imports/usages of `BrandLoaderSvg` and `AnimatedLearningScene`, then delete both files.

- [ ] **Step 5: Verify the component boundary**

Run:

```bash
npm run lint
npm run build
rg "BrandLoaderSvg|AnimatedLearningScene|useGSAP|gsap" components/ui
```

Expected: typecheck and build pass; the search returns no matches.

### Task 2: Pre-React and authentication loaders

**Files:**
- Modify: `index.html`
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `ThemedLoader` from Task 1.
- Produces: a pre-bundle boot scene with the same SVG path data and an authenticated boot state using `variant="fullscreen"`.

- [ ] **Step 1: Replace the boot spinner CSS**

Remove `root-spin`. Embed minified equivalents of Task 1's loader rules under `.boot-loader`, using 120px dimensions and the same `@keyframes themed-loader-draw` / `themed-loader-cursor` names. Define `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` and `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` on `.boot-loader` because global CSS may not yet be available. Add `.boot-loader__slow` with initial opacity 0 and `animation: boot-loader-slow 200ms var(--ease-out) 5s forwards`; `boot-loader-slow` changes only opacity to 1.

- [ ] **Step 2: Replace the boot spinner markup**

Replace the current inline spinner in `#root` with:

```html
<div class="boot-loader" role="status" aria-live="polite">
  <svg viewBox="0 0 120 96" width="120" aria-hidden="true">
    <path pathLength="1" class="themed-loader__lid" d="M28 14h64a6 6 0 0 1 6 6v46H22V20a6 6 0 0 1 6-6Z"></path>
    <path pathLength="1" class="themed-loader__screen" d="M29 22h62v36H29z"></path>
    <path pathLength="1" class="themed-loader__base" d="M15 68h90l-7 10H22l-7-10Z"></path>
    <path pathLength="1" class="themed-loader__code themed-loader__code--one" d="M38 34h20"></path>
    <path pathLength="1" class="themed-loader__code themed-loader__code--two" d="M38 42h35"></path>
    <path pathLength="1" class="themed-loader__code themed-loader__code--three" d="M38 50h26"></path>
    <circle class="themed-loader__cursor" cx="70" cy="50" r="2.5"></circle>
  </svg>
  <p>Запускаем платформу</p>
  <p class="boot-loader__slow">Сеть отвечает медленнее обычного</p>
</div>
```

Keep all CSS inline in the document head so the loader does not wait for Vite CSS.

- [ ] **Step 3: Replace the React auth spinner**

Import `ThemedLoader` in `App.tsx` and replace the `isLoading` branch with:

```tsx
if (isLoading) {
  return <ThemedLoader variant="fullscreen" message="Подключаем профиль" />;
}
```

- [ ] **Step 4: Verify cold startup**

Run `npm run dev`, open the app with browser cache disabled and Slow 3G, and reload. Expected sequence:

1. Laptop scene and `Запускаем платформу` render before the React bundle.
2. React replaces it with `Подключаем профиль` without a white flash or layout jump.
3. At 5 seconds, the supporting slow-network message appears.
4. With reduced motion emulation, only cursor opacity changes.

### Task 3: Section and action loading sweep

**Files:**
- Modify: `views/CourseDetail.tsx`
- Modify: `components/LessonVideoPlayer.tsx`
- Modify: `views/Profile.tsx`
- Modify: `views/UserPublicProfile.tsx`
- Modify: `views/AdminPanel.tsx`
- Modify: `components/AuthModal.tsx`
- Modify: `views/ShowcaseSubmitModal.tsx`
- Modify: `components/HomeworkIsland.tsx`
- Modify: `views/Community.tsx`
- Modify: `views/Notifications.tsx`

**Interfaces:**
- Consumes: `ThemedLoader` from Task 1.
- Section replacements use `variant="section"` plus operation-specific `message`.
- Button/action replacements use `<ThemedLoader variant="inline" />`.

- [ ] **Step 1: Replace page and panel spinners**

Replace standalone 28–40px `Loader2` and border-spinner states with this fixed copy map:

```tsx
// CourseDetail lesson/course branches
<ThemedLoader variant="section" message="Загружаем урок" />
// LessonVideoPlayer
<ThemedLoader variant="section" message="Загружаем видео" />
// Profile and UserPublicProfile
<ThemedLoader variant="section" message="Открываем профиль" />
// AdminPanel
<ThemedLoader variant="section" message="Загружаем управление" />
```

Keep the existing `AnimatedEmptyState` copy unchanged for Showcase, Schedule, Courses, Community, and Notifications. Preserve every error and empty-state branch.

- [ ] **Step 2: Replace action spinners**

For save, upload, submit, accept, delete, and authentication buttons, replace only the spinning icon:

```tsx
{loading ? <ThemedLoader variant="inline" /> : buttonContent}
```

Do not change labels, disabled conditions, submit handlers, or button dimensions.

- [ ] **Step 3: Remove stale imports and confirm the sweep**

Remove `Loader2` imports only where no remaining use exists. Run:

```bash
rg "animate-spin|Loader2|border-t-kiddy-cherry" --glob "*.tsx"
npm run lint
npm run build
```

Expected: no user-facing loading spinner matches remain outside archived `AdminPanel.old.tsx`; typecheck and build pass.

- [ ] **Step 4: Verify responsive variants**

At desktop width and 390px mobile width, exercise course, feed, schedule, profile, notification, community, save, and submit loading states. Expected: section scenes never overflow; inline indicators keep buttons stable; contextual text remains legible.

### Task 4: Production slow-network verification

**Files:**
- Modify: `index.html` (build ID only after verification)

**Interfaces:**
- Consumes all loading variants from Tasks 1–3.
- Produces the deployable build marker `themed-loading-onboarding-v3-2026-08-25`.

- [ ] **Step 1: Run final static verification**

```bash
npm run lint
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 2: Run the production server locally**

```bash
npm start
```

Open the local production URL and verify initial, section, and inline states under Slow 3G and offline transitions.

- [ ] **Step 3: Update the build marker and rebuild**

Set:

```html
<meta name="build-id" content="themed-loading-onboarding-v3-2026-08-25" />
```

Run `npm run build` again and expect exit 0.

- [ ] **Step 4: Deploy and verify**

Deploy the current project through Railway, wait for deployment status `SUCCESS`, then load `https://detivtope.online/` with cache disabled and Slow 3G. Confirm boot, authenticated, section, inline, slow-copy, mobile, and reduced-motion behaviors.
