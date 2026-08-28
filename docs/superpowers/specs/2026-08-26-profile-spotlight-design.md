# Profile Spotlight redesign

## Goal

Replace the duplicated, card-heavy profile with one responsive identity-and-progress view that feels modern, calm, and alive. Remove competency matrices, internal ID, and “Верифицирован”.

## Layout

Use one responsive component tree for mobile and desktop:

1. **Spotlight header:** large avatar, name, level chip, edit action, and subtle cherry ambient light.
2. **Progress rail:** current XP, next-level target, animated progress fill, and one-line encouragement.
3. **Core metrics:** XP and leaderboard rank in two restrained cells; rank opens the existing leaderboard.
4. **Badge showcase:** exactly three public slots with equipped medals. Empty slots invite selection.
5. **Actions:** compact overflow/menu area for editing, restarting onboarding, and signing out.

Remove both radar charts, `useSkillData`, Recharts imports from Profile, internal ID, verified labels, duplicated mobile/desktop markup, expandable statistics card, and full badge catalog from the main page.

## Badge persistence

Add `profiles.equipped_badges text[] NOT NULL DEFAULT '{}'`.

- The owner can equip up to three unlocked badge IDs.
- A security-definer RPC validates authentication, catalog-safe text length/count, and writes only the current user’s row.
- `useBadgeProgress` reads persisted equipped IDs; one-time localStorage values may seed the server when valid.
- Public profile queries `equipped_badges` and renders exactly the owner-selected medals.
- Locked or unknown IDs are ignored.

The existing badge picker remains the catalog UI but is restyled as a focused modal/bottom sheet with three visible target slots.

## Motion

- Page entry: 320ms opacity + 10px translate reveal with `--ease-out`.
- Avatar/name and progress appear together; no long page-wide stagger.
- Progress fill runs once after data settles, maximum 700ms.
- Equipped badges enter with 45ms stagger and opacity + 6px translate.
- Pressable controls use 120ms `scale(0.97)` feedback on pointer devices.
- Selecting a badge uses an interruptible shared-position/FLIP transition into the slot; no bounce above 0.12.
- Edit and badge picker originate from their trigger as a sheet on mobile and modal/popover on desktop.
- Reduced motion removes translation/FLIP and keeps 180ms opacity/color feedback.

## Visual system

- Use the approved Manrope UI and sparse Unbounded display roles.
- Dark near-black canvas, one elevated translucent spotlight surface, hairline borders, and restrained cherry accents.
- Avoid stacked glass, excessive glows, all-caps microcopy, and decorative italics.
- All controls are at least 44px on mobile.

## States and accessibility

- Loading uses `ThemedLoader`; no legacy spinners.
- Badge save shows inline pending/success feedback and rolls back the local slot state on failure.
- Modal/sheet focus is trapped and restored to its trigger.
- Rank metric is a real button; headings remain semantic.
- Layout must work at 320px, 390px, desktop, 200% zoom, and reduced motion.

## Verification

- Owner profile and public profile display the same equipped badge IDs.
- Badge choices persist across devices and cleared browser storage.
- Removed strings/components no longer occur in active Profile UI.
- Production build succeeds, Supabase migration applies, Railway reaches `SUCCESS`, and the production build marker is verified.
