<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="visible"
      class="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-3rem)] max-w-4xl -translate-x-1/2 items-center justify-between rounded-2xl border border-gray-200 bg-white/95 px-4 py-2 shadow-xl backdrop-blur-sm"
      role="toolbar"
      aria-label="Text formatting"
      @mousedown="onToolbarMouseDown"
    >
      <!-- Left: Text formatting buttons, then Font family & Font size -->
      <div class="flex items-center gap-2.5">
        <!-- Formatting buttons: Bold, Italic, Underline, Strikethrough, Code, Math -->
        <div class="flex items-center gap-0.5">
          <!-- Bold -->
          <button
            type="button"
            class="toolbar-button"
            :class="{ 'toolbar-button-active': isBold }"
            :aria-pressed="isBold"
            aria-label="Bold"
            title="Bold (Ctrl+B)"
            @mousedown.prevent
            @click="onFormatClick('bold')"
          >
            <Icon name="material-symbols:format-bold" class="size-5" />
          </button>

          <!-- Italic (the "I", cursive) -->
          <button
            type="button"
            class="toolbar-button"
            :class="{ 'toolbar-button-active': isItalic }"
            :aria-pressed="isItalic"
            aria-label="Italic"
            title="Italic (Ctrl+I)"
            @mousedown.prevent
            @click="onFormatClick('italic')"
          >
            <Icon name="material-symbols:format-italic" class="size-5" />
          </button>

          <!-- Underline -->
          <button
            type="button"
            class="toolbar-button"
            :class="{ 'toolbar-button-active': isUnderlined }"
            :aria-pressed="isUnderlined"
            aria-label="Underline"
            title="Underline (Ctrl+U)"
            @mousedown.prevent
            @click="onFormatClick('underline')"
          >
            <Icon name="material-symbols:format-underlined" class="size-5" />
          </button>

          <!-- Strikethrough -->
          <button
            type="button"
            class="toolbar-button"
            :class="{ 'toolbar-button-active': isStrikethrough }"
            :aria-pressed="isStrikethrough"
            aria-label="Strikethrough"
            title="Strikethrough (Ctrl+Shift+X)"
            @mousedown.prevent
            @click="onFormatClick('strikethrough')"
          >
            <Icon name="material-symbols:strikethrough-s" class="size-5" />
          </button>

          <!-- Code -->
          <button
            type="button"
            class="toolbar-button"
            :class="{ 'toolbar-button-active': isCode }"
            :aria-pressed="isCode"
            aria-label="Code"
            title="Code (Ctrl+E)"
            @mousedown.prevent
            @click="onFormatClick('code')"
          >
            <Icon name="material-symbols:code" class="size-5" />
          </button>

          <!-- Math (inline KaTeX) -->
          <button
            v-if="config.mathAllowed"
            type="button"
            class="toolbar-button"
            :class="{ 'toolbar-button-active': isMath }"
            :aria-pressed="isMath"
            aria-label="Math"
            title="Math (Ctrl+M)"
            @mousedown.prevent
            @click="onFormatClick('math')"
          >
            <Icon name="material-symbols:function" class="size-5" />
          </button>
        </div>

        <!-- Vertical divider between formatting buttons and typography -->
        <div class="h-5 w-px bg-gray-200" />

        <!-- Typography: Font family & Font size -->
        <div class="flex items-center gap-1.5">
          <!-- Font family options -->
          <div ref="fontPicker" class="relative flex items-center">
            <button
              type="button"
              aria-label="Font family"
              aria-haspopup="listbox"
              :aria-expanded="fontMenuOpen"
              :aria-controls="fontMenuId"
              class="flex h-8 cursor-pointer items-center gap-1 rounded-lg border-0 bg-transparent px-2 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              @click="toggleFontMenu"
              @keydown.down.prevent="openFontMenu"
              @keydown.up.prevent="openFontMenu"
            >
              <span>{{ currentFontFamily }}</span>
              <Icon name="material-symbols:arrow-drop-down" class="size-4 text-gray-400" aria-hidden="true" />
            </button>
            <div
              v-if="fontMenuOpen"
              :id="fontMenuId"
              ref="fontMenu"
              role="listbox"
              aria-label="Font family options"
              class="absolute bottom-[calc(100%+8px)] left-0 z-20 max-h-64 min-w-44 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl"
              @keydown="onFontMenuKeydown"
            >
              <button
                v-for="font in fontFamilies"
                :key="font"
                type="button"
                role="option"
                :aria-selected="currentFontFamily === font"
                class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                :class="{ 'bg-blue-50 text-blue-700': currentFontFamily === font }"
                :style="{ fontFamily: font }"
                @click="onFontFamilyChange(font)"
              >
                <span>{{ font }}</span>
                <Icon v-if="currentFontFamily === font" name="material-symbols:check" class="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <!-- Font size input -->
          <div class="flex items-center gap-0.5 rounded-lg px-1.5 py-1 hover:bg-gray-100">
            <input
              type="number"
              min="8"
              max="96"
              aria-label="Font size"
              :value="currentFontSize"
              class="w-8 bg-transparent text-center text-xs font-medium text-gray-700 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              @input="onFontSizeInput(($event.target as HTMLInputElement).value)"
              @keydown.enter="onFontSizeEnter"
              @blur="onFontSizeBlur"
            >
            <span class="text-[10px] text-gray-400 select-none">px</span>
          </div>
        </div>
      </div>

      <!-- Right: Color selector (centered right) -->
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-gray-400 select-none">Color:</span>
        <div class="flex items-center gap-1.5">
          <!-- Preset 1: Black -->
          <button
            type="button"
            aria-label="Black"
            title="Black"
            class="flex size-7 items-center justify-center rounded-lg transition-transform hover:scale-105 focus:outline-none"
            :class="selectedColor.toLowerCase() === '#000000' ? 'ring-2 ring-blue-500 ring-offset-2' : ''"
            style="background-color: #000000"
            @mousedown.prevent
            @click="onColorSelect('#000000')"
          >
            <Icon v-if="selectedColor.toLowerCase() === '#000000'" name="material-symbols:check" class="size-4 text-white" />
          </button>

          <!-- Preset 2: Blue -->
          <button
            type="button"
            aria-label="Blue"
            title="Blue"
            class="flex size-7 items-center justify-center rounded-lg transition-transform hover:scale-105 focus:outline-none"
            :class="selectedColor.toLowerCase() === '#2563eb' ? 'ring-2 ring-blue-500 ring-offset-2' : ''"
            style="background-color: #2563eb"
            @mousedown.prevent
            @click="onColorSelect('#2563eb')"
          >
            <Icon v-if="selectedColor.toLowerCase() === '#2563eb'" name="material-symbols:check" class="size-4 text-white" />
          </button>

          <!-- Preset 3: Red -->
          <button
            type="button"
            aria-label="Red"
            title="Red"
            class="flex size-7 items-center justify-center rounded-lg transition-transform hover:scale-105 focus:outline-none"
            :class="selectedColor.toLowerCase() === '#dc2626' ? 'ring-2 ring-blue-500 ring-offset-2' : ''"
            style="background-color: #dc2626"
            @mousedown.prevent
            @click="onColorSelect('#dc2626')"
          >
            <Icon v-if="selectedColor.toLowerCase() === '#dc2626'" name="material-symbols:check" class="size-4 text-white" />
          </button>

          <!-- Preset 4: Green -->
          <button
            type="button"
            aria-label="Green"
            title="Green"
            class="flex size-7 items-center justify-center rounded-lg transition-transform hover:scale-105 focus:outline-none"
            :class="selectedColor.toLowerCase() === '#16a34a' ? 'ring-2 ring-blue-500 ring-offset-2' : ''"
            style="background-color: #16a34a"
            @mousedown.prevent
            @click="onColorSelect('#16a34a')"
          >
            <Icon v-if="selectedColor.toLowerCase() === '#16a34a'" name="material-symbols:check" class="size-4 text-white" />
          </button>

          <!-- Preset 5: Custom color picked -->
          <button
            type="button"
            :aria-label="`Custom color: ${customColor}`"
            :title="`Custom color: ${customColor}`"
            class="flex size-7 items-center justify-center rounded-lg transition-transform hover:scale-105 focus:outline-none"
            :class="isCustomColorSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''"
            :style="{ backgroundColor: customColor }"
            @mousedown.prevent
            @click="onColorSelect(customColor)"
          >
            <Icon
              v-if="isCustomColorSelected"
              name="material-symbols:check"
              class="size-4"
              :class="isLightColor(customColor) ? 'text-gray-900' : 'text-white'"
            />
          </button>

          <!-- Color picker trigger -->
          <label
            class="relative flex size-7 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            title="Pick custom color"
            aria-label="Pick custom color"
          >
            <Icon name="material-symbols:colorize" class="size-4" />
            <input
              type="color"
              :value="customColor"
              class="sr-only"
              @input="onCustomColorInput(($event.target as HTMLInputElement).value)"
              @change="onCustomColorChange"
            >
          </label>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useTypingStore } from "~/stores/useTypingStore";
import type { Block } from "~/core/blocks/Block";
import { applyStyleToRange, applyColorToRange, type KnownStyle } from "~/core/blocks/textSpans";
import { useBlocksConfig } from "~/composables/useBlocksConfig";

const config = useBlocksConfig();

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    block?: Block | null;
  }>(),
  {
    visible: true,
    block: null,
  },
);

const selectedColor = defineModel<string>("selectedColor", { default: "#000000" });

const emit = defineEmits<{
  "update:settings": [settings: { fontFamily?: string; fontSize?: number }];
  "update:block": [value: Block];
}>();

const customColor = ref("#9333ea");
const standardColors = new Set(["#000000", "#2563eb", "#dc2626", "#16a34a"]);

const isCustomColorSelected = computed(() => {
  return (
    selectedColor.value.toLowerCase() === customColor.value.toLowerCase() &&
    !standardColors.has(selectedColor.value.toLowerCase())
  );
});

function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128;
  }
  return false;
}

const typingStore = useTypingStore();
const {
  isBold,
  isItalic,
  isUnderlined,
  isStrikethrough,
  isCode,
  isMath,
} = storeToRefs(typingStore);

function onToolbarMouseDown(event: MouseEvent) {
  // Prevent focus stealing for anything other than selects and inputs
  const target = event.target as HTMLElement | null;
  if (!target?.closest("select, input")) {
    event.preventDefault();
  }
}

function restoreBlockFocus() {
  const blockId = props.block?.id ?? typingStore.activeBlockId;
  if (!blockId) return;

  const wrapper = document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
  const textarea = wrapper?.querySelector<HTMLTextAreaElement>("textarea") ??
    document.querySelector<HTMLTextAreaElement>(`[data-block-id="${blockId}"] textarea`);

  if (textarea) {
    textarea.focus();
    if (typingStore.selectionRange) {
      const { start, end } = typingStore.selectionRange;
      try {
        textarea.setSelectionRange(start, end);
      } catch {
        // Ignore if element doesn't support selection
      }
    }
  }
}

function onFormatClick(format: KnownStyle) {
  if (format === "math" && !config.mathAllowed) {
    return;
  }

  if (
    props.block &&
    typingStore.selectionRange &&
    typingStore.selectionRange.start < typingStore.selectionRange.end
  ) {
    const text = props.block.data ?? "";
    const { start, end } = typingStore.selectionRange;
    const updatedStyles = applyStyleToRange(
      props.block.blockSettings?.styles ?? [],
      text.length,
      start,
      end,
      format,
    );
    const updated = props.block.withSettings({
      ...props.block.blockSettings,
      styles: updatedStyles,
    });
    emit("update:block", updated);
    typingStore.syncFromSpans(
      updatedStyles,
      props.block.blockSettings?.colors ?? [],
      start,
      end,
    );
  } else {
    typingStore.toggle(format as any);
  }

  restoreBlockFocus();
  nextTick(() => {
    restoreBlockFocus();
  });
}

function onColorSelect(color: string) {
  selectedColor.value = color;
  typingStore.selectedColor = color;

  if (
    props.block &&
    typingStore.selectionRange &&
    typingStore.selectionRange.start < typingStore.selectionRange.end
  ) {
    const text = props.block.data ?? "";
    const { start, end } = typingStore.selectionRange;
    const updatedColors = applyColorToRange(
      props.block.blockSettings?.colors ?? [],
      text.length,
      start,
      end,
      color,
    );
    const updated = props.block.withSettings({
      ...props.block.blockSettings,
      colors: updatedColors,
    });
    emit("update:block", updated);
  }

  restoreBlockFocus();
  nextTick(() => {
    restoreBlockFocus();
  });
}

function onCustomColorInput(color: string) {
  customColor.value = color;
  onColorSelect(color);
}

function onCustomColorChange() {
  restoreBlockFocus();
}

const fontFamilies = [
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
];
const currentFontFamily = computed(() => props.block?.blockSettings?.fontFamily ?? "Inter");
const fontPicker = ref<HTMLElement>();
const fontMenu = ref<HTMLElement>();
const fontMenuOpen = ref(false);
const fontMenuId = `font-family-${useId()}`;

function openFontMenu() {
  fontMenuOpen.value = true;
  nextTick(() => {
    const index = Math.max(0, fontFamilies.indexOf(currentFontFamily.value));
    fontMenu.value?.querySelectorAll<HTMLButtonElement>('[role="option"]')[index]?.focus();
  });
}

function closeFontMenu() {
  fontMenuOpen.value = false;
  fontPicker.value?.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')?.focus();
}

function toggleFontMenu() {
  if (fontMenuOpen.value) closeFontMenu();
  else openFontMenu();
}

function onFontMenuKeydown(event: KeyboardEvent) {
  const options = [...(fontMenu.value?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === "Escape") {
    event.preventDefault();
    closeFontMenu();
  } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  }
}

function onFontPointerDown(event: PointerEvent) {
  if (fontMenuOpen.value && !fontPicker.value?.contains(event.target as Node)) fontMenuOpen.value = false;
}

const defaultFontSize = computed(() => {
  const type = props.block?.blockType;
  if (type === "heading1") return 36;
  if (type === "heading2") return 28;
  if (type === "heading3") return 22;
  return 16;
});

const currentFontSize = computed(() => {
  return props.block?.blockSettings?.fontSize ?? defaultFontSize.value;
});

function onFontFamilyChange(fontFamily: string) {
  fontMenuOpen.value = false;
  emit("update:settings", { fontFamily });
  restoreBlockFocus();
  nextTick(() => {
    restoreBlockFocus();
  });
}

function onFontSizeInput(val: string) {
  const size = Number(val);
  if (!isNaN(size) && size > 0 && size <= 200) {
    emit("update:settings", { fontSize: size });
  }
}

function onFontSizeEnter() {
  restoreBlockFocus();
}

function onFontSizeBlur() {
  restoreBlockFocus();
}

function handleKeyboardShortcut(event: KeyboardEvent) {
  if (!props.visible) {
    return;
  }

  if ((!event.ctrlKey && !event.metaKey) || event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "b" && !event.shiftKey) {
    onFormatClick("bold");
  } else if (key === "i" && !event.shiftKey) {
    onFormatClick("italic");
  } else if (key === "u" && !event.shiftKey) {
    onFormatClick("underline");
  } else if (key === "x" && event.shiftKey) {
    onFormatClick("strikethrough");
  } else if (key === "e" && !event.shiftKey) {
    onFormatClick("code");
  } else if (key === "m" && !event.shiftKey) {
    if (!config.mathAllowed) return;
    onFormatClick("math");
  } else {
    return;
  }

  event.preventDefault();
}

onMounted(() => {
  document.addEventListener("keydown", handleKeyboardShortcut);
  document.addEventListener("pointerdown", onFontPointerDown);
});
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyboardShortcut);
  document.removeEventListener("pointerdown", onFontPointerDown);
});
</script>

<style scoped>
@reference "tailwindcss";

.toolbar-button {
  @apply flex size-9 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900;
}

.toolbar-button-active {
  @apply bg-gray-900 text-white hover:bg-gray-800 hover:text-white;
}
</style>
