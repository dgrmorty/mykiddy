# Onboarding v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale tour with a short accessible guide that targets the current motion-island navigation and works cleanly on desktop and phones.

**Architecture:** Onboarding data defines optional anchors and role filtering. `AppTopNav` exposes stable IDs, while `OnboardingTour` owns geometry, responsive popover/sheet presentation, focus restoration, keyboard behavior, and a targetless welcome step.

**Tech Stack:** React 18, TypeScript, React portal, inline SVG through `ThemedLoader`, Tailwind CSS, DOM geometry APIs.

## Global Constraints

- Steps are Welcome, Главная, Обучение, Сообщество, Связь и профиль, and admin-only Управление.
- `nav-schedule` and `nav-profile` do not exist as standalone steps.
- Open 700ms after authenticated layout stabilization.
- Desktop card width is 360px; mobile sheet is 16px from viewport edges and respects `env(safe-area-inset-bottom)`.
- All mobile pressable controls are at least 44px.
- Backdrop/content transitions use 200ms `--ease-out`; spotlight geometry uses 280ms `--ease-in-out`.
- Escape closes the guide and restores prior focus; the primary action receives focus on open and step change.
- Under `prefers-reduced-motion`, remove positional transitions.
- Preserve the profile's existing “Гид по разделам” restart behavior.
- This project has no automated test runner; each task uses typecheck/build and explicit keyboard/viewport browser checks.

---

### Task 1: v3 step model and stable navigation anchors

**Files:**
- Modify: `data/onboardingTour.ts`
- Modify: `components/AppTopNav.tsx`

**Interfaces:**
- Produces:

```ts
export interface OnboardingStepDef {
  anchor: string | null;
  title: string;
  body: string;
  adminOnly?: boolean;
}

export function resolveTourTarget(anchor: string | null): HTMLElement | null;
```

- Stable DOM IDs: `tour-nav-home`, `tour-nav-library`, `tour-nav-community`, `tour-nav-utilities`, and `tour-nav-admin`.

- [ ] **Step 1: Replace legacy target resolution**

Delete `tourElementIds`. Implement direct optional-anchor lookup:

```ts
export function resolveTourTarget(anchor: string | null): HTMLElement | null {
  if (!anchor || typeof document === 'undefined') return null;
  return document.getElementById(`tour-${anchor}`);
}
```

Include `v2` in legacy cleanup and set:

```ts
export const ONBOARDING_TOUR_VERSION = 'v3';
const ONBOARDING_LEGACY_VERSIONS = ['v1', 'v2'] as const;
```

- [ ] **Step 2: Define the exact v3 sequence**

Replace `ONBOARDING_STEPS` with:

```ts
export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    anchor: null,
    title: 'Добро пожаловать',
    body: 'Здесь можно учиться, показывать свои проекты и быть на связи со школой.',
  },
  {
    anchor: 'nav-home',
    title: 'Главная',
    body: 'Следите за прогрессом и смотрите новые проекты учеников.',
  },
  {
    anchor: 'nav-library',
    title: 'Обучение',
    body: 'Здесь находятся курсы, уроки и расписание занятий.',
  },
  {
    anchor: 'nav-community',
    title: 'Сообщество',
    body: 'Находите учеников, добавляйте друзей и следите за их успехами.',
  },
  {
    anchor: 'nav-utilities',
    title: 'Связь и профиль',
    body: 'Уведомления держат вас в курсе, а через аватар открываются профиль и настройки.',
  },
  {
    anchor: 'nav-admin',
    title: 'Управление',
    body: 'Здесь администраторы управляют учениками, курсами и проверкой заданий.',
    adminOnly: true,
  },
];
```

- [ ] **Step 3: Expose the stable IDs**

In `AppTopNav`, remove the `tour-dsk-` ID construction and assign:

```tsx
id={item.onboardingAnchor && !item.locked ? `tour-${item.onboardingAnchor}` : undefined}
```

Wrap all notification/admin/avatar controls in:

```tsx
<div id={!isGuest ? 'tour-nav-utilities' : undefined} className="nav-island-actions">
  {/* existing actions */}
</div>
```

Keep the admin link's own `id="tour-nav-admin"` so the last admin step can target it.

- [ ] **Step 4: Verify data and anchors**

Run:

```bash
npm run lint
npm run build
rg "tour-dsk|tour-mob|nav-schedule|nav-profile|tourElementIds" data/onboardingTour.ts components/AppTopNav.tsx
```

Expected: typecheck and build pass; search returns no legacy references.

### Task 2: Responsive tour geometry and welcome state

**Files:**
- Modify: `components/onboarding/OnboardingTour.tsx`
- Modify: `styles/globals.css`

**Interfaces:**
- Consumes `OnboardingStepDef.anchor: string | null` and `resolveTourTarget`.
- Consumes `<ThemedLoader variant="section" message="Готовим вашу платформу" />` as a decorative welcome illustration; place it inside an `aria-hidden` wrapper to avoid nested status announcements.
- Produces desktop popover class `onboarding-card`, mobile class `onboarding-sheet`, and spotlight class `onboarding-spotlight`.

- [ ] **Step 1: Replace legacy mobile fallback state**

Remove `useMobileSheet`; presentation is determined only by `useIsMobile()`. Represent geometry with:

```ts
type TargetRect = { top: number; left: number; width: number; height: number };
const [rect, setRect] = useState<TargetRect | null>(null);
const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
```

For `anchor: null`, set `rect` to null and center the desktop card. For a missing required target, set `rect` to null and keep the card usable rather than blocking onboarding.

- [ ] **Step 2: Implement deterministic desktop placement**

In `updateGeometry`, use 10px target padding, 360px card width, 16px viewport margin, and 16px target gap:

```ts
const cardWidth = Math.min(360, window.innerWidth - 32);
const left = Math.max(
  16,
  Math.min(r.left + r.width / 2 - cardWidth / 2, window.innerWidth - cardWidth - 16),
);
const cardHeight = tooltipRef.current?.offsetHeight ?? 280;
const fitsBelow = window.innerHeight - r.bottom >= cardHeight + 32;
const top = fitsBelow
  ? r.bottom + 16
  : Math.max(16, r.top - cardHeight - 16);
setTooltipPos({ top, left });
```

On mobile, update only `rect`; never call `scrollIntoView` for the fixed top navigation.

- [ ] **Step 3: Recompute geometry for every viewport change**

Register and clean up all three events while the tour is open:

```ts
useEffect(() => {
  if (!open) return;
  const update = () => updateGeometry();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('scroll', update, true);
  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    window.removeEventListener('scroll', update, true);
  };
}, [open, updateGeometry]);
```

- [ ] **Step 4: Add the welcome illustration**

On the targetless first step, render:

```tsx
{step.anchor === null && (
  <div aria-hidden="true" className="onboarding-welcome-visual">
    <ThemedLoader variant="section" message="Готовим вашу платформу" />
  </div>
)}
```

Hide `.themed-loader__message` and `.themed-loader__slow` inside `.onboarding-welcome-visual` because the step title/body provide the accessible copy.

- [ ] **Step 5: Replace presentation classes**

Render mobile and desktop from the same card:

```tsx
className={`onboarding-card ${isMobile ? 'onboarding-sheet' : 'onboarding-popover'}`}
style={isMobile ? undefined : {
  top: step.anchor === null ? '50%' : tooltipPos.top,
  left: step.anchor === null ? '50%' : tooltipPos.left,
  transform: step.anchor === null ? 'translate(-50%, -50%)' : undefined,
}}
```

Add:

```css
.onboarding-card {
  width: min(360px, calc(100vw - 32px));
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 2rem;
  background: rgba(5,5,5,.94);
  box-shadow: var(--shadow-island);
  transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);
}
.onboarding-sheet {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  width: auto;
}
.onboarding-popover { position: absolute; }
.onboarding-spotlight {
  transition: top 280ms var(--ease-in-out), left 280ms var(--ease-in-out),
    width 280ms var(--ease-in-out), height 280ms var(--ease-in-out);
}
@media (prefers-reduced-motion: reduce) {
  .onboarding-card, .onboarding-spotlight { transition: none; }
}
```

- [ ] **Step 6: Verify geometry**

Run `npm run dev` and restart the guide from Profile. Check 1440px desktop plus 320px, 390px, and 430px mobile widths. Expected: welcome is centered/sheeted; each available nav item is highlighted; sheet stays 16px from edges and above safe area; no card clipping or forced page scroll occurs.

### Task 3: Focus, keyboard, progress, and controls

**Files:**
- Modify: `components/onboarding/OnboardingTour.tsx`

**Interfaces:**
- Produces primary action ref `primaryActionRef: React.RefObject<HTMLButtonElement>`.
- Produces previous focus ref `previousFocusRef: React.MutableRefObject<HTMLElement | null>`.

- [ ] **Step 1: Open after 700ms and retain prior focus**

Change the open timer to 700ms. Immediately before `setOpen(true)`, capture:

```ts
previousFocusRef.current =
  document.activeElement instanceof HTMLElement ? document.activeElement : null;
setOpen(true);
```

- [ ] **Step 2: Focus the primary action on every step**

Add:

```ts
useEffect(() => {
  if (!open) return;
  const frame = window.requestAnimationFrame(() => primaryActionRef.current?.focus());
  return () => window.cancelAnimationFrame(frame);
}, [open, stepIndex]);
```

Attach `ref={primaryActionRef}` to `Далее` / `Готово`.

- [ ] **Step 3: Restore focus on every exit path**

Split close behavior so both completed and skipped tours save progress, then restore focus:

```ts
const finishTour = useCallback(() => {
  try {
    localStorage.setItem(onboardingStorageKey(userId), '1');
  } catch {
    // Storage can be unavailable in private contexts.
  }
  setOpen(false);
  window.requestAnimationFrame(() => previousFocusRef.current?.focus());
}, [userId]);
```

Escape and the close button call the same function.

- [ ] **Step 4: Make progress and controls accessible**

Add a visually hidden live region:

```tsx
<p className="sr-only" aria-live="polite">
  Шаг {stepIndex + 1} из {steps.length}: {step.title}
</p>
```

Use a 44px minimum height/width for close, back, skip, and next controls on mobile. Keep `Далее` as the only filled primary button; render `Назад` compact and `Пропустить` text-only.

- [ ] **Step 5: Verify keyboard behavior**

Run:

```bash
npm run lint
npm run build
```

Then restart onboarding and test:

1. Primary action is focused on welcome.
2. Each `Далее` focuses the new primary action.
3. Shift+Tab reaches Back/Skip/Close.
4. Escape closes the tour.
5. Focus returns to the control used to restart it.
6. Screen-reader output announces step number and title once per step.

### Task 4: Full role and mobile verification

**Files:**
- Modify: none; this task verifies the completed implementation.

**Interfaces:**
- Consumes Tasks 1–3.
- Produces a verified onboarding build ready for the loading-system plan's final build marker and deployment.

- [ ] **Step 1: Verify student sequence**

Clear the current user's v3 onboarding key and sign in as a non-admin. Expected: exactly five steps; no admin step; no missing target on steps 2–5.

- [ ] **Step 2: Verify admin sequence**

Clear the admin user's v3 key and sign in as an admin. Expected: exactly six steps; final Управление step highlights only the shield control.

- [ ] **Step 3: Verify responsive and reduced-motion behavior**

At 320px, 390px, 430px, and desktop widths, rotate once between portrait and landscape during the tour. Expected: geometry recomputes; controls remain at least 44px; sheet respects safe area; reduced-motion mode has no positional interpolation.

- [ ] **Step 4: Run final static verification**

```bash
npm run lint
npm run build
rg "tour-dsk|tour-mob|nav-schedule|nav-profile" data/onboardingTour.ts components/onboarding/OnboardingTour.tsx components/AppTopNav.tsx
```

Expected: typecheck and build pass; search returns no legacy onboarding references.

- [ ] **Step 5: Deploy and verify production**

After the loading-system plan sets the shared build marker, deploy through Railway, wait for `SUCCESS`, then repeat one student and one admin walkthrough on `https://detivtope.online/`, including a 390px mobile viewport.
