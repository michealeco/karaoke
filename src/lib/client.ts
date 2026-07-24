const DISPLAY_KEY = "chorus-display-name";

export function getHostToken(code: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`chorus-host-${code.toUpperCase()}`);
}

export function setHostToken(code: string, token: string) {
  localStorage.setItem(`chorus-host-${code.toUpperCase()}`, token);
}

export function getDisplayName(): string {
  if (typeof window === "undefined") return "Guest";
  return localStorage.getItem(DISPLAY_KEY) || "Guest";
}

export function setDisplayName(name: string) {
  localStorage.setItem(DISPLAY_KEY, name.trim() || "Guest");
}

export function hostHeaders(code: string): HeadersInit {
  const token = getHostToken(code);
  return token ? { "x-host-token": token } : {};
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
