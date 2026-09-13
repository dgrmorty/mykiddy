(() => {
  const STAGE = document.getElementById('stage');
  const CAM = document.getElementById('cam');
  const CURSOR = document.getElementById('cursor');
  const RIPPLE = document.getElementById('ripple');
  const CAPTION = document.getElementById('caption');
  const CUES = [];
  const cursorAim = { x: 760, y: 860 };

  function markNow(tl, type) {
    CUES.push({ t: Number(tl.duration().toFixed(3)), type });
  }

  function originOf(sel) {
    const el = document.querySelector(sel);
    const box = STAGE.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const ox = ((r.left + r.width / 2 - box.left) / box.width) * 100;
    const oy = ((r.top + r.height / 2 - box.top) / box.height) * 100;
    return `${ox}% ${oy}%`;
  }

  function scene(id) {
    document.querySelectorAll('[data-scene]').forEach((s) => s.classList.toggle('is-on', s.id === id));
    gsap.set(CAM, { scale: 1, x: 0, y: 0, transformOrigin: '50% 50%' });
  }

  function setCaption(text) {
    CAPTION.textContent = text;
  }

  function aim(sel) {
    const box = STAGE.getBoundingClientRect();
    const r = document.querySelector(sel).getBoundingClientRect();
    cursorAim.x = Math.round(r.left - box.left + r.width * 0.9);
    cursorAim.y = Math.round(r.top - box.top + r.height * 0.72);
  }

  function moveCursor(tl, sel) {
    tl.add(() => aim(sel));
    tl.to(CURSOR, {
      duration: 0.38,
      ease: 'power3.out',
      left: () => cursorAim.x,
      top: () => cursorAim.y,
    });
  }

  function clickFx(tl) {
    tl.add(() => gsap.set(RIPPLE, { left: cursorAim.x, top: cursorAim.y }));
    tl.to(CURSOR, { scale: 0.72, duration: 0.07, ease: 'power2.in' });
    tl.fromTo(RIPPLE, { scale: 0.35, opacity: 0.9 }, { scale: 2.9, opacity: 0, duration: 0.36, ease: 'power2.out' }, '<');
    tl.to(CURSOR, { scale: 1, duration: 0.12, ease: 'power2.out' }, '<0.07');
  }

  function cutTo(tl, id, caption) {
    tl.to(CAM, { scale: 1.06, duration: 0.16, ease: 'power2.in' });
    tl.add(() => {
      scene(id);
      setCaption(caption);
      gsap.set(CAM, { scale: 1.04, transformOrigin: '50% 50%' });
    });
    tl.to(CAM, { scale: 1, duration: 0.5, ease: 'expo.out' });
  }

  function punch(tl, sel, scale = 1.14, duration = 0.55) {
    tl.add(() => gsap.set(CAM, { transformOrigin: originOf(sel) }));
    tl.to(CAM, { scale, duration, ease: 'power3.inOut' });
  }

  function pullBack(tl) {
    tl.to(CAM, { scale: 1, duration: 0.42, ease: 'power2.inOut' });
  }

  function build() {
    gsap.set(['#open-logo', '#open-sub'], { autoAlpha: 0, y: 24, scale: 0.94 });
    gsap.set('#course-bar', { width: '0%' });
    gsap.set('#xp-bar', { width: '0%' });
    gsap.set('#vid-fill', { width: '0%' });
    gsap.set('#picker', { autoAlpha: 0, y: 16 });
    gsap.set('#hw-photo', { autoAlpha: 0, scale: 0.9, y: 16 });
    gsap.set('#hw-status', { autoAlpha: 0 });
    gsap.set('#code-block', { autoAlpha: 0, y: 10 });
    gsap.set('#now-playing', { autoAlpha: 0, y: -8 });
    gsap.set('#end-logo', { autoAlpha: 0, scale: 0.92 });
    gsap.set('#end-url', { autoAlpha: 0, y: 16 });
    gsap.set('#btn-play', { autoAlpha: 1, scale: 1 });
    scene('scene-open');
    setCaption('');

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        window.__promoDone = true;
      },
    });

    tl.add(() => setCaption('Дети В ТОПЕ'), 0.12);
    markNow(tl, 'whoosh');
    tl.to('#open-logo', { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: 'expo.out' }, 0.18);
    tl.to('#open-sub', { autoAlpha: 1, y: 0, scale: 1, duration: 0.55 }, 0.5);
    tl.to(CAM, { scale: 1.05, duration: 2.2, ease: 'none' }, 0.35);
    tl.to({}, { duration: 0.3 });

    cutTo(tl, 'scene-home', 'Главная: курсы и витрина');
    markNow(tl, 'whoosh');
    tl.to(CURSOR, { autoAlpha: 1, duration: 0.2 });
    moveCursor(tl, '#btn-courses');
    punch(tl, '#btn-courses', 1.14, 0.55);
    clickFx(tl);
    tl.to('#btn-courses', { scale: 0.97, duration: 0.08, yoyo: true, repeat: 1 }, '<');
    markNow(tl, 'click');
    pullBack(tl);

    cutTo(tl, 'scene-course', 'Как открыть урок по C++');
    markNow(tl, 'whoosh');
    tl.to('#course-bar', { width: '18%', duration: 0.7, ease: 'expo.out' }, '>-0.2');
    moveCursor(tl, '#lesson-1');
    punch(tl, '#lesson-1', 1.12, 0.55);
    clickFx(tl);
    markNow(tl, 'click');
    pullBack(tl);

    cutTo(tl, 'scene-player', 'Смотри видео прямо в платформе');
    markNow(tl, 'whoosh');
    moveCursor(tl, '#btn-play');
    punch(tl, '#btn-play', 1.16, 0.5);
    clickFx(tl);
    markNow(tl, 'click');
    tl.to('#btn-play', { autoAlpha: 0, scale: 0.7, duration: 0.22 }, '<');
    tl.to('#now-playing', { autoAlpha: 1, y: 0, duration: 0.3 }, '<0.04');
    tl.to('#code-block', { autoAlpha: 1, y: 0, duration: 0.4 }, '<0.06');
    tl.to('#vid-fill', { width: '22%', duration: 2.4, ease: 'none' });
    tl.to(CAM, { scale: 1.06, duration: 1.1, ease: 'power2.inOut' }, '<');
    pullBack(tl);

    cutTo(tl, 'scene-profile', 'Настрой имя, аватар и XP');
    markNow(tl, 'whoosh');
    tl.to('#xp-bar', { width: '70%', duration: 0.8, ease: 'expo.out' }, '>-0.12');
    moveCursor(tl, '#btn-edit');
    punch(tl, '#btn-edit', 1.1, 0.5);
    clickFx(tl);
    markNow(tl, 'click');
    pullBack(tl);
    tl.to('#picker', { autoAlpha: 1, y: 0, duration: 0.35 });
    tl.add(() => gsap.set(CAM, { transformOrigin: originOf('#pick-girl') }));
    tl.to(CAM, { scale: 1.12, duration: 0.45, ease: 'power3.inOut' });
    moveCursor(tl, '#pick-girl');
    tl.add(() => {
      document.getElementById('pick-boy').classList.remove('is-on');
      document.getElementById('pick-girl').classList.add('is-on');
      document.getElementById('av-main').src = '/avatars/student-girl.png';
      document.getElementById('profile-name').textContent = 'Алина';
    });
    clickFx(tl);
    markNow(tl, 'click');
    tl.to({}, { duration: 0.4 });
    tl.add(() => {
      document.getElementById('pick-girl').classList.remove('is-on');
      document.getElementById('pick-boy').classList.add('is-on');
      document.getElementById('av-main').src = '/avatars/student-boy.png';
      document.getElementById('profile-name').textContent = 'Максим';
    });
    markNow(tl, 'pop');
    pullBack(tl);

    cutTo(tl, 'scene-friends', 'Добавь одноклассника в друзья');
    markNow(tl, 'whoosh');
    moveCursor(tl, '#btn-friend');
    punch(tl, '#btn-friend', 1.1, 0.5);
    tl.add(() => {
      const btn = document.getElementById('btn-friend');
      btn.textContent = 'Заявка отправлена';
      btn.style.background = 'rgba(255,255,255,0.08)';
      btn.style.color = '#aaa';
    });
    clickFx(tl);
    markNow(tl, 'click');
    pullBack(tl);
    tl.to({}, { duration: 0.3 });

    cutTo(tl, 'scene-hw', 'Домашка — фото и отправка');
    markNow(tl, 'whoosh');
    tl.to('#hw-photo', { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.35)' });
    moveCursor(tl, '#btn-hw');
    punch(tl, '#btn-hw', 1.08, 0.45);
    tl.add(() => {
      document.getElementById('btn-hw').textContent = 'Отправлено';
    });
    clickFx(tl);
    markNow(tl, 'click');
    tl.to('#hw-status', { autoAlpha: 1, duration: 0.28 });
    pullBack(tl);

    cutTo(tl, 'scene-schedule', 'Расписание — не пропусти урок');
    markNow(tl, 'whoosh');
    moveCursor(tl, '#ev-live');
    punch(tl, '#ev-live', 1.1, 0.5);
    tl.to({}, { duration: 0.7 });
    pullBack(tl);

    cutTo(tl, 'scene-show', 'Витрина лучших работ');
    markNow(tl, 'whoosh');
    moveCursor(tl, '#btn-like');
    punch(tl, '#btn-like', 1.12, 0.5);
    tl.add(() => {
      document.getElementById('btn-like').classList.add('is-on');
      document.getElementById('like-n').textContent = '13 лайков';
    });
    clickFx(tl);
    markNow(tl, 'click');
    pullBack(tl);
    tl.to({}, { duration: 0.3 });

    tl.to(CURSOR, { autoAlpha: 0, duration: 0.18 });
    cutTo(tl, 'scene-end', 'Заходи на платформу');
    markNow(tl, 'whoosh');
    tl.to('#end-logo', { autoAlpha: 1, scale: 1, duration: 0.65, ease: 'expo.out' }, '>-0.18');
    tl.to('#end-url', { autoAlpha: 1, y: 0, duration: 0.4 }, '>-0.12');
    tl.to(CAM, { scale: 1.04, duration: 2.3, ease: 'none' });
    tl.to({}, { duration: 0.4 });

    window.__promoTimeline = tl;
    window.__SFX_CUES = CUES;
    window.__promoDuration = tl.duration();
    return tl;
  }

  async function ready() {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
    const imgs = [...document.images];
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return img.decode?.().catch(() => undefined) || Promise.resolve();
        return new Promise((res) => {
          img.onload = () => res();
          img.onerror = () => res();
        });
      }),
    );
    const tl = build();
    window.__promoReady = true;
    window.__startPromo = () => {
      window.__promoDone = false;
      tl.play(0);
    };
    window.__seekPromo = (t) => {
      tl.pause();
      tl.time(t, false);
    };
    if (new URLSearchParams(location.search).has('play')) {
      tl.play(0);
    }
  }

  ready();
})();
