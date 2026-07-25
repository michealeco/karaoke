/** Smart TV remote helpers — cursor remotes + D-pad. */

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

  if (key === "ArrowRight" || keyCode === 39) return "focus-right";
  if (key === "ArrowLeft" || keyCode === 37) return "focus-left";
  if (key === "ArrowUp" || keyCode === 38) return "focus-up";
  if (key === "ArrowDown" || keyCode === 40) return "focus-down";

  // OK / Enter / Select — used by D-pad and many cursor remotes
  if (
    key === "Enter" ||
    key === " " ||
    key === "Select" ||
    key === "MediaPlayPause" ||
    code === "NumpadEnter" ||
    keyCode === 13 ||
    keyCode === 32 ||
    keyCode === 23 // Android TV DPAD_CENTER
  ) {
    return "ok";
  }

  if (key === "MediaPlay" || keyCode === 415) return "play";
  if (key === "MediaPause" || keyCode === 19) return "pause";

  if (
    key === "MediaTrackNext" ||
    key === "MediaFastForward" ||
    key === "n" ||
    key === "N" ||
    keyCode === 417 ||
    keyCode === 418
  ) {
    return "next";
  }

  if (
    key === "MediaTrackPrevious" ||
    key === "MediaRewind" ||
    key === "p" ||
    key === "P" ||
    keyCode === 412 ||
    keyCode === 419
  ) {
    return "prev";
  }

  if (
    key === "Escape" ||
    key === "Backspace" ||
    key === "GoBack" ||
    key === "BrowserBack" ||
    keyCode === 27 ||
    keyCode === 8 ||
    keyCode === 10009 ||
    keyCode === 461 // webOS back
  ) {
    return "back";
  }

  return null;
}

function focusables() {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-tv-focus]"),
  ).filter((el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null);
}

/** Move focus in a screen direction (for D-pad remotes). */
export function moveTvFocusDirectional(
  dir: "left" | "right" | "up" | "down",
) {
  const nodes = focusables();
  if (!nodes.length) return;

  const active = document.activeElement as HTMLElement | null;
  const current =
    active && nodes.includes(active) ? active : nodes[0];
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

    // Prefer elements mostly aligned on the secondary axis
    const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
    const secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  (best ?? (dir === "right" || dir === "down" ? nodes[nodes.length - 1] : nodes[0])).focus();
}

export function moveTvFocus(direction: 1 | -1) {
  moveTvFocusDirectional(direction > 0 ? "right" : "left");
}

/** Activate control under focus, or under cursor (magic remotes). */
export function activateTvTarget(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (active?.matches?.("[data-tv-focus]") && !(active as HTMLButtonElement).disabled) {
    active.click();
    return true;
  }

  const { x, y } = lastPointer;
  const under = document.elementFromPoint(x, y) as HTMLElement | null;
  const target = under?.closest?.("[data-tv-focus]") as HTMLElement | null;
  if (target && !(target as HTMLButtonElement).disabled) {
    target.focus();
    target.click();
    return true;
  }

  const hovered = document.querySelector<HTMLElement>("[data-tv-focus]:hover");
  if (hovered && !(hovered as HTMLButtonElement).disabled) {
    hovered.focus();
    hovered.click();
    return true;
  }

  return false;
}
