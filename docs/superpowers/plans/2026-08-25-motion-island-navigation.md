# Motion Island Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the global navigation to three expressive primary destinations and make the larger scroll island feel premium through persistent icons, restrained SVG drawing, and a branded active capsule.

**Architecture:** `AppTopNav` owns global route grouping and utility actions. A new `LearningSectionNav` owns the local Courses/Schedule relationship and is rendered by both existing pages. CSS remains the animation engine; no dependency is added.

**Tech Stack:** React 18, React Router 6, TypeScript, Tailwind CSS, custom SVG icons, CSS transitions.

## Global Constraints

- Primary navigation is exactly **Главная**, **Обучение**, **Сообщество**.
- `/courses` and `/schedule` both activate **Обучение**.
- Scrolled island is 64px high and at most 920px wide.
- Hover/press feedback is 160ms; active-state feedback is 200ms.
- SVG drawing occurs only when a route becomes active.
- Reduced motion disables SVG drawing and positional motion.
- No new dependency and no git commit unless explicitly requested.

---

### Task 1: Shared learning section navigation

**Files:**
- Create: `components/LearningSectionNav.tsx`
- Modify: `views/CourseDetail.tsx`
- Modify: `views/Schedule.tsx`

**Interfaces:**
- Produces: `LearningSectionNav: React.FC`, with no props; it derives active state from `useLocation()`.
- Consumes: existing `/courses` and `/schedule` routes.

- [ ] **Step 1: Create the shared route switcher**

Implement two `NavLink`s with `book` and `calendar` `AnimatedIcon`s. Use `aria-label="Раздел обучения"` on the wrapper and exact labels **Курсы** and **Расписание**.

- [ ] **Step 2: Render it in both learning pages**

Place `<LearningSectionNav />` before the library heading in `CourseDetail` and before week navigation in `Schedule`, so both routes expose the same local navigation.

- [ ] **Step 3: Verify TypeScript**

Run: `npm run lint`

Expected: exit 0 with no TypeScript errors.

### Task 2: Reduce and regroup global navigation

**Files:**
- Modify: `components/AppTopNav.tsx`

**Interfaces:**
- Consumes: `useLocation().pathname`.
- Produces: three primary items; `Обучение` is active for `/courses` and `/schedule`.

- [ ] **Step 1: Replace the five-item configuration**

Keep:

```ts
[
  { iconName: 'dashboard', label: 'Главная', path: '/', matches: ['/'] },
  { iconName: 'book', label: 'Обучение', path: '/courses', matches: ['/courses', '/schedule'] },
  { iconName: 'usersGroup', label: 'Сообщество', path: '/community', matches: ['/community'] },
]
```

Use a normal `Link` with `aria-current={active ? 'page' : undefined}` so grouped route matching is explicit.

- [ ] **Step 2: Restore active SVG state**

Render `AnimatedIcon` with `active={active}` and a route-derived `key` so drawing starts once when the active destination changes. Keep inactive icons static.

- [ ] **Step 3: Keep utilities available**

Keep notification and avatar controls. Add the shield utility before the avatar only for administrators, linking to `/admin` and retaining `tour-dsk-nav-admin`.

- [ ] **Step 4: Verify guest behavior**

Continue preventing navigation and opening auth for guest-only **Обучение** and **Сообщество**.

### Task 3: Premium island styling and motion

**Files:**
- Modify: `styles/globals.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: `.is-active`, `.nav-island-link-icon`, and `data-compact`.
- Produces: desktop and mobile island layouts with no horizontal overflow.

- [ ] **Step 1: Increase dimensions and spacing**

Set expanded height to 68px. Set compact height to 64px and max width to 920px. Increase link gap and ensure each primary control has at least a 44px touch target.

- [ ] **Step 2: Style the active capsule**

Use cherry-red background, white text/icon, subtle inner white highlight, and restrained red outer shadow. Inactive controls remain neutral with fine-pointer-only hover.

- [ ] **Step 3: Restore short SVG drawing**

Set active SVG paths to draw for 200ms using `--ease-out`; remove per-path long delays. Disable this animation under `prefers-reduced-motion`.

- [ ] **Step 4: Implement mobile labels**

At widths below 768px, show all three icons and show text only for `.is-active`. Keep logo and utilities visible and verify 320px width without overflow.

- [ ] **Step 5: Update build identifier**

Set the `build-id` meta content to `expressive-motion-island-2026-08-25`.

- [ ] **Step 6: Build and visually verify**

Run:

```bash
npm run lint
npm run build
```

Verify desktop expanded/compact states and mobile widths 320, 390, and 430px. Verify guest auth, active states on `/`, `/courses`, `/schedule`, `/community`, and admin utility visibility.

- [ ] **Step 7: Deploy and verify production**

Deploy the project to the existing Railway production service. Confirm terminal deployment status `SUCCESS`, production build ID, feed availability, and compact island geometry after scrolling.
