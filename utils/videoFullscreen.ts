/** Mobile / desktop fullscreen helpers for lesson video player. */

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element };
  return document.fullscreenElement || doc.webkitFullscreenElement || null;
}

export async function requestElementFullscreen(el: HTMLElement): Promise<boolean> {
  const anyEl = el as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => void;
    webkitRequestFullScreen?: () => void;
  };
  try {
    if (typeof anyEl.requestFullscreen === 'function') {
      await anyEl.requestFullscreen();
      return true;
    }
    if (typeof anyEl.webkitRequestFullscreen === 'function') {
      anyEl.webkitRequestFullscreen();
      return true;
    }
    if (typeof anyEl.webkitRequestFullScreen === 'function') {
      anyEl.webkitRequestFullScreen();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function exitDocumentFullscreen(): Promise<void> {
  const doc = document as Document & {
    exitFullscreen?: () => Promise<void>;
    webkitExitFullscreen?: () => void;
    webkitCancelFullScreen?: () => void;
  };
  if (!getFullscreenElement()) return;
  try {
    if (typeof doc.exitFullscreen === 'function') await doc.exitFullscreen();
    else if (typeof doc.webkitExitFullscreen === 'function') doc.webkitExitFullscreen();
    else if (typeof doc.webkitCancelFullScreen === 'function') doc.webkitCancelFullScreen();
  } catch {
    /* ignore */
  }
}

export async function lockLandscapeOrientation(): Promise<void> {
  try {
    const orient = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    if (orient && typeof orient.lock === 'function') {
      await orient.lock('landscape');
    }
  } catch {
    /* iOS / unsupported */
  }
}

export function unlockOrientation(): void {
  try {
    screen.orientation?.unlock?.();
  } catch {
    /* ignore */
  }
}

export function enterIosVideoFullscreen(video: HTMLVideoElement): boolean {
  const v = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
  if (typeof v.webkitEnterFullscreen !== 'function') return false;
  try {
    v.webkitEnterFullscreen();
    return true;
  } catch {
    return false;
  }
}

export function exitIosVideoFullscreen(video: HTMLVideoElement | null): void {
  if (!video) return;
  const v = video as HTMLVideoElement & {
    webkitDisplayingFullscreen?: boolean;
    webkitExitFullscreen?: () => void;
  };
  if (v.webkitDisplayingFullscreen && typeof v.webkitExitFullscreen === 'function') {
    v.webkitExitFullscreen();
  }
}

export function setPageVideoFsClass(on: boolean): void {
  document.documentElement.classList.toggle('lesson-video-fs', on);
  document.body.classList.toggle('lesson-video-fs', on);
  document.body.style.overflow = on ? 'hidden' : '';
}
