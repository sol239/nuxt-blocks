import type * as Monaco from 'monaco-editor'

// Paired palettes inspired by Fleet and Monokai; mode is always chosen by the host.
export function registerCodeBlockThemes(monaco: typeof Monaco) {
  const palettes = {
    'fleet-dark': ['#191a21', '#d8dee9', '#22232d', '#343643', '#474b68', '85899a', 'ff8fba', 'a8cc8c', 'c5a5ff', '82b1ff', 'e4be7f'],
    'fleet-light': ['#f7f8fa', '#282c34', '#eef0f4', '#d6d9e0', '#cdddf7', '747b8b', 'a62678', '50812d', '8759b8', '246fba', '986801'],
    'monokai-dark': ['#272822', '#f8f8f2', '#303129', '#49483e', '#49483e', '959586', 'f92672', 'e6db74', 'ae81ff', '66d9ef', 'a6e22e'],
    'monokai-light': ['#faf8f0', '#383830', '#f0ede2', '#d9d4c3', '#ded9c5', '7b796a', 'ba1456', '79620e', '7951ac', '147787', '4e7414'],
  }
  for (const [name, palette] of Object.entries(palettes)) {
    const [background, foreground, line, border, selection, comment, keyword, string, number, type, fn] = palette as [string, string, string, string, string, string, string, string, string, string, string]
    monaco.editor.defineTheme(`blocks-${name}`, {
      base: name.endsWith('dark') ? 'vs-dark' : 'vs', inherit: true,
      rules: [
        { token: 'comment', foreground: comment, fontStyle: 'italic' },
        { token: 'keyword', foreground: keyword },
        { token: 'string', foreground: string },
        { token: 'number', foreground: number },
        { token: 'type', foreground: type },
        { token: 'tag', foreground: keyword },
        { token: 'attribute.name', foreground: fn },
        { token: 'identifier', foreground: foreground.slice(1) },
        { token: 'delimiter', foreground: foreground.slice(1) },
      ],
      colors: {
        'editor.background': background, 'editor.foreground': foreground,
        'editorGutter.background': background, 'editor.lineHighlightBackground': line,
        'editorLineNumber.foreground': `#${comment}`, 'editorLineNumber.activeForeground': foreground,
        'editor.selectionBackground': selection, 'editor.inactiveSelectionBackground': `${selection}88`,
        'editorCursor.foreground': foreground, 'editorWidget.background': line,
        'editorWidget.border': border, 'editorSuggestWidget.background': line,
        'editorSuggestWidget.border': border, 'editorSuggestWidget.selectedBackground': selection,
        'editorHoverWidget.background': line, 'editorHoverWidget.border': border,
      },
    })
  }
}
