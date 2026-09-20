/**
 * GET /api/link-meta?url=<encoded-url>
 *
 * Fetches the target page server-side (avoids browser CORS), extracts the
 * page <title> / og:title, and returns it as JSON.
 * Favicon is resolved client-side via Google's favicon service.
 * Only HTTP/HTTPS URLs are allowed.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const rawUrl = String(query.url ?? "");

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw createError({ statusCode: 400, message: "Invalid URL" });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, message: "Only http/https URLs are supported" });
  }

  try {
    const response = await fetch(parsed.href, {
      headers: {
        // Mimic a real browser to avoid bot-blocking
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { title: null };
    }

    // Only read enough of the response to find the title (avoid huge pages)
    const reader = response.body?.getReader();
    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 32_768; // 32 KB is enough to reach the <title>
    let bytesRead = 0;

    if (reader) {
      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.byteLength;
        // Stop early once we've passed </title>
        if (/<\/title>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
    }

    // og:title takes priority over <title>
    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (ogTitleMatch?.[1] ?? titleMatch?.[1] ?? "").trim().slice(0, 300) || null;

    return { title };
  } catch {
    // Network errors, timeouts — return gracefully so the card still shows
    return { title: null };
  }
});
