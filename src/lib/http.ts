export async function readResponseJson<T = unknown>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.ok
        ? "Empty response from server"
        : `Request failed (${res.status}) with empty body`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Server returned invalid JSON"
        : `Request failed (${res.status}): ${text.slice(0, 160)}`,
    );
  }
}
