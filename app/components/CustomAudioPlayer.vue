<template>
  <div class="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
    <!-- Hidden native audio element -->
    <audio
      ref="audioEl"
      :src="src"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @loadeddata="onLoadedMetadata"
      @canplay="onLoadedMetadata"
      @durationchange="onDurationChange"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="onEnded"
      @error="onError"
    />

    <div class="flex items-center gap-3.5">
      <!-- Play/Pause Button -->
      <button
        type="button"
        :aria-label="isPlaying ? 'Pause audio' : 'Play audio'"
        class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-sm transition hover:bg-gray-800 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        @click="togglePlay"
      >
        <!-- Pause icon -->
        <svg v-if="isPlaying" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1.5" />
          <rect x="14" y="4" width="4" height="16" rx="1.5" />
        </svg>
        <!-- Play icon -->
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="ml-0.5">
          <path d="M5 3.868v16.264c0 .858.948 1.375 1.667.915l13.111-8.132a1.077 1.077 0 0 0 0-1.83L6.667 2.953C5.948 2.493 5 3.01 5 3.868Z" />
        </svg>
      </button>

      <!-- Track details & Interactive Scrubber -->
      <div class="min-w-0 flex-1 space-y-1.5">
        <!-- Title and Time display row -->
        <div class="flex items-center justify-between gap-2 text-xs">
          <span class="truncate font-medium text-gray-700">
            {{ displayTitle }}
          </span>
          <span class="shrink-0 font-mono text-gray-400">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </span>
        </div>

        <!-- Custom Scrubber Progress Bar -->
        <div
          ref="progressBar"
          class="group/bar relative flex h-4 w-full cursor-pointer items-center"
          role="slider"
          aria-label="Audio progress"
          :aria-valuenow="Math.round(currentTime)"
          :aria-valuemin="0"
          :aria-valuemax="Math.round(duration)"
          @mousedown="onScrubberMouseDown"
        >
          <!-- Track background -->
          <div class="h-1.5 w-full rounded-full bg-gray-100 group-hover/bar:h-2 transition-all">
            <!-- Progress fill -->
            <div
              class="h-full rounded-full bg-blue-600 transition-[width] duration-75"
              :style="{ width: progressPercent + '%' }"
            />
          </div>
          <!-- Thumb -->
          <div
            class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full border-2 border-blue-600 bg-white shadow-sm opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
            :style="{ left: progressPercent + '%' }"
          />
        </div>
      </div>

      <!-- Volume Mute Toggle -->
      <button
        type="button"
        :aria-label="isMuted ? 'Unmute' : 'Mute'"
        :title="isMuted ? 'Unmute' : 'Mute'"
        class="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition focus:outline-none"
        @click="toggleMute"
      >
        <!-- Muted icon -->
        <svg v-if="isMuted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
        <!-- Sound icon -->
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      </button>

      <!-- Edit Button -->
      <button
        type="button"
        title="Edit audio"
        aria-label="Edit audio"
        class="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition focus:outline-none"
        @click="$emit('edit')"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  src: string;
  title?: string;
}>();

const emit = defineEmits<{
  edit: [];
  error: [message: string];
}>();

const audioEl = ref<HTMLAudioElement>();
const progressBar = ref<HTMLElement>();

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const isMuted = ref(false);

const displayTitle = computed(() => {
  if (props.title && props.title !== "(file uploaded)") {
    try {
      const parsed = new URL(props.title);
      const filename = parsed.pathname.split("/").pop();
      if (filename) return decodeURIComponent(filename);
    } catch {
      return props.title;
    }
  }
  return "Audio track";
});

const progressPercent = computed(() => {
  if (duration.value === 0) return 0;
  return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100));
});

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function togglePlay() {
  if (!audioEl.value) return;
  if (isPlaying.value) {
    audioEl.value.pause();
  } else {
    audioEl.value.play().catch(() => {
      emit("error", "Unable to play this audio.");
    });
  }
}

function toggleMute() {
  if (!audioEl.value) return;
  isMuted.value = !isMuted.value;
  audioEl.value.muted = isMuted.value;
}

function onTimeUpdate() {
  if (!audioEl.value) return;
  currentTime.value = audioEl.value.currentTime;
}

function onLoadedMetadata() {
  if (!audioEl.value) return;
  duration.value = audioEl.value.duration || 0;
}

function onDurationChange() {
  if (!audioEl.value) return;
  duration.value = audioEl.value.duration || 0;
}

function onEnded() {
  isPlaying.value = false;
  currentTime.value = 0;
}

function onError() {
  emit("error", "Unable to load this audio.");
}

function seek(event: MouseEvent) {
  if (!progressBar.value || !audioEl.value || duration.value === 0) return;
  const rect = progressBar.value.getBoundingClientRect();
  const clickX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
  const newTime = (clickX / rect.width) * duration.value;
  audioEl.value.currentTime = newTime;
  currentTime.value = newTime;
}

function onScrubberMouseDown(event: MouseEvent) {
  seek(event);
  const onMouseMove = (e: MouseEvent) => seek(e);
  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

onMounted(() => {
  nextTick(() => {
    if (audioEl.value && audioEl.value.duration) {
      duration.value = audioEl.value.duration;
    }
  });
});
</script>

