/** Smart TV remote helpers — cursor remotes + D-pad across brands. */

export type TvRemoteAction =
  | "ok"
  | "play"
  | "pause"
  | "next"
  | "prev"
  | "back"
  | "focus-left"
  | "focus-right"
  | "focus-up"
  | "focus-down"
  | null;

let lastPointer = { x: 0, y: 0 };

export function trackPointerPosition(e: MouseEvent | PointerEvent) {
  lastPointer = { x: e.clientX, y: e.clientY };
}

export function getLastPointer() {
  return lastPointer;
}

export function resolveTvRemoteAction(e: KeyboardEvent): TvRemoteAction {
  const key = e.key;
  const code = e.code;
  const keyCode = e.keyCode || e.which;

  if (key === "ArrowRight" || code === "ArrowRight" || keyCode === 39)
    return "focus-right";
  if (key === "ArrowLeft" || code === "ArrowLeft" || keyCode === 37)
    return "focus-left";
  if (key === "ArrowUp" || code === "ArrowUp" || keyCode === 38)
    return "focus-up";
  if (key === "ArrowDown" || code === "ArrowDown" || keyCode === 40)
    return "focus-down";

  // OK / Enter / Select — D-pad center + many cursor remotes
  if (
    key === "Enter" ||
    key === " " ||
    key === "Select" ||
    key === "Accept" ||
    key === "MediaSelect" ||
    key === "MediaPlayPause" ||
    code === "NumpadEnter" ||
    code === "Enter" ||
    code === "Space" ||
    keyCode === 13 ||
    keyCode === 32 ||
    keyCode === 23 || // Android TV DPAD_CENTER
    keyCode === 66 || // some Android KEYCODE_ENTER
    keyCode === 160 // NumpadEnter
  ) {
    return "ok";
  }

  if (key === "MediaPlay" || keyCode === 415 || keyCode === 126) return "play";
  if (key === "MediaPause" || keyCode === 19 || keyCode === 127) return "pause";

  if (
    key === "MediaTrackNext" ||
    key === "MediaFastForward" ||
    key === "n" ||
    key === "N" ||
    keyCode === 417 ||
    keyCode === 418 ||
    keyCode === 87
  ) {
    return "next";
  }

  if (
    key === "MediaTrackPrevious" ||
    key === "MediaRewind" ||
    key === "p" ||
    key === "P" ||
    keyCode === 412 ||
    keyCode === 419 ||
    keyCode === 88
  ) {
    return "prev";
  }

  if (
    key === "Escape" ||
    key === "Backspace" ||
    key === "GoBack" ||
    key === "BrowserBack" ||
    key === "XF86Back" ||
    code === "Escape" ||
    code === "Backspace" ||
    keyCode === 27 ||
    keyCode === 8 ||
    keyCode === 10009 || // Tizen
    keyCode === 461 || // webOS
    keyCode === 166 // Android KEYCODE_BACK
  ) {
    return "back";
  }

  return null;
}

function isVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2;
}

function focusables() {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-tv-focus]"),
  ).filter((el) => !(el as HTMLButtonElement).disabled && isVisible(el));
}

/** Move focus in a screen direction (for D-pad remotes). */
export function moveTvFocusDirectional(
  dir: "left" | "right" | "up" | "down",
) {
  const nodes = focusables();
  if (!nodes.length) return;

  const active = document.activeElement as HTMLElement | null;
  const current = active && nodes.includes(active) ? active : nodes[0];
  const cur = current.getBoundingClientRect();
  const cx = cur.left + cur.width / 2;
  const cy = cur.top + cur.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of nodes) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;

    let ok = false;
    if (dir === "right" && dx > 8) ok = true;
    if (dir === "left" && dx < -8) ok = true;
    if (dir === "down" && dy > 8) ok = true;
    if (dir === "up" && dy < -8) ok = true;
    if (!ok) continue;

    const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
    const secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  (
    best ??
    (dir === "right" || dir === "down" ? nodes[nodes.length - 1] : nodes[0])
  ).focus();
}

export function moveTvFocus(direction: 1 | -1) {
  moveTvFocusDirectional(direction > 0 ? "right" : "left");
}

function clickableUnderPoint(x: number, y: number): HTMLElement | null {
  const under = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!under) return null;
  const tagged = under.closest("[data-tv-focus]") as HTMLElement | null;
  if (tagged && !(tagged as HTMLButtonElement).disabled && isVisible(tagged)) {
    return tagged;
  }
  const native = under.closest(
    "button, a[href], [role='button'], input[type='submit'], input[type='button'], input[type='file']",
  ) as HTMLElement | null;
  if (native && !(native as HTMLButtonElement).disabled && isVisible(native)) {
    return native;
  }
  return null;
}

/** Activate control under focus, or under cursor (magic remotes). */
export function activateTvTarget(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (
    active?.matches?.("[data-tv-focus]") &&
    !(active as HTMLButtonElement).disabled &&
    isVisible(active)
  ) {
    active.click();
    return true;
  }

  const { x, y } = lastPointer;
  const under = clickableUnderPoint(x, y);
  if (under) {
    under.focus();
    under.click();
    return true;
  }

  const hovered = document.querySelector<HTMLElement>(
    "[data-tv-focus]:hover, button:hover, a[href]:hover",
  );
  if (hovered && !(hovered as HTMLButtonElement).disabled && isVisible(hovered)) {
    hovered.focus();
    hovered.click();
    return true;
  }

  return false;
}
