/** Smart TV remote / keyboard helpers (Tizen, webOS, Android TV, browsers). */

export type TvRemoteAction =
  | "playpause"
  | "play"
  | "pause"
  | "next"
  | "prev"
  | "back"
  | "focus-next"
  | "focus-prev"
  | null;

export function resolveTvRemoteAction(e: KeyboardEvent): TvRemoteAction {
  const key = e.key;
  const code = e.code;
  const keyCode = e.keyCode || e.which;

  // D-pad: move focus between on-screen controls
  if (key === "ArrowRight" || keyCode === 39) return "focus-next";
  if (key === "ArrowLeft" || keyCode === 37) return "focus-prev";
  if (key === "ArrowUp" || keyCode === 38) return "focus-prev";
  if (key === "ArrowDown" || keyCode === 40) return "focus-next";

  // OK / Enter / Space / PlayPause
  if (
    key === "Enter" ||
    key === " " ||
    key === "MediaPlayPause" ||
    key === "Select" ||
    code === "MediaPlayPause" ||
    keyCode === 13 ||
    keyCode === 32
  ) {
    return "playpause";
  }

  if (key === "MediaPlay" || keyCode === 415) return "play";
  if (key === "MediaPause" || keyCode === 19) return "pause";

  // Skip / previous track (color or media keys / letter shortcuts)
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
    keyCode === 10009
  ) {
    return "back";
  }

  return null;
}

export function moveTvFocus(direction: 1 | -1) {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-tv-focus]"),
  ).filter((el) => !(el as HTMLButtonElement).disabled);

  if (!nodes.length) return;

  const active = document.activeElement as HTMLElement | null;
  const index = active ? nodes.indexOf(active) : -1;
  const next =
    index < 0
      ? direction > 0
        ? nodes[0]
        : nodes[nodes.length - 1]
      : nodes[(index + direction + nodes.length) % nodes.length];

  next.focus();
}
