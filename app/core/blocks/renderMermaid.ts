let queue: Promise<unknown> = Promise.resolve();

/** Mermaid has global configuration; serialize renders so themes cannot race. */
export function renderMermaid(
  source: string,
  id: string,
  dark: boolean,
): Promise<string> {
  const result = queue.then(async () => {
    if (source.length > 50000)
      throw new Error('The diagram is too large (maximum 50,000 characters).');
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: dark ? 'dark' : 'default',
      suppressErrorRendering: true,
      maxTextSize: 50000,
      maxEdges: 500,
      flowchart: { htmlLabels: false },
    });
    const { svg } = await mermaid.render(id, source);
    return svg;
  });
  queue = result.catch(() => {});
  return result;
}
