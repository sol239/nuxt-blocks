import { defineStore } from "pinia";
import { ref } from "vue";
import type { StyleSpan, ColorSpan, KnownStyle } from "~/core/blocks/textSpans";

export type TypingFormat =
  | "bold"
  | "underline"
  | "strikethrough"
  | "italic"
  | "code"
  | "math"
  | "inverse";

export const useTypingStore = defineStore("typing", () => {
  const isBold = ref<boolean>(false);
  const isUnderlined = ref<boolean>(false);
  const isStrikethrough = ref<boolean>(false);
  const isItalic = ref<boolean>(false);
  const isCode = ref<boolean>(false);
  const isMath = ref<boolean>(false);
  const isInverse = ref<boolean>(false);

  const selectedColor = ref<string>("#000000");

  const activeBlockId = ref<string | null>(null);
  const selectionRange = ref<{ start: number; end: number } | null>(null);

  function toggle(format: TypingFormat) {
    if (format === "bold") isBold.value = !isBold.value;
    else if (format === "underline") isUnderlined.value = !isUnderlined.value;
    else if (format === "strikethrough") isStrikethrough.value = !isStrikethrough.value;
    else if (format === "italic") isItalic.value = !isItalic.value;
    else if (format === "code") isCode.value = !isCode.value;
    else if (format === "math") isMath.value = !isMath.value;
    else if (format === "inverse") isInverse.value = !isInverse.value;
  }

  function setSelection(blockId: string | null, start: number, end: number) {
    activeBlockId.value = blockId;
    selectionRange.value = blockId !== null ? { start, end } : null;
  }

  function syncFromSpans(
    styleSpans: StyleSpan[] = [],
    colorSpans: ColorSpan[] = [],
    start: number,
    end: number,
  ) {
    const inspectPos = start < end ? start : Math.max(0, start - 1);

    // Inspect style
    const matchedStyle = styleSpans.find(s => s.start <= inspectPos && s.end > inspectPos);
    const styles = matchedStyle?.style ? matchedStyle.style.split(/\s+/).filter(Boolean) : [];

    isBold.value = styles.includes("bold");
    isItalic.value = styles.includes("italic") || styles.includes("inverse");
    isUnderlined.value = styles.includes("underline");
    isStrikethrough.value = styles.includes("strikethrough");
    isCode.value = styles.includes("code");
    isMath.value = styles.includes("math");
    isInverse.value = isItalic.value;

    // Inspect color
    const matchedColor = colorSpans.find(c => c.start <= inspectPos && c.end > inspectPos);
    if (matchedColor?.color) {
      selectedColor.value = matchedColor.color;
    }
  }

  function getActiveStyleString(): string {
    const active: KnownStyle[] = [];
    if (isBold.value) active.push("bold");
    if (isItalic.value) active.push("italic");
    if (isUnderlined.value) active.push("underline");
    if (isStrikethrough.value) active.push("strikethrough");
    if (isCode.value) active.push("code");
    if (isMath.value) active.push("math");
    return active.length > 0 ? active.join(" ") : "normal";
  }

  function reset() {
    isBold.value = false;
    isUnderlined.value = false;
    isStrikethrough.value = false;
    isItalic.value = false;
    isCode.value = false;
    isMath.value = false;
    isInverse.value = false;
    selectedColor.value = "#000000";
    activeBlockId.value = null;
    selectionRange.value = null;
  }

  return {
    isBold,
    isUnderlined,
    isStrikethrough,
    isItalic,
    isCode,
    isMath,
    isInverse,
    selectedColor,
    activeBlockId,
    selectionRange,
    toggle,
    setSelection,
    syncFromSpans,
    getActiveStyleString,
    reset,
  };
});
