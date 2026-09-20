<template>
  <div
    role="toolbar"
    aria-label="Drawing tools"
    class="drawing-toolbar flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white/95 p-2 text-xs text-gray-700 shadow-sm backdrop-blur-sm select-none"
    @pointerdown.stop
    @mousedown.stop
  >
    <!-- Main Toolbar Bar -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Tool switch: Pen / Eraser -->
      <div class="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5" role="radiogroup" aria-label="Tool selection">
        <button
          type="button"
          role="radio"
          :aria-checked="activeTool === 'pen'"
          title="Pen tool"
          aria-label="Pen tool"
          class="flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors focus:outline-none"
          :class="activeTool === 'pen' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'"
          @click="emit('update:activeTool', 'pen')"
        >
          <Icon name="material-symbols:draw" class="size-4" />
          <span>Pen</span>
        </button>

        <button
          type="button"
          role="radio"
          :aria-checked="activeTool === 'eraser'"
          title="Eraser tool"
          aria-label="Eraser tool"
          class="flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors focus:outline-none"
          :class="activeTool === 'eraser' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'"
          @click="emit('update:activeTool', 'eraser')"
        >
          <Icon name="material-symbols:ink-eraser-outline" class="size-4" />
          <span>Eraser</span>
        </button>
      </div>

      <div class="h-4 w-px bg-gray-200" />

      <!-- Pen controls -->
      <template v-if="activeTool === 'pen'">
        <!-- Color palette -->
        <div class="flex items-center gap-1" aria-label="Pen color palette">
          <button
            v-for="color in palette"
            :key="color"
            type="button"
            :title="`Color ${color}`"
            :aria-label="`Color ${color}`"
            class="size-5 rounded-full border transition-transform hover:scale-110 focus:outline-none"
            :class="penColor.toLowerCase() === color.toLowerCase() ? 'border-blue-500 ring-2 ring-blue-300 ring-offset-1 scale-105' : 'border-gray-300'"
            :style="{ backgroundColor: color }"
            @click="emit('update:penColor', color)"
          />

          <!-- Custom color picker -->
          <label
            class="relative flex size-5 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-linear-to-tr from-pink-400 via-purple-400 to-blue-400 hover:scale-110"
            title="Custom color"
            aria-label="Custom color picker"
          >
            <input
              type="color"
              :value="penColor"
              class="absolute inset-0 size-full cursor-pointer opacity-0"
              @input="onColorInput"
            />
          </label>
        </div>

        <div class="h-4 w-px bg-gray-200" />

        <!-- Pen Width -->
        <div class="flex items-center gap-1.5" title="Stroke width">
          <label for="pen-width-slider" class="text-gray-500">Size:</label>
          <input
            id="pen-width-slider"
            type="range"
            min="2"
            max="30"
            step="1"
            :value="penWidth"
            aria-label="Pen stroke width"
            class="h-1.5 w-16 cursor-pointer accent-blue-600"
            @input="onPenWidthInput"
          />
          <span class="w-7 font-mono text-[11px] text-gray-500">{{ penWidth }}px</span>
        </div>

        <div class="h-4 w-px bg-gray-200" />

        <!-- Smoothing -->
        <div class="flex items-center gap-1.5" title="Stroke smoothing">
          <label for="smoothing-slider" class="text-gray-500">Smooth:</label>
          <input
            id="smoothing-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="smoothing"
            aria-label="Stroke smoothing"
            class="h-1.5 w-16 cursor-pointer accent-blue-600"
            @input="onSmoothingInput"
          />
          <span class="w-8 font-mono text-[11px] text-gray-500">{{ Math.round(smoothing * 100) }}%</span>
        </div>
      </template>

      <!-- Eraser controls -->
      <template v-else>
        <div class="flex items-center gap-1.5" title="Eraser width">
          <label for="eraser-width-slider" class="text-gray-500">Size:</label>
          <input
            id="eraser-width-slider"
            type="range"
            min="4"
            max="50"
            step="2"
            :value="eraserWidth"
            aria-label="Eraser size"
            class="h-1.5 w-20 cursor-pointer accent-blue-600"
            @input="onEraserWidthInput"
          />
          <span class="w-7 font-mono text-[11px] text-gray-500">{{ eraserWidth }}px</span>
        </div>
      </template>

      <div class="h-4 w-px bg-gray-200" />

      <!-- Actions: Undo & Clear & Counter -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          title="Undo last stroke"
          aria-label="Undo stroke"
          :disabled="!canUndo"
          class="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-transparent"
          @click="emit('undo')"
        >
          <Icon name="material-symbols:undo" class="size-4 text-gray-600" />
          <span>Undo</span>
        </button>

        <button
          type="button"
          title="Clear canvas"
          aria-label="Clear canvas"
          :disabled="strokeCount === 0"
          class="flex items-center gap-1 rounded px-2 py-1 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-35 disabled:hover:bg-transparent"
          @click="emit('clear')"
        >
          <Icon name="material-symbols:delete-outline" class="size-4" />
          <span>Clear</span>
        </button>

        <span class="ml-1 text-[11px] text-gray-400 font-mono">
          {{ strokeCount }} {{ strokeCount === 1 ? 'stroke' : 'strokes' }}
        </span>
      </div>

      <div class="h-4 w-px bg-gray-200" />

      <!-- Experimental Smoothing Toggle -->
      <button
        type="button"
        class="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-gray-100 text-gray-600"
        :class="isExperimentalOpen ? 'bg-blue-50 text-blue-700' : ''"
        :title="isExperimentalOpen ? 'Collapse experimental smoothing controls' : 'Expand experimental smoothing controls'"
        :aria-expanded="isExperimentalOpen"
        @click="isExperimentalOpen = !isExperimentalOpen"
      >
        <Icon name="material-symbols:tune" class="size-4 text-blue-600" />
        <span class="font-medium">Smoothing</span>
        <Icon :name="isExperimentalOpen ? 'material-symbols:expand-less' : 'material-symbols:expand-more'" class="size-4 text-gray-400" />
      </button>
    </div>

    <!-- Expandable Experimental Smoothing Panel -->
    <div
      v-if="isExperimentalOpen"
      class="border-t border-gray-100 pt-2 flex flex-col gap-2 bg-gray-50/70 rounded-lg p-2 mt-0.5"
    >
      <!-- Pipeline Checkboxes -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <span class="font-semibold text-gray-600 flex items-center gap-1">
          <Icon name="material-symbols:science-outline" class="size-3.5 text-blue-600" />
          Pipeline:
        </span>

        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            :checked="smoothingOptions.useCoalescedEvents"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-3.5"
            @change="updateOption('useCoalescedEvents', ($event.target as HTMLInputElement).checked)"
          />
          <span :class="smoothingOptions.useCoalescedEvents ? 'font-medium text-gray-900' : 'text-gray-500'">Coalesced events</span>
        </label>

        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            :checked="smoothingOptions.useResampling"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-3.5"
            @change="updateOption('useResampling', ($event.target as HTMLInputElement).checked)"
          />
          <span :class="smoothingOptions.useResampling ? 'font-medium text-gray-900' : 'text-gray-500'">Resampling</span>
        </label>

        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            :checked="smoothingOptions.useOneEuroFilter"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-3.5"
            @change="updateOption('useOneEuroFilter', ($event.target as HTMLInputElement).checked)"
          />
          <span :class="smoothingOptions.useOneEuroFilter ? 'font-medium text-gray-900' : 'text-gray-500'">One Euro filter</span>
        </label>

        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            :checked="smoothingOptions.useCurveInterpolation"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-3.5"
            @change="updateOption('useCurveInterpolation', ($event.target as HTMLInputElement).checked)"
          />
          <span :class="smoothingOptions.useCurveInterpolation ? 'font-medium text-gray-900' : 'text-gray-500'">Curve interpolation</span>
        </label>

        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            :checked="smoothingOptions.useFinalSmoothing"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-3.5"
            @change="updateOption('useFinalSmoothing', ($event.target as HTMLInputElement).checked)"
          />
          <span :class="smoothingOptions.useFinalSmoothing ? 'font-medium text-gray-900' : 'text-gray-500'">Final smoothing</span>
        </label>

        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            :checked="smoothingOptions.usePrediction"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-3.5"
            @change="updateOption('usePrediction', ($event.target as HTMLInputElement).checked)"
          />
          <span :class="smoothingOptions.usePrediction ? 'font-medium text-gray-900' : 'text-gray-500'">Prediction</span>
        </label>
      </div>

      <!-- Numeric Tuning Controls -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
        <div class="flex items-center gap-1.5" title="One Euro minimum cutoff frequency">
          <label class="text-gray-500">Min cutoff:</label>
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            :value="smoothingOptions.minCutoff"
            class="w-14 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
            @input="updateOption('minCutoff', Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <div class="flex items-center gap-1.5" title="One Euro speed coefficient">
          <label class="text-gray-500">Beta:</label>
          <input
            type="number"
            min="0.001"
            max="1"
            step="0.005"
            :value="smoothingOptions.beta"
            class="w-16 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
            @input="updateOption('beta', Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <div class="flex items-center gap-1.5" title="Minimum distance between consecutive points in pixels">
          <label class="text-gray-500">Point dist:</label>
          <input
            type="number"
            min="0.5"
            max="20"
            step="0.5"
            :value="smoothingOptions.minPointDistance"
            class="w-14 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
            @input="updateOption('minPointDistance', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="text-gray-400 text-[11px]">px</span>
        </div>

        <div class="flex items-center gap-1.5" title="Prediction horizon in milliseconds">
          <label class="text-gray-500">Prediction:</label>
          <input
            type="number"
            min="2"
            max="50"
            step="1"
            :value="smoothingOptions.predictionMs"
            class="w-14 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
            @input="updateOption('predictionMs', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="text-gray-400 text-[11px]">ms</span>
        </div>

        <button
          type="button"
          title="Reset smoothing to defaults"
          class="ml-auto rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none"
          @click="emit('resetSmoothing')"
        >
          Reset smoothing
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { DrawingTool } from "~/core/blocks/DrawingBlock";
import type { DrawingSmoothingOptions } from "~/core/blocks/drawingGeometry";

const palette = [
  "#111827", // Charcoal/Black
  "#2563eb", // Blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#d97706", // Amber
  "#9333ea", // Purple
];

const isExperimentalOpen = ref(false);

const props = defineProps<{
  activeTool: DrawingTool;
  penColor: string;
  penWidth: number;
  eraserWidth: number;
  smoothing: number;
  strokeCount: number;
  canUndo: boolean;
  smoothingOptions: DrawingSmoothingOptions;
}>();

const emit = defineEmits<{
  "update:activeTool": [tool: DrawingTool];
  "update:penColor": [color: string];
  "update:penWidth": [width: number];
  "update:eraserWidth": [width: number];
  "update:smoothing": [smoothing: number];
  "update:smoothingOptions": [options: DrawingSmoothingOptions];
  resetSmoothing: [];
  undo: [];
  clear: [];
}>();

function updateOption<K extends keyof DrawingSmoothingOptions>(key: K, value: DrawingSmoothingOptions[K]) {
  emit("update:smoothingOptions", {
    ...props.smoothingOptions,
    [key]: value,
  });
}

function onColorInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target) emit("update:penColor", target.value);
}

function onPenWidthInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target) emit("update:penWidth", Number(target.value));
}

function onEraserWidthInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target) emit("update:eraserWidth", Number(target.value));
}

function onSmoothingInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target) emit("update:smoothing", Number(target.value));
}
</script>
