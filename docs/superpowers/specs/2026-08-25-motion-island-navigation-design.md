# Motion island navigation redesign

## Goal

Make the top navigation feel premium and alive while reducing it to the three destinations used most often. Motion must communicate active state and the bar-to-island transformation without making routine navigation feel slow.

## Information architecture

The primary island contains:

1. **Главная** → `/`
2. **Обучение** → `/courses`
3. **Сообщество** → `/community`

Secondary destinations:

- **Расписание** remains at `/schedule` and becomes a local destination inside **Обучение**.
- **Профиль** opens through the user avatar.
- **Уведомления** remain a utility icon.
- **Управление** is a utility icon visible only to administrators.

The courses and schedule pages get the same compact local switcher with **Курсы** and **Расписание**. It navigates between the existing routes and does not duplicate page content or data loading. The primary **Обучение** capsule remains active on both routes.

## Visual design

- Expanded top bar height: 68px.
- Scrolled island height: 64px; desktop maximum width: 920px.
- Each primary destination always shows its SVG icon and label on desktop.
- The active destination uses a cherry-red capsule, white content, a subtle inner highlight, and restrained red glow.
- Inactive destinations use muted text and a soft neutral hover surface.
- Logo stays isolated on the left. Utilities stay grouped on the right.
- Mobile keeps all three primary icons visible; only the active destination shows its label.
- Spacing and touch targets remain at least 44px on mobile.

## Motion

Purposes:

- Bar → island: spatial consistency and prevention of a jarring layout change.
- Active capsule: state indication.
- Press scale: interaction feedback.
- SVG drawing: state indication when a destination becomes active.

Rules:

- The scroll transformation uses the existing 280ms `--ease-in-out` transition.
- Hover and press feedback uses 160ms `--ease-out`; active-state changes use 200ms `--ease-out`.
- SVG drawing runs only when the active route changes, not on every hover or render.
- Inactive icons remain static.
- Hover motion is enabled only for fine pointers.
- Reduced-motion mode removes positional/icon drawing motion while preserving color and active-state changes.

## Components

- `AppTopNav`: reduced primary navigation, utility actions, grouped active state for `/courses` and `/schedule`.
- `AnimatedIcon`: active SVG drawing restored with a short, route-triggered animation.
- `CourseDetail` and `Schedule`: shared local **Курсы / Расписание** switcher.
- `globals.css`: island dimensions, capsule styling, responsive label behavior, motion and reduced-motion rules.

No new animation or UI dependency is required.

## Edge cases

- Guests clicking **Обучение** or **Сообщество** continue to open authentication.
- Administrators retain direct access to `/admin`.
- Onboarding anchors move to the surviving primary/utility controls.
- Narrow mobile widths must not overflow horizontally.

## Verification

- Production build succeeds.
- Desktop: expanded bar and scrolled island both fit at 1024px and wider.
- Mobile: 320px, 390px, and 430px widths have no horizontal overflow.
- Active state and SVG drawing update on all three routes.
- Guest lock behavior, notification badge, avatar, and admin access still work.
- `prefers-reduced-motion` removes drawing/positional motion.
