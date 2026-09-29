<template>
  <div class="space-y-1">
    <!-- Bordered link block -->
    <div
      class="group/link flex min-h-[62px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
    >
      <!-- Favicon -->
      <img
        v-if="!faviconError && faviconUrl"
        :src="faviconUrl"
        :alt="displayHost + ' icon'"
        width="20"
        height="20"
        class="size-5 shrink-0 rounded-sm object-contain"
        @error="faviconError = true"
      >
      <span
        v-else
        class="flex size-5 shrink-0 items-center justify-center rounded-sm bg-gray-100 text-gray-400"
        aria-hidden="true"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </span>

      <!-- Input area (when editing or when URL is empty) -->
      <div v-if="isEditing || !url" class="min-w-0 flex-1 flex flex-col justify-center">
        <input
          ref="inputRef"
          type="url"
          aria-label="Link URL"
          placeholder="https://example.com"
          class="w-full bg-transparent p-0 text-sm leading-5 text-gray-900 placeholder:text-gray-400 focus:outline-none"
          :value="block.data ?? ''"
          @input="onInput(($event.target as HTMLInputElement).value)"
          @keydown.enter="onEnter"
          @blur="onBlur"
        >
        <p class="truncate text-xs leading-4 text-gray-400">
          {{ displayHost || 'Enter URL and press Enter' }}
        </p>
      </div>

      <!-- Title & host (when not editing and URL is present) -->
      <a
        v-else
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
        class="min-w-0 flex-1 flex flex-col justify-center focus:outline-none"
        :aria-label="(title ?? displayHost) + ' - ' + displayHost"
      >
        <p class="truncate text-sm font-medium leading-5 text-gray-900">{{ title ?? displayHost }}</p>
        <p class="truncate text-xs leading-4 text-gray-400">{{ displayHost }}</p>
      </a>

      <!-- Actions at the end of the card -->
      <div class="flex items-center gap-1 shrink-0">
        <span
          v-if="loading"
          class="size-4 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400"
          role="status"
          aria-label="Fetching link preview..."
        />

        <!-- Edit toggle button -->
        <button
          type="button"
          :aria-label="isEditing ? 'Done editing' : 'Edit link URL'"
          :title="isEditing ? 'Done editing' : 'Edit link URL'"
          class="flex size-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          @click="toggleEdit"
        >
          <!-- Check icon when editing -->
          <svg v-if="isEditing" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <!-- Pencil icon when viewing -->
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>

        <!-- External link icon button -->
        <a
          v-if="url && !isEditing"
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open link in new tab"
          title="Open in new tab"
          class="flex size-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <svg class="size-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Error message if invalid URL -->
    <p v-if="block.data && !url" role="status" class="px-1 text-xs text-red-600">
      Enter a valid HTTP or HTTPS URL.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Block } from "~/core/blocks/Block";
import { safeUrl } from "~/core/blocks/media";

const props = defineProps<{ block: Block }>();
const emit = defineEmits<{ "update:block": [value: Block] }>();

const isEditing = ref(false);
const inputRef = ref<HTMLInputElement>();

const url = computed(() => safeUrl(props.block.data ?? ""));

const displayHost = computed(() => {
  try { return new URL(url.value).hostname.replace(/^www\./, ""); } catch { return url.value; }
});

const faviconUrl = computed(() => {
  if (!url.value) return "";
  try {
    const hostname = new URL(url.value).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
  } catch { return ""; }
});

const title = ref<string | null>(null);
const loading = ref(false);
const faviconError = ref(false);

let fetchController: AbortController | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function onInput(value: string) {
  emit("update:block", props.block.withData(value));
}

function toggleEdit() {
  if (isEditing.value) {
    isEditing.value = false;
  } else {
    isEditing.value = true;
    nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  }
}

function onEnter() {
  if (url.value) {
    isEditing.value = false;
  }
}

function onBlur(event: FocusEvent) {
  const related = event.relatedTarget as HTMLElement | null;
  if (related?.closest(".group\\/link")) return;
  if (url.value) {
    isEditing.value = false;
  }
}

async function fetchTitle(targetUrl: string) {
  fetchController?.abort();
  fetchController = new AbortController();
  loading.value = true;
  title.value = null;
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`,
      { signal: fetchController.signal },
    );
    if (!res.ok) return;
    const data = await res.json() as { status: string; data: { title?: string | null } };
    if (data.status === "success") title.value = data.data.title ?? null;
  } catch {
    // Silently fail - card still shows with hostname as title fallback
  } finally {
    loading.value = false;
  }
}

watch(url, (newUrl) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  title.value = null;
  faviconError.value = false;
  loading.value = false;
  if (!newUrl) return;
  debounceTimer = setTimeout(() => fetchTitle(newUrl), 600);
}, { immediate: true });

onBeforeUnmount(() => {
  fetchController?.abort();
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>
