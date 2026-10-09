const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export function mediaUrl(value: string): string {
  if (!/^\/(?:images|media)\/[\w().-]+\.(?:png|webp)$/.test(value))
    throw new Error("The server returned an invalid image reference.");
  return `${base}${value}`;
}
export async function api<T>(
  route: string,
  payload: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const timeout = AbortSignal.timeout(180_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetch(`${base}/api/${route}`, {
      method: payload === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: combined,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Something went wrong. Please try again.");
    return data as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted)
      throw new Error("This took too long. Please try again.");
    if (error instanceof TypeError || error instanceof SyntaxError)
      throw new Error(
        "The café assistant is unavailable. Please try again in a moment.",
      );
    throw error;
  }
}
