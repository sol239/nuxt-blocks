export type TypingFormat =
  | "bold"
  | "underline"
  | "strikethrough"
  | "italic"
  | "code"
  | "math";

export const useTypingStore = defineStore("typing", () => {
  const isBold = ref<boolean>(false);
  const isUnderlined = ref<boolean>(false);
  const isStrikethrough = ref<boolean>(false);
  const isItalic = ref<boolean>(false);
  const isCode = ref<boolean>(false);
  const isMath = ref<boolean>(false);

  function toggle(format: TypingFormat) {
    if (format === "bold") isBold.value = !isBold.value;
    if (format === "underline") isUnderlined.value = !isUnderlined.value;
    if (format === "strikethrough") isStrikethrough.value = !isStrikethrough.value;
    if (format === "italic") isItalic.value = !isItalic.value;
    if (format === "code") isCode.value = !isCode.value;
    if (format === "math") isMath.value = !isMath.value;
  }

  function reset() {
    isBold.value = false;
    isUnderlined.value = false;
    isStrikethrough.value = false;
    isItalic.value = false;
    isCode.value = false;
    isMath.value = false;
  }

  return {
    isBold,
    isUnderlined,
    isStrikethrough,
    isItalic,
    isCode,
    isMath,
    toggle,
    reset,
  };
});
