# Themed loading and onboarding redesign

## Goal

Replace disconnected spinners and the abstract square/cherry loader with one understandable IT-school loading language, and replace the stale onboarding tour with a short responsive guide targeting the current navigation.

## Loading system

### Visual

The main loader is a line-art laptop:

1. The lid and keyboard draw into place.
2. Three short code lines draw on the screen.
3. A cherry-red cursor lights at the end of the final line.
4. The scene rests briefly and repeats without a hard visual reset.

The animation uses inline SVG and CSS only. It must not depend on React, JavaScript animation frames, fonts, images, or remote assets.

### Variants

- **Boot:** 120px scene, centered full viewport, rendered directly in `index.html` before the JavaScript bundle loads.
- **Fullscreen:** 112px scene for authentication/application initialization.
- **Section:** 80px scene for feed, courses, schedule, notifications, community, and profile data.
- **Inline:** 20px compact branded activity mark for buttons and local actions; no full scene inside controls.

### Copy

- Initial copy is supplied by the caller through a required contextual `message` prop, including `Запускаем платформу`, `Загружаем витрину`, and `Открываем расписание`.
- After 5 seconds, supporting copy becomes `Сеть отвечает медленнее обычного`.
- Copy uses `role="status"` and `aria-live="polite"`.

### Motion and performance

- CSS keyframes animate `stroke-dashoffset`, `opacity`, and `transform`.
- The scene has no layout animation, heavy blur, or JavaScript loop.
- `prefers-reduced-motion` shows the complete laptop with only a subtle cursor opacity pulse.
- Boot critical CSS is embedded in `index.html`; React states reuse the same geometry through `ThemedLoader`.

## Onboarding v3

### Steps

1. **Welcome:** no target; introduces the platform with the laptop illustration.
2. **Главная:** targets `nav-home`.
3. **Обучение:** targets `nav-library`; copy mentions courses and schedule together.
4. **Сообщество:** targets `nav-community`.
5. **Связь и профиль:** targets the utility group containing notifications and avatar.
6. **Управление:** targets the admin utility and is included only for administrators.

The obsolete `nav-schedule` and `nav-profile` steps are removed.

### Responsive presentation

- Desktop uses a 360px popover positioned above or below the target.
- Mobile uses a safe-area-aware bottom sheet, 16px from the viewport edges.
- Mobile spotlight follows the current top-island item and never scrolls the fixed navigation.
- Welcome is centered on desktop and shown in the same bottom sheet on mobile.
- The sheet has one primary `Далее` action, a compact `Назад`, and text-only `Пропустить`.

### Interaction and accessibility

- Onboarding opens 700ms after authenticated layout becomes stable.
- Target geometry updates on resize, orientation change, and scroll.
- The primary action receives focus on open and each step change.
- Escape closes the guide and focus returns to the previously focused element.
- Step progress is announced politely.
- All pressable controls are at least 44px on mobile.
- Backdrop/content transitions use 200ms `--ease-out`; spotlight geometry uses 280ms `--ease-in-out`. Positional motion is removed under `prefers-reduced-motion`.

## Components

- Create `components/ui/ThemedLoader.tsx` for fullscreen, section, and inline variants.
- Replace `BrandLoaderSvg` and `AnimatedLearningScene` usage with `ThemedLoader`.
- Replace the root and authentication spinners with the same laptop scene.
- Refactor `OnboardingTour` for optional targets, responsive sheet/popover layout, focus handling, and current anchors.
- Update onboarding data to version `v3`.
- Add an ID to the navigation utilities wrapper.

## Verification

- Capture a cold production load with cache disabled and Slow 3G.
- Verify the boot loader appears before React and transitions to the application loader without a style jump.
- Verify section loaders use the same scene and contextual copy.
- Verify button activity remains compact.
- Verify onboarding at desktop and 320px, 390px, and 430px mobile widths.
- Verify every step has a valid target where required.
- Verify keyboard, Escape, focus restoration, and reduced-motion behavior.
- Production build succeeds and Railway reaches `SUCCESS`.
