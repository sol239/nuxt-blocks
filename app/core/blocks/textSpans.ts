export interface StyleSpan {
  start: number;
  end: number;
  style: string;
}

export interface ColorSpan {
  start: number;
  end: number;
  color: string;
}

export interface RenderSpan {
  start: number;
  end: number;
  text: string;
  style: string;
  styles: string[];
  color?: string;
}

export type KnownStyle = "normal" | "bold" | "italic" | "underline" | "strikethrough" | "code" | "math" | "inverse";

/**
 * Normalizes an array of StyleSpans:
 * - Sorts by start index
 * - Clips boundaries to [0, textLength]
 * - Merges overlapping/adjacent identical styles
 * - Fills any uncovered gaps with "normal"
 */
export function normalizeStyleSpans(spans: StyleSpan[] = [], textLength: number): StyleSpan[] {
  if (textLength <= 0) return [];
  if (!spans || spans.length === 0) {
    return [{ start: 0, end: textLength, style: "normal" }];
  }

  // Break spans into individual character styles
  const charStyles: string[] = new Array(textLength).fill("normal");

  for (const span of spans) {
    const s = Math.max(0, Math.min(span.start, textLength));
    const e = Math.max(0, Math.min(span.end, textLength));
    for (let i = s; i < e; i++) {
      charStyles[i] = span.style || "normal";
    }
  }

  // Compress into contiguous spans
  const result: StyleSpan[] = [];
  let currentStart = 0;
  let currentStyle = charStyles[0] ?? "normal";

  for (let i = 1; i < textLength; i++) {
    const style = charStyles[i] ?? "normal";
    if (style !== currentStyle) {
      result.push({ start: currentStart, end: i, style: currentStyle });
      currentStart = i;
      currentStyle = style;
    }
  }

  result.push({ start: currentStart, end: textLength, style: currentStyle });
  return result;
}

/**
 * Normalizes ColorSpans:
 * - Sorts by start index
 * - Clips boundaries to [0, textLength]
 * - Merges contiguous identical colors
 */
export function normalizeColorSpans(spans: ColorSpan[] = [], textLength: number): ColorSpan[] {
  if (textLength <= 0 || !spans || spans.length === 0) return [];

  const charColors: Array<string | undefined> = new Array(textLength).fill(undefined);

  for (const span of spans) {
    const s = Math.max(0, Math.min(span.start, textLength));
    const e = Math.max(0, Math.min(span.end, textLength));
    for (let i = s; i < e; i++) {
      charColors[i] = span.color;
    }
  }

  const result: ColorSpan[] = [];
  let currentStart = -1;
  let currentColor: string | undefined = undefined;

  for (let i = 0; i < textLength; i++) {
    const c = charColors[i];
    if (c !== currentColor) {
      if (currentColor !== undefined && currentStart !== -1) {
        result.push({ start: currentStart, end: i, color: currentColor });
      }
      currentStart = c !== undefined ? i : -1;
      currentColor = c;
    }
  }

  if (currentColor !== undefined && currentStart !== -1) {
    result.push({ start: currentStart, end: textLength, color: currentColor });
  }

  return result;
}

/**
 * Toggle or apply a style flag (e.g. "bold", "underline", "inverse", etc.) across [start, end).
 * If all characters in the range already contain the style, it is removed from them.
 * Otherwise, the style is added to all characters in the range.
 */
export function applyStyleToRange(
  spans: StyleSpan[] = [],
  textLength: number,
  start: number,
  end: number,
  targetStyle: KnownStyle,
): StyleSpan[] {
  if (textLength <= 0 || start >= end) return spans;
  const s = Math.max(0, Math.min(start, textLength));
  const e = Math.max(0, Math.min(end, textLength));
  if (s >= e) return spans;

  const normalized = normalizeStyleSpans(spans, textLength);
  const charStyles: string[] = [];
  for (const span of normalized) {
    for (let i = span.start; i < span.end; i++) {
      charStyles[i] = span.style;
    }
  }

  // Check if targetStyle is already fully present in the range
  let allHaveStyle = true;
  for (let i = s; i < e; i++) {
    const currentList = (charStyles[i] ?? "normal").split(/\s+/).filter(Boolean);
    if (!currentList.includes(targetStyle)) {
      allHaveStyle = false;
      break;
    }
  }

  // Toggle style in range
  for (let i = s; i < e; i++) {
    const current = charStyles[i] ?? "normal";
    const currentList = current === "normal" ? [] : current.split(/\s+/).filter(Boolean);
    let updatedList: string[];
    if (allHaveStyle) {
      updatedList = currentList.filter(st => st !== targetStyle);
    } else {
      updatedList = currentList.includes(targetStyle) ? currentList : [...currentList, targetStyle];
    }
    charStyles[i] = updatedList.length > 0 ? updatedList.join(" ") : "normal";
  }

  // Re-encode into StyleSpans
  const result: StyleSpan[] = [];
  let currentStart = 0;
  let currentVal = charStyles[0] ?? "normal";

  for (let i = 1; i < textLength; i++) {
    const val = charStyles[i] ?? "normal";
    if (val !== currentVal) {
      result.push({ start: currentStart, end: i, style: currentVal });
      currentStart = i;
      currentVal = val;
    }
  }
  result.push({ start: currentStart, end: textLength, style: currentVal });
  return result;
}

/**
 * Applies a color to all characters in [start, end).
 */
export function applyColorToRange(
  spans: ColorSpan[] = [],
  textLength: number,
  start: number,
  end: number,
  color: string,
): ColorSpan[] {
  if (textLength <= 0 || start >= end) return spans;
  const s = Math.max(0, Math.min(start, textLength));
  const e = Math.max(0, Math.min(end, textLength));
  if (s >= e) return spans;

  const charColors: Array<string | undefined> = new Array(textLength).fill(undefined);
  for (const span of spans) {
    const spanS = Math.max(0, Math.min(span.start, textLength));
    const spanE = Math.max(0, Math.min(span.end, textLength));
    for (let i = spanS; i < spanE; i++) {
      charColors[i] = span.color;
    }
  }

  for (let i = s; i < e; i++) {
    charColors[i] = color;
  }

  const result: ColorSpan[] = [];
  let currentStart = -1;
  let currentColor: string | undefined = undefined;

  for (let i = 0; i < textLength; i++) {
    const c = charColors[i];
    if (c !== currentColor) {
      if (currentColor !== undefined && currentStart !== -1) {
        result.push({ start: currentStart, end: i, color: currentColor });
      }
      currentStart = c !== undefined ? i : -1;
      currentColor = c;
    }
  }

  if (currentColor !== undefined && currentStart !== -1) {
    result.push({ start: currentStart, end: textLength, color: currentColor });
  }

  return result;
}

/**
 * Reconciles styles and colors when text changes from oldText to newText.
 */
export function reconcileSpansOnTextChange(
  oldText: string,
  newText: string,
  styleSpans: StyleSpan[] = [],
  colorSpans: ColorSpan[] = [],
  activeStyle?: string,
  activeColor?: string,
): { styles: StyleSpan[]; colors: ColorSpan[] } {
  const oldLen = oldText.length;
  const newLen = newText.length;

  if (newLen === 0) {
    return { styles: [], colors: [] };
  }

  if (oldLen === 0) {
    const styles: StyleSpan[] = [{ start: 0, end: newLen, style: activeStyle || "normal" }];
    const colors: ColorSpan[] = activeColor ? [{ start: 0, end: newLen, color: activeColor }] : [];
    return { styles, colors };
  }

  // Find common prefix
  let prefix = 0;
  while (prefix < oldLen && prefix < newLen && oldText[prefix] === newText[prefix]) {
    prefix++;
  }

  // Find common suffix
  let suffix = 0;
  while (
    suffix < oldLen - prefix &&
    suffix < newLen - prefix &&
    oldText[oldLen - 1 - suffix] === newText[newLen - 1 - suffix]
  ) {
    suffix++;
  }

  const oldChangedEnd = oldLen - suffix;
  const newChangedEnd = newLen - suffix;
  const insertedCount = newChangedEnd - prefix;

  // Unpack old character styles and colors
  const oldStyles: string[] = new Array(oldLen).fill("normal");
  for (const span of styleSpans) {
    const s = Math.max(0, Math.min(span.start, oldLen));
    const e = Math.max(0, Math.min(span.end, oldLen));
    for (let i = s; i < e; i++) {
      oldStyles[i] = span.style;
    }
  }

  const oldColors: Array<string | undefined> = new Array(oldLen).fill(undefined);
  for (const span of colorSpans) {
    const s = Math.max(0, Math.min(span.start, oldLen));
    const e = Math.max(0, Math.min(span.end, oldLen));
    for (let i = s; i < e; i++) {
      oldColors[i] = span.color;
    }
  }

  // Inherit style & color for inserted characters
  const defaultStyle = activeStyle || (prefix > 0 ? oldStyles[prefix - 1] : oldStyles[0]) || "normal";
  const defaultColor = activeColor || (prefix > 0 ? oldColors[prefix - 1] : oldColors[0]);

  const newStyles: string[] = [
    ...oldStyles.slice(0, prefix),
    ...new Array(insertedCount).fill(defaultStyle),
    ...oldStyles.slice(oldChangedEnd),
  ];

  const newColors: Array<string | undefined> = [
    ...oldColors.slice(0, prefix),
    ...new Array(insertedCount).fill(defaultColor),
    ...oldColors.slice(oldChangedEnd),
  ];

  // Re-encode into StyleSpan[]
  const styles: StyleSpan[] = [];
  let styleStart = 0;
  let currentStyle = newStyles[0] ?? "normal";
  for (let i = 1; i < newLen; i++) {
    const s = newStyles[i] ?? "normal";
    if (s !== currentStyle) {
      styles.push({ start: styleStart, end: i, style: currentStyle });
      styleStart = i;
      currentStyle = s;
    }
  }
  styles.push({ start: styleStart, end: newLen, style: currentStyle });

  // Re-encode into ColorSpan[]
  const colors: ColorSpan[] = [];
  let colorStart = -1;
  let currentColor: string | undefined = undefined;
  for (let i = 0; i < newLen; i++) {
    const c = newColors[i];
    if (c !== currentColor) {
      if (currentColor !== undefined && colorStart !== -1) {
        colors.push({ start: colorStart, end: i, color: currentColor });
      }
      colorStart = c !== undefined ? i : -1;
      currentColor = c;
    }
  }
  if (currentColor !== undefined && colorStart !== -1) {
    colors.push({ start: colorStart, end: newLen, color: currentColor });
  }

  return {
    styles: normalizeStyleSpans(styles, newLen),
    colors: normalizeColorSpans(colors, newLen),
  };
}

/**
 * Builds non-overlapping RenderSpans by combining text, styleSpans, and colorSpans.
 */
export function buildRenderSpans(
  text: string,
  styleSpans: StyleSpan[] = [],
  colorSpans: ColorSpan[] = [],
): RenderSpan[] {
  const len = text.length;
  if (len === 0) return [];

  // Collect boundary points
  const points = new Set<number>([0, len]);
  for (const s of styleSpans) {
    if (s.start >= 0 && s.start <= len) points.add(s.start);
    if (s.end >= 0 && s.end <= len) points.add(s.end);
  }
  for (const c of colorSpans) {
    if (c.start >= 0 && c.start <= len) points.add(c.start);
    if (c.end >= 0 && c.end <= len) points.add(c.end);
  }

  const sortedPoints = Array.from(points).sort((a, b) => a - b);
  const result: RenderSpan[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i]!;
    const end = sortedPoints[i + 1]!;
    if (start >= end) continue;

    // Find style covering this range
    const matchedStyleSpan = styleSpans.find(s => s.start <= start && s.end >= end);
    const style = matchedStyleSpan?.style || "normal";
    const styles = style === "normal" ? [] : style.split(/\s+/).filter(Boolean);

    // Find color covering this range
    const matchedColorSpan = colorSpans.find(c => c.start <= start && c.end >= end);
    const color = matchedColorSpan?.color;

    result.push({
      start,
      end,
      text: text.slice(start, end),
      style,
      styles,
      color,
    });
  }

  // Merge adjacent render spans that share identical style and color
  if (result.length <= 1) return result;
  const merged: RenderSpan[] = [];
  let current = { ...result[0]! };

  for (let i = 1; i < result.length; i++) {
    const next = result[i]!;
    if (current.style === next.style && current.color === next.color) {
      current.end = next.end;
      current.text += next.text;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

