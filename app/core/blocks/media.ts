export function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function mediaSource(data: string, isUrl: boolean, mimeType: string, kind: string): string {
  if (isUrl) return safeUrl(data);
  if (!mimeType.startsWith(kind + "/") || !/^[a-z]+\/[a-z0-9.+-]+$/i.test(mimeType)) return "";
  const raw = data.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  return raw && /^[A-Za-z0-9+/]*={0,2}$/.test(raw) ? "data:" + mimeType + ";base64," + raw : "";
}
