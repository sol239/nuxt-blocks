<template>
  <div class="drawing-block group/drawing relative w-full select-none">
    <!-- Dedicated Drawing Toolbar with Experimental Smoothing Controls -->
    <div class="mb-2 flex w-full items-center justify-start">
      <DrawingToolbar
        v-model:active-tool="activeTool"
        v-model:pen-color="penColor"
        v-model:pen-width="penWidth"
        v-model:eraser-width="eraserWidth"
        v-model:smoothing="smoothing"
        :smoothing-options="smoothingOptions"
        :stroke-count="strokes.length"
        :can-undo="strokes.length > 0"
        @update:smoothing-options="onUpdateSmoothingOptions"
        @reset-smoothing="resetSmoothing"
        @undo="undoLastStroke"
        @clear="clearDrawing"
      />
    </div>

    <!-- Drawing canvas wrapper -->
    <div
      ref="containerRef"
      tabindex="0"
      aria-label="Drawing canvas"
      class="drawing-canvas-container relative h-[420px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none touch-none"
      :class="activeTool === 'eraser' ? 'cursor-none' : 'cursor-crosshair'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
    >
      <!-- Circular cursor for Eraser tool -->
      <div
        v-if="activeTool === 'eraser' && isPointerInside"
        aria-hidden="true"
        class="pointer-events-none absolute rounded-full border border-gray-700 bg-gray-500/25 shadow-xs transition-transform duration-75"
        :style="{
          width: `${eraserWidth}px`,
          height: `${eraserWidth}px`,
          left: `${cursorPos.x}px`,
          top: `${cursorPos.y}px`,
          transform: 'translate(-50%, -50%)',
        }"
      />

      <!-- Empty state hint -->
      <div
        v-if="strokes.length === 0 && !isDrawing"
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm text-gray-400 select-none"
      >
        <Icon name="material-symbols:draw" class="size-7 opacity-50" />
        <span>Click or drag to draw…</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import type { Application, Graphics, Container } from "pixi.js";
import type { Block } from "~/core/blocks/Block";
import {
  normalizeDrawingData,
  type DrawingStroke,
  type DrawingPoint,
  type DrawingTool,
} from "~/core/blocks/DrawingBlock";
import {
  resamplePoints,
  smoothPoints,
  getDistance,
  buildStrokePath,
  predictPoint,
  OneEuroFilter,
  defaultSmoothingOptions,
  type DrawingSmoothingOptions,
  type TimedPoint,
} from "~/core/blocks/drawingGeometry";
import DrawingToolbar from "./DrawingToolbar.vue";

const props = defineProps<{
  block: Block;
}>();

const emit = defineEmits<{
  "update:block": [value: Block];
}>();

// Editor tool state (not stored in Block data)
const activeTool = ref<DrawingTool>("pen");
const penColor = ref("#111827");
const penWidth = ref(4);
const eraserWidth = ref(20);
const smoothing = ref(0.5);

// Experimental runtime smoothing options
const smoothingOptions = ref<DrawingSmoothingOptions>({
  ...defaultSmoothingOptions,
});

function onUpdateSmoothingOptions(newOptions: DrawingSmoothingOptions) {
  smoothingOptions.value = { ...newOptions };
}

function resetSmoothing() {
  smoothingOptions.value = { ...defaultSmoothingOptions };
}

// Eraser cursor position state
const isPointerInside = ref(false);
const cursorPos = ref({ x: 0, y: 0 });

// Canvas and Pixi references
const containerRef = ref<HTMLDivElement>();
let pixiApp: Application | null = null;
let strokesContainer: Container | null = null;
let currentStrokeGraphics: Graphics | null = null;
let resizeObserver: ResizeObserver | null = null;

let PixiApplication: typeof Application | null = null;
let PixiContainer: typeof Container | null = null;
let PixiGraphics: typeof Graphics | null = null;

async function loadPixi() {
  if (!PixiApplication) {
    try {
      const pixi = await import("pixi.js");
      PixiApplication = pixi.Application;
      PixiContainer = pixi.Container;
      PixiGraphics = pixi.Graphics;
    } catch {
      console.warn(
        "pixi.js is not installed or available. Run 'npx nuxt-blocks init' or 'npm install pixi.js' to enable drawing blocks.",
      );
      return null;
    }
  }
  return PixiApplication;
}

// Persistent strokes from block data
const strokes = ref<DrawingStroke[]>([]);

// Temporary in-progress stroke pipeline state
let isDrawing = false;
let strokeOptions: DrawingSmoothingOptions = { ...defaultSmoothingOptions };
let oneEuroFilter: OneEuroFilter | null = null;
let rawPointsWithTime: TimedPoint[] = [];
let filteredPoints: DrawingPoint[] = [];
let renderScheduled = false;

function renderStrokeToGraphics(
  g: Graphics,
  points: DrawingPoint[],
  width: number,
  color: string,
  isEraser: boolean,
) {
  g.clear();
  if (!points || points.length === 0) return;

  if (isEraser) {
    g.blendMode = "erase";
  } else {
    g.blendMode = "normal";
  }

  const effectiveWidth = Math.max(1, width);
  const effectiveColor = isEraser ? 0xffffff : color;

  if (points.length === 1) {
    const p = points[0]!;
    g.circle(p.x, p.y, effectiveWidth / 2);
    g.fill({ color: effectiveColor });
  } else {
    const p0 = points[0]!;
    g.moveTo(p0.x, p0.y);
    for (let i = 1; i < points.length; i++) {
      const pt = points[i]!;
      g.lineTo(pt.x, pt.y);
    }
    g.stroke({
      width: effectiveWidth,
      color: effectiveColor,
      cap: "round",
      join: "round",
    });
  }
}

function renderAllStrokes(container: Container, strokeList: DrawingStroke[]) {
  container.removeChildren();
  if (!PixiGraphics) return;

  for (const stroke of strokeList) {
    if (!stroke.points || stroke.points.length === 0) continue;

    const g = new PixiGraphics();
    const isEraser = stroke.tool === "eraser";
    const width = stroke.width || (isEraser ? 20 : 4);
    const color = stroke.color || "#111827";

    renderStrokeToGraphics(g, stroke.points, width, color, isEraser);
    container.addChild(g);
  }
}

function getLocalCoordinates(event: PointerEvent): DrawingPoint {
  if (!containerRef.value) return { x: event.offsetX, y: event.offsetY };
  const rect = containerRef.value.getBoundingClientRect();
  return {
    x: Math.round(event.clientX - rect.left),
    y: Math.round(event.clientY - rect.top),
  };
}

function onPointerEnter(event: PointerEvent) {
  isPointerInside.value = true;
  const local = getLocalCoordinates(event);
  cursorPos.value = local;
}

function onPointerLeave() {
  if (!isDrawing) {
    isPointerInside.value = false;
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return; // Primary pointer only

  const target = event.target as HTMLElement;
  if (target?.closest("button") || target?.closest(".drawing-toolbar")) return;

  containerRef.value?.setPointerCapture(event.pointerId);
  isDrawing = true;
  isPointerInside.value = true;

  // 1. Take snapshot of smoothing options for this stroke
  strokeOptions = { ...smoothingOptions.value };

  // 2. Reset One Euro filter instance
  oneEuroFilter = new OneEuroFilter(strokeOptions.minCutoff, strokeOptions.beta);

  const point = getLocalCoordinates(event);
  const time = event.timeStamp || performance.now();
  cursorPos.value = point;

  rawPointsWithTime = [{ ...point, time }];

  // 3. Filter initial point
  let initialPoint = point;
  if (strokeOptions.useOneEuroFilter) {
    initialPoint = oneEuroFilter.filter(point, time);
  }
  filteredPoints = [initialPoint];

  if (currentStrokeGraphics) {
    const isEraser = activeTool.value === "eraser";
    const width = isEraser ? eraserWidth.value : penWidth.value;
    const color = isEraser ? "#000000" : penColor.value;
    renderStrokeToGraphics(currentStrokeGraphics, filteredPoints, width, color, isEraser);
  }
}

function onPointerMove(event: PointerEvent) {
  const local = getLocalCoordinates(event);
  cursorPos.value = local;

  if (!isDrawing) return;

  // Pipeline stage 1: Coalesced events
  const events = (strokeOptions.useCoalescedEvents && typeof event.getCoalescedEvents === "function")
    ? event.getCoalescedEvents()
    : [event];

  for (const e of events) {
    const pt = getLocalCoordinates(e);
    const time = e.timeStamp || performance.now();

    // Pipeline stage 2: Resampling
    if (strokeOptions.useResampling) {
      const lastRaw = rawPointsWithTime[rawPointsWithTime.length - 1];
      if (lastRaw && getDistance(lastRaw, pt) < strokeOptions.minPointDistance) {
        continue; // Skip points too close to previous
      }
    }

    rawPointsWithTime.push({ ...pt, time });

    // Pipeline stage 3: One Euro filter
    let ptToAdd = pt;
    if (strokeOptions.useOneEuroFilter && oneEuroFilter) {
      ptToAdd = oneEuroFilter.filter(pt, time);
    }

    filteredPoints.push(ptToAdd);
  }

  // High-frequency render: update Pixi graphics on requestAnimationFrame
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      if (!isDrawing || !currentStrokeGraphics) return;

      // Make a copy for live display
      let displayPoints = [...filteredPoints];

      // Pipeline stage 4: Point prediction (live display only)
      if (strokeOptions.usePrediction && rawPointsWithTime.length >= 2) {
        const n = rawPointsWithTime.length;
        const pPrev = rawPointsWithTime[n - 2]!;
        const pCurr = rawPointsWithTime[n - 1]!;
        const dtMs = Math.max(1, pCurr.time - pPrev.time);
        const predicted = predictPoint(pPrev, pCurr, dtMs, strokeOptions.predictionMs);
        displayPoints.push(predicted);
      }

      // Pipeline stage 5: Curve interpolation
      const renderPath = buildStrokePath(displayPoints, strokeOptions.useCurveInterpolation, smoothing.value);

      const isEraser = activeTool.value === "eraser";
      const width = isEraser ? eraserWidth.value : penWidth.value;
      const color = isEraser ? "#000000" : penColor.value;
      renderStrokeToGraphics(currentStrokeGraphics, renderPath, width, color, isEraser);
    });
  }
}

function onPointerUp(event: PointerEvent) {
  if (!isDrawing) return;
  isDrawing = false;

  try {
    containerRef.value?.releasePointerCapture(event.pointerId);
  } catch {
    // Ignore if not captured
  }

  const finalPoint = getLocalCoordinates(event);
  const finalTime = event.timeStamp || performance.now();
  rawPointsWithTime.push({ ...finalPoint, time: finalTime });

  let finalPtToAdd = finalPoint;
  if (strokeOptions.useOneEuroFilter && oneEuroFilter) {
    finalPtToAdd = oneEuroFilter.filter(finalPoint, finalTime);
  }
  filteredPoints.push(finalPtToAdd);

  // Note: Prediction is strictly excluded from committed points!
  let committedPoints = [...filteredPoints];

  // Pipeline stage 6: Final smoothing
  if (strokeOptions.useFinalSmoothing) {
    committedPoints = smoothPoints(committedPoints, smoothing.value);
  }

  // Final curve interpolation
  if (strokeOptions.useCurveInterpolation) {
    committedPoints = buildStrokePath(committedPoints, true, smoothing.value);
  }

  const isEraser = activeTool.value === "eraser";
  const newStroke: DrawingStroke = {
    tool: activeTool.value,
    points: committedPoints,
    width: isEraser ? eraserWidth.value : penWidth.value,
    color: isEraser ? undefined : penColor.value,
  };

  // Commit stroke to persistent strokes
  strokes.value.push(newStroke);

  // Redraw persistent graphics container
  if (strokesContainer) {
    renderAllStrokes(strokesContainer, strokes.value);
  }

  // Clear temporary active stroke graphics
  if (currentStrokeGraphics) {
    currentStrokeGraphics.clear();
  }

  rawPointsWithTime = [];
  filteredPoints = [];
  oneEuroFilter = null;

  // Emit single immutable update:block
  const updatedData = JSON.stringify({ strokes: strokes.value });
  emit("update:block", props.block.withData(updatedData));
}

function onPointerCancel(event: PointerEvent) {
  if (!isDrawing) return;
  isDrawing = false;
  try {
    containerRef.value?.releasePointerCapture(event.pointerId);
  } catch {}
  if (currentStrokeGraphics) {
    currentStrokeGraphics.clear();
  }
  rawPointsWithTime = [];
  filteredPoints = [];
  oneEuroFilter = null;
}

function undoLastStroke() {
  if (strokes.value.length === 0) return;
  strokes.value.pop();
  if (strokesContainer) {
    renderAllStrokes(strokesContainer, strokes.value);
  }
  const updatedData = JSON.stringify({ strokes: strokes.value });
  emit("update:block", props.block.withData(updatedData));
}

function clearDrawing() {
  strokes.value = [];
  if (strokesContainer) {
    strokesContainer.removeChildren();
  }
  if (currentStrokeGraphics) {
    currentStrokeGraphics.clear();
  }
  const updatedData = JSON.stringify({ strokes: [] });
  emit("update:block", props.block.withData(updatedData));
}

// Watch for external data changes (undo/redo, document loading, turn-into)
watch(
  () => props.block.data,
  (newData) => {
    if (isDrawing) return;
    const normalized = normalizeDrawingData(newData);
    strokes.value = normalized.strokes;
    if (strokesContainer) {
      renderAllStrokes(strokesContainer, normalized.strokes);
    }
  },
);

onMounted(async () => {
  if (!containerRef.value) return;

  const appCtor = await loadPixi();
  if (!appCtor || !PixiContainer || !PixiGraphics) return;

  const container = containerRef.value;
  const initialWidth = container.clientWidth || 800;
  const initialHeight = container.clientHeight || 420;

  const normalized = normalizeDrawingData(props.block.data);
  strokes.value = normalized.strokes;

  const app = new appCtor();
  await app.init({
    width: initialWidth,
    height: initialHeight,
    backgroundAlpha: 0, // Transparent canvas so eraser punches through transparently
    antialias: true,
    autoDensity: true,
    resolution: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
  });

  pixiApp = app;

  strokesContainer = new PixiContainer();
  currentStrokeGraphics = new PixiGraphics();

  app.stage.addChild(strokesContainer);
  app.stage.addChild(currentStrokeGraphics);

  renderAllStrokes(strokesContainer, strokes.value);

  // Append PixiJS canvas to DOM container
  container.appendChild(app.canvas);

  // ResizeObserver for dynamic container dimensions
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0 && pixiApp) {
        pixiApp.renderer.resize(Math.round(width), Math.round(height));
        if (strokesContainer) {
          renderAllStrokes(strokesContainer, strokes.value);
        }
      }
    }
  });

  resizeObserver.observe(container);
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  if (pixiApp) {
    pixiApp.destroy(true);
    pixiApp = null;
    strokesContainer = null;
    currentStrokeGraphics = null;
  }
});
</script>
