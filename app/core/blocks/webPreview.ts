export const MAX_WEB_FILE_BYTES = 2 * 1024 * 1024;

/** Scripts execute only in the opaque-origin sandbox, never in the host DOM. */
export function buildWebPreview(html: string, tailwindRuntime = ''): string {
  const policy =
    "default-src 'none'; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:; img-src https: data: blob:; font-src https: data:; media-src https: data: blob:; connect-src https:; base-uri 'none'; form-action 'none'; object-src 'none'";
  // Escape closing script sequences in the bundled runtime before embedding in HTML.
  const tailwind = tailwindRuntime
    ? `<script>${tailwindRuntime.replace(/<\/script/gi, '<\\/script')}</script>`
    : '';
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width, initial-scale=1">${tailwind}${html}`;
}

export function defaultWebSource(): string {
  return `<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font: 16px system-ui; padding: 32px; margin: 0; color: #172033; background: #f1f5ff; }
    article { max-width: 440px; margin: auto; padding: 24px; background: white; border-radius: 18px; }
    h1 { margin-top: 0; }
    button { border: 0; border-radius: 9px; padding: 12px 18px; background: #4f46e5; color: white; cursor: pointer; }
    output { font-size: 36px; display: block; margin: 20px 0; }
  </style>
</head>
<body>
  <article>
    <h1>Your own mini app</h1>
    <p>Edit the HTML, CSS, and JavaScript, then choose Run HTML.</p>
    <output id="count" aria-live="polite">0</output>
    <button id="increment">Add one</button>
  </article>
  <script>
    let count = 0;
    document.querySelector('#increment').addEventListener('click', () => {
      document.querySelector('#count').textContent = String(++count);
    });
  </script>
</body>
</html>`;
}
