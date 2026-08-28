# Profile Spotlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build one responsive progress-first profile with persistent public badge slots and restrained physical motion.

**Architecture:** Supabase stores three equipped badge IDs behind an authenticated RPC. A focused badge service and the existing progress hook expose the persisted selection; reusable showcase/metric components let the owner and public profile render the same medals while `Profile.tsx` becomes one responsive tree.

**Tech Stack:** React 18, TypeScript, Supabase/Postgres, GSAP already installed, Tailwind CSS, inline CSS transitions.

## Global Constraints

- Remove competency matrices, internal ID, “Верифицирован”, and duplicated mobile/desktop profile markup.
- Show exactly three public badge slots.
- Use one dominant profile surface, one progress rail, XP/rank metrics, badge showcase, and compact actions.
- Page entry is 320ms; progress fill is at most 700ms; badge stagger is 45ms.
- Press feedback is 120ms `scale(0.97)`.
- Reduced motion removes positional/FLIP movement and keeps 180ms opacity/color feedback.
- All mobile controls are at least 44px.
- Use `ThemedLoader` for loading and preserve existing edit, leaderboard, onboarding restart, and logout behavior.
- Do not commit, stage, stash, reset, or revert.

---

### Task 1: Persisted badge slots

**Files:**
- Create: `supabase/migrations/20260826170000_profile_equipped_badges.sql`
- Create: `services/profileBadgeService.ts`
- Modify: `hooks/useBadgeProgress.ts`
- Modify: `types.ts`

**Interfaces:**

```ts
export const PROFILE_BADGE_SLOT_COUNT = 3;
export async function fetchProfileBadgeIds(userId: string): Promise<string[]>;
export async function saveOwnProfileBadgeIds(ids: string[]): Promise<void>;
```

- [ ] Add `profiles.equipped_badges text[] NOT NULL DEFAULT '{}'`.
- [ ] Create `update_own_equipped_badges(p_badge_ids text[])` as `SECURITY DEFINER`, require `auth.uid()`, reject more than three values, reject duplicate IDs, reject values outside `[a-z0-9_-]{1,64}`, update only the caller, revoke public/anon, and grant authenticated execute.
- [ ] Implement the service: normalize to unique strings, cap at three, read `equipped_badges` from a requested public profile, and call the RPC for owner saves.
- [ ] Extend `User` with optional `equippedBadges?: string[]`.
- [ ] Update `useBadgeProgress`: server values are authoritative; seed valid legacy localStorage values once only when the server array is empty; `setEquipped(ids: string[]): Promise<void>` performs optimistic state, awaits RPC, and restores the previous IDs on failure.
- [ ] Run `npm run build`; expected exit 0.

### Task 2: Shared profile primitives

**Files:**
- Create: `components/profile/ProfileBadgeShowcase.tsx`
- Create: `components/profile/ProfileProgressRail.tsx`
- Create: `components/profile/ProfileMetrics.tsx`
- Modify: `components/BadgePickerModal.tsx`
- Modify: `styles/globals.css`

**Interfaces:**

```ts
interface ProfileBadgeShowcaseProps {
  equippedIds: string[];
  stats: BadgeStats | null;
  editable?: boolean;
  onEdit?: () => void;
}

interface ProfileProgressRailProps {
  xp: number;
  level: number;
}

interface ProfileMetricsProps {
  xp: number;
  rank: number | null;
  onOpenRank: () => void;
}
```

- [ ] Render exactly three badge slots; resolve IDs through `getBadgeById`, ignore unknown/locked IDs, and show tasteful empty slots only for the owner.
- [ ] Render progress from `xpLevelProgressPercent(xp)`, label the next level, and animate the inner bar with `transform: scaleX()` from the left once after mount for at most 700ms.
- [ ] Render XP as text and rank as a real 44px button.
- [ ] Change `BadgePickerModal.onSave` to `(ids: string[]) => Promise<void>`. Restyle it with three target slots, unlocked catalog below, selected state, save pending/error feedback, and existing focus-safe `Modal`; close only after save succeeds.
- [ ] On badge toggle, use `Element.animate()` with measured first/last rectangles to run an interruptible transform-only FLIP into/out of a slot for 260ms with `cubic-bezier(0.23, 1, 0.32, 1)`; skip it under reduced motion.
- [ ] Add scoped `profile-spotlight*` styles: near-black/translucent material, cherry ambient accent, 320ms entrance, 45ms badge delay variables, 120ms press state, mobile layout, reduced motion and reduced transparency.
- [ ] Run `npm run build`; expected exit 0.

### Task 3: Unified owner profile

**Files:**
- Modify: `views/Profile.tsx`

- [ ] Remove Recharts and `useSkillData` imports/state.
- [ ] Delete both old `md:hidden` and `hidden md:block` trees and replace them with one `max-w-4xl` responsive layout.
- [ ] Spotlight header renders avatar, name, level chip, edit button, and no ID/verified/crown copy.
- [ ] Compose `ProfileProgressRail`, `ProfileMetrics`, and `ProfileBadgeShowcase`.
- [ ] Keep edit modal, leaderboard modal, badge picker, onboarding restart, and logout modal; move the last three actions into a compact action row/menu below the showcase.
- [ ] Replace remaining `Loader2` loading states in Profile with inline/section `ThemedLoader`.
- [ ] Scope GSAP to modal/list interactions only; page entrance and press feedback use CSS. Remove obsolete expansion refs/state/effects.
- [ ] Verify `rg "Матрица компетенций|Верифицирован|ID:|RadarChart|ResponsiveContainer|skillData" views/Profile.tsx` returns no matches.
- [ ] Run `npm run build`; expected exit 0.

### Task 4: Public badge parity

**Files:**
- Modify: `views/UserPublicProfile.tsx`
- Modify: `hooks/useBadgeProgress.ts`

- [ ] Include `equipped_badges` in the public profile select and map it to `equippedBadges`.
- [ ] Pass persisted IDs into `useBadgeProgress` public mode or `ProfileBadgeShowcase`; never auto-select the first unlocked badges when persisted slots exist.
- [ ] Replace the public profile badge catalog block with the same three-slot showcase in read-only mode.
- [ ] Keep friendship, showcase, and existing public-profile behavior unchanged.
- [ ] Run `npm run build`; expected exit 0.

### Task 5: Production verification

**Files:**
- Modify: `index.html`

- [ ] Run `npm run lint`; record pre-existing errors separately and fix every new error in touched files.
- [ ] Run `npm run build`; expected exit 0.
- [ ] Apply the Supabase migration with `npm run supabase:push`.
- [ ] Verify owner profile, badge save/reload, cleared localStorage, and public profile parity at 1440px, 390px, 320px, 200% zoom, and reduced motion.
- [ ] Set build ID to `profile-spotlight-2026-08-26`.
- [ ] Deploy through Railway, wait for status `SUCCESS`, and verify the production build marker at `https://detivtope.online/`.
