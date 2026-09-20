<template>
  <div class="space-y-2">
    <!-- Edit mode: shown when no media source is loaded yet OR when user clicks the edit button -->
    <div
      v-if="!source || isEditing"
      class="space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
    >
      <!-- URL / file row -->
      <div class="flex items-center gap-2">
        <input
          ref="urlInput"
          type="url"
          :aria-label="kind + ' URL or file name'"
          :placeholder="urlPlaceholder"
          class="min-w-0 flex-1 rounded border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          :value="inputLabel"
          :readonly="!settings.isUrl"
          @focus="!settings.isUrl && fileInput?.click()"
          @input="onUrlInput(($event.target as HTMLInputElement).value)"
          @keydown.enter="source && (isEditing = false)"
        >
        <!-- Choose file button -->
        <button
          type="button"
          :aria-label="`Open ${kind} file`"
          title="Choose file"
          class="flex size-9 shrink-0 items-center justify-center rounded border border-gray-300 text-gray-500 transition hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          @click="fileInput?.click()"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <!-- Hidden file input -->
        <input
          ref="fileInput"
          type="file"
          :accept="kind + '/*'"
          class="sr-only"
          :aria-hidden="true"
          tabindex="-1"
          @change="upload"
        >
        <!-- Done button (when source is present) -->
        <button
          v-if="source"
          type="button"
          title="Done editing"
          aria-label="Done editing"
          class="flex size-9 shrink-0 items-center justify-center rounded bg-gray-900 text-white transition hover:bg-gray-800 focus:outline-none"
          @click="isEditing = false"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      <!-- Alt text (image only) -->
      <label v-if="kind === 'image'" class="flex items-center gap-2 text-sm text-gray-600">
        Alt text
        <input
          :value="imageSettings.alt"
          placeholder="Describe the image"
          class="ml-1 min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          @input="setSettings({ alt: ($event.target as HTMLInputElement).value })"
        >
      </label>

      <!-- Dimensions (image & video) -->
      <div v-if="kind !== 'audio'" class="flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <span class="text-xs font-medium text-gray-500">Dimensions:</span>
        <label class="flex items-center gap-1 text-xs">
          W:
          <input
            type="number"
            min="20"
            max="3000"
            placeholder="auto"
            :value="resizableSettings.width ?? ''"
            class="w-20 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            @input="onDimensionInput('width', ($event.target as HTMLInputElement).value)"
          >
          <span class="text-[10px] text-gray-400">px</span>
        </label>
        <label class="flex items-center gap-1 text-xs">
          H:
          <input
            type="number"
            min="20"
            max="3000"
            placeholder="auto"
            :value="resizableSettings.height ?? ''"
            class="w-20 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            @input="onDimensionInput('height', ($event.target as HTMLInputElement).value)"
          >
          <span class="text-[10px] text-gray-400">px</span>
        </label>
        <button
          v-if="resizableSettings.width || resizableSettings.height"
          type="button"
          class="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
          @click="setSettings({ width: undefined, height: undefined })"
        >
          Reset to auto
        </button>
      </div>

      <!-- Error -->
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <p v-else-if="(settings.isUrl ? block.data : true) && !source && block.data" role="status" class="text-sm text-red-600">
        Enter a valid {{ settings.isUrl ? 'HTTP or HTTPS URL' : 'file' }}.
      </p>
    </div>

    <!-- Media display mode: only renders media without doubled URL info -->
    <div v-else class="w-full">
      <!-- Audio: custom modern fullwidth audio player -->
      <CustomAudioPlayer
        v-if="kind === 'audio'"
        :src="source"
        :title="inputLabel"
        @edit="openEdit"
        @error="error = $event"
      />

      <!-- Image / Video -->
      <div
        v-else
        ref="mediaContainer"
        class="group/media relative inline-block max-w-full select-none"
        :style="{
          width: currentWidth ? `${currentWidth}px` : undefined,
          height: currentHeight ? `${currentHeight}px` : undefined,
        }"
      >
        <!-- Edit button to re-open URL/file input -->
        <button
          type="button"
          title="Edit media"
          aria-label="Edit media"
          class="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-lg bg-black/60 text-white shadow-md backdrop-blur-sm opacity-0 group-hover/media:opacity-100 focus:opacity-100 transition hover:bg-black/80"
          @click="openEdit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>

        <!-- Image -->
        <img
          v-if="kind === 'image'"
          ref="mediaElement"
          :src="source"
          :alt="imageSettings.alt"
          class="rounded object-contain"
          :class="{ 'max-h-96 max-w-full': !currentWidth && !currentHeight }"
          :style="{
            width: currentWidth ? '100%' : undefined,
            height: currentHeight ? '100%' : undefined,
          }"
          draggable="false"
          @error="error = 'Unable to load this image.'"
        >

        <!-- Video -->
        <video
          v-else-if="kind === 'video'"
          ref="mediaElement"
          :src="source"
          :controls="true"
          preload="metadata"
          class="rounded object-contain"
          :class="{ 'max-h-96 max-w-full': !currentWidth && !currentHeight }"
          :style="{
            width: currentWidth ? '100%' : undefined,
            height: currentHeight ? '100%' : undefined,
            pointerEvents: isResizing ? 'none' : 'auto',
          }"
          @error="error = 'Unable to load this video. Use a direct media URL, not a video sharing page.'"
        />

        <!-- Resize handle in right down (bottom-right) edge -->
        <div
          role="separator"
          aria-label="Resize media"
          tabindex="0"
          class="absolute -right-2 -bottom-2 z-20 flex size-5 cursor-nwse-resize items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md transition-opacity group-hover/media:opacity-100 touch-none select-none"
          :class="isResizing ? 'opacity-100 ring-2 ring-blue-400' : 'opacity-0'"
          title="Drag to resize width and height"
          @pointerdown="startResize"
          @keydown="onResizeKeydown"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="white" class="pointer-events-none">
            <path d="M7 1v6H1l6-6z" />
          </svg>
        </div>

        <!-- Floating dimension indicator while resizing -->
        <div
          v-if="isResizing && currentWidth && currentHeight"
          class="pointer-events-none absolute bottom-2 left-2 z-30 rounded bg-black/75 px-2 py-0.5 text-[11px] font-mono text-white shadow backdrop-blur-sm"
        >
          {{ currentWidth }} &times; {{ currentHeight }} px
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Block } from "~/core/blocks/Block";
import type { ImageBlockSettings } from "~/core/blocks/ImageBlockSettings";
import type { VideoBlockSettings } from "~/core/blocks/VideoBlockSettings";
import type { AudioBlockSettings } from "~/core/blocks/AudioBlockSettings";
import { mediaSource } from "~/core/blocks/media";

type MediaSettings = ImageBlockSettings | VideoBlockSettings | AudioBlockSettings;
type ResizableMediaSettings = ImageBlockSettings | VideoBlockSettings;

const props = defineProps<{ block: Block; kind: "image" | "video" | "audio" }>();
const emit = defineEmits<{ "update:block": [value: Block] }>();

const isEditing = ref(false);
const urlInput = ref<HTMLInputElement>();
const fileInput = ref<HTMLInputElement>();
const error = ref("");
let uploadVersion = 0;

const settings = computed(() => props.block.blockSettings as MediaSettings);
const imageSettings = computed(() => settings.value as ImageBlockSettings);
const playbackSettings = computed(() => settings.value as VideoBlockSettings | AudioBlockSettings);
const resizableSettings = computed(() => props.block.blockSettings as ResizableMediaSettings);

const source = computed(() =>
  mediaSource(props.block.data ?? "", settings.value.isUrl, settings.value.mimeType, props.kind),
);

const urlPlaceholders: Record<"image" | "video" | "audio", string> = {
  image: "https://example.com/photo.jpg  or choose a file →",
  video: "https://example.com/video.mp4  or choose a file →",
  audio: "https://example.com/audio.mp3  or choose a file →",
};
const urlPlaceholder = computed(() => urlPlaceholders[props.kind]);

/** What to show in the text input: URL string or the uploaded file name */
const inputLabel = computed(() => {
  if (settings.value.isUrl) return props.block.data ?? "";
  return fileInput.value?.files?.[0]?.name ?? (props.block.data ? "(file uploaded)" : "");
});

function openEdit() {
  isEditing.value = true;
  nextTick(() => {
    urlInput.value?.focus();
  });
}

const mediaContainer = ref<HTMLElement>();
const isResizing = ref(false);
const liveWidth = ref<number | undefined>(undefined);
const liveHeight = ref<number | undefined>(undefined);

const currentWidth = computed(() => {
  if (isResizing.value) return liveWidth.value;
  return resizableSettings.value.width;
});

const currentHeight = computed(() => {
  if (isResizing.value) return liveHeight.value;
  return resizableSettings.value.height;
});

let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let startAspectRatio = 1;

function startResize(event: PointerEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();

  const rect = mediaContainer.value?.getBoundingClientRect();
  startWidth = rect?.width || 300;
  startHeight = rect?.height || 200;
  startAspectRatio = startWidth > 0 && startHeight > 0 ? startWidth / startHeight : 1.5;

  startX = event.clientX;
  startY = event.clientY;
  liveWidth.value = Math.round(startWidth);
  liveHeight.value = Math.round(startHeight);
  isResizing.value = true;

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event: PointerEvent) {
  if (!isResizing.value) return;
  const deltaX = event.clientX - startX;
  const deltaY = event.clientY - startY;

  if (event.shiftKey) {
    liveWidth.value = Math.max(60, Math.round(startWidth + deltaX));
    liveHeight.value = Math.max(40, Math.round(startHeight + deltaY));
  } else {
    const delta = (deltaX + deltaY * startAspectRatio) / 2;
    const newW = Math.max(60, Math.round(startWidth + delta));
    const newH = Math.max(40, Math.round(newW / startAspectRatio));
    liveWidth.value = newW;
    liveHeight.value = newH;
  }
}

function onPointerUp() {
  if (!isResizing.value) return;
  isResizing.value = false;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);

  if (liveWidth.value && liveHeight.value) {
    setSettings({
      width: liveWidth.value,
      height: liveHeight.value,
    });
  }
}

function onResizeKeydown(event: KeyboardEvent) {
  if (!mediaContainer.value) return;
  const step = event.shiftKey ? 50 : 10;
  const rect = mediaContainer.value.getBoundingClientRect();
  const currentW = resizableSettings.value.width ?? Math.round(rect.width);
  const currentH = resizableSettings.value.height ?? Math.round(rect.height);
  const ratio = currentW > 0 && currentH > 0 ? currentW / currentH : 1.5;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    const newW = currentW + step;
    setSettings({ width: newW, height: Math.round(newW / ratio) });
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    const newW = Math.max(60, currentW - step);
    setSettings({ width: newW, height: Math.max(40, Math.round(newW / ratio)) });
  }
}

function onDimensionInput(dim: "width" | "height", val: string) {
  const trimmed = val.trim();
  if (trimmed === "") {
    setSettings({ [dim]: undefined });
    return;
  }
  const num = Number(trimmed);
  if (!isNaN(num) && num >= 20 && num <= 3000) {
    setSettings({ [dim]: Math.round(num) });
  }
}

function setSettings(update: Partial<ImageBlockSettings & VideoBlockSettings & AudioBlockSettings>) {
  error.value = "";
  emit("update:block", props.block.withSettings(Object.assign({}, settings.value, update)));
}

function onUrlInput(value: string) {
  uploadVersion++;
  error.value = "";
  emit(
    "update:block",
    props.block.withData(value).withSettings(Object.assign({}, settings.value, { isUrl: true })),
  );
}

function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.type.startsWith(props.kind + "/")) {
    error.value = "Choose a matching " + props.kind + " file.";
    return;
  }
  const version = ++uploadVersion;
  const reader = new FileReader();
  reader.onerror = () => { error.value = "Unable to read this file."; };
  reader.onload = () => {
    if (version !== uploadVersion) return;
    error.value = "";
    const data = String(reader.result).split(",")[1] ?? "";
    emit(
      "update:block",
      props.block
        .withData(data)
        .withSettings(Object.assign({}, settings.value, { isUrl: false, mimeType: file.type })),
    );
    isEditing.value = false;
  };
  reader.readAsDataURL(file);
}

watch(source, () => { error.value = ""; });
onBeforeUnmount(() => {
  uploadVersion++;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
});
</script>
