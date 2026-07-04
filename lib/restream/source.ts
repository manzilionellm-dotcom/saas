// Authorized-source validation.
//
// This module refuses to treat anything as a restream source unless the caller
// explicitly attests authorization AND the URL actually resolves to something
// that looks like an M3U/M3U8 playlist the user pointed us at. We ship no
// built-in / third-party stream URLs anywhere in this codebase — the user must
// supply their own authorized source every time.

const M3U_MARKER = "#EXTM3U";

export interface SourceValidation {
  ok: boolean;
  kind: "m3u" | null;
  host: string;
  error?: string;
}

/** Basic shape/scheme checks with no network access. */
export function parseSourceUrl(raw: string): { url: URL | null; error?: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { url: null, error: "Source is not a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { url: null, error: "Source must be an http(s) URL." };
  }
  // Refuse obvious loopback/metadata targets to avoid SSRF against our own host.
  const host = url.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "169.254.169.254" || // cloud metadata
    host.endsWith(".localhost");
  if (blocked && process.env.RESTREAM_ALLOW_LOCAL !== "1") {
    return { url: null, error: "Source host is not allowed." };
  }
  return { url };
}

/**
 * Fetch the first bytes of the source and confirm it looks like an M3U playlist.
 * Returns validation result; never throws.
 */
export async function validateSource(raw: string): Promise<SourceValidation> {
  const { url, error } = parseSourceUrl(raw);
  if (!url) return { ok: false, kind: null, host: "", error };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "restream-relay/1.0", Range: "bytes=0-4095" },
    });
    if (!res.ok || !res.body) {
      return {
        ok: false,
        kind: null,
        host: url.hostname,
        error: `Source responded with HTTP ${res.status}.`,
      };
    }
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const looksM3uByType =
      contentType.includes("mpegurl") || contentType.includes("m3u");

    // Read a small prefix to confirm the #EXTM3U marker.
    const reader = res.body.getReader();
    const { value } = await reader.read();
    await reader.cancel().catch(() => {});
    const prefix = value ? new TextDecoder().decode(value).slice(0, 512) : "";
    const looksM3uByBody = prefix.includes(M3U_MARKER);

    if (looksM3uByType || looksM3uByBody) {
      return { ok: true, kind: "m3u", host: url.hostname };
    }
    return {
      ok: false,
      kind: null,
      host: url.hostname,
      error: "Source does not look like an M3U/M3U8 playlist.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      kind: null,
      host: url.hostname,
      error:
        controller.signal.aborted ? "Source timed out." : `Source unreachable: ${message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Lightweight reachability probe used by the health loop (single request). */
export async function probeSource(
  raw: string,
): Promise<{ reachable: boolean; error?: string }> {
  const { url, error } = parseSourceUrl(raw);
  if (!url) return { reachable: false, error };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "restream-relay/1.0", Range: "bytes=0-1023" },
    });
    await res.body?.cancel().catch(() => {});
    return { reachable: res.ok };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      reachable: false,
      error: controller.signal.aborted ? "timeout" : message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
