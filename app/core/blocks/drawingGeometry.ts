export interface DrawingPoint {
  x: number;
  y: number;
}

export interface TimedPoint extends DrawingPoint {
  time: number;
}

export interface DrawingSmoothingOptions {
  useCoalescedEvents: boolean;
  useResampling: boolean;
  useOneEuroFilter: boolean;
  useCurveInterpolation: boolean;
  useFinalSmoothing: boolean;
  usePrediction: boolean;

  minCutoff: number;
  beta: number;
  minPointDistance: number;
  predictionMs: number;
}

export const defaultSmoothingOptions: DrawingSmoothingOptions = {
  useCoalescedEvents: true,
  useResampling: true,
  useOneEuroFilter: true,
  useCurveInterpolation: true,
  useFinalSmoothing: true,
  usePrediction: false,

  minCutoff: 1.0,
  beta: 0.05,
  minPointDistance: 1.5,
  predictionMs: 10,
};

export const MIN_POINT_DISTANCE = 1.5;

/**
 * Calculates Euclidean distance between two points.
 */
export function getDistance(p1: DrawingPoint, p2: DrawingPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Resamples raw pointer points so consecutive points are separated by at least minDistance.
 * Always preserves the first and last points of the stroke.
 */
export function resamplePoints(
  points: DrawingPoint[],
  minDistance: number = MIN_POINT_DISTANCE,
): DrawingPoint[] {
  if (points.length <= 2) {
    return points.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }));
  }

  const result: DrawingPoint[] = [
    { x: Math.round(points[0]!.x * 10) / 10, y: Math.round(points[0]!.y * 10) / 10 },
  ];
  let lastAdded = points[0]!;

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i]!;
    if (getDistance(lastAdded, current) >= minDistance) {
      result.push({
        x: Math.round(current.x * 10) / 10,
        y: Math.round(current.y * 10) / 10,
      });
      lastAdded = current;
    }
  }

  const lastPoint = points[points.length - 1]!;
  if (getDistance(lastAdded, lastPoint) >= minDistance * 0.5) {
    result.push({
      x: Math.round(lastPoint.x * 10) / 10,
      y: Math.round(lastPoint.y * 10) / 10,
    });
  }

  return result;
}

/**
 * Stabilizes and curves a series of points using quadratic Bézier midpoint interpolation.
 * @param points Array of sampled stroke points
 * @param smoothing Value between 0 (raw points) and 1 (maximum smoothing)
 */
export function smoothPoints(
  points: DrawingPoint[],
  smoothing: number = 0.5,
): DrawingPoint[] {
  if (points.length <= 2 || smoothing <= 0.01) {
    return points.map(p => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));
  }

  const clampedSmoothing = Math.max(0, Math.min(1, smoothing));

  // 1. Calculate midpoints between adjacent vertices
  const midpoints: DrawingPoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    midpoints.push({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    });
  }

  const result: DrawingPoint[] = [];
  result.push({
    x: Math.round(points[0]!.x * 10) / 10,
    y: Math.round(points[0]!.y * 10) / 10,
  });

  // 2. Evaluate smooth quadratic curve segments
  for (let i = 0; i < points.length - 2; i++) {
    const m1 = i === 0 ? points[0]! : midpoints[i]!;
    const pControl = points[i + 1]!;
    const m2 = midpoints[i + 1]!;

    // Blend control point towards chord midpoint based on smoothing
    const chordMid = { x: (m1.x + m2.x) / 2, y: (m1.y + m2.y) / 2 };
    const cx = pControl.x * (1 - clampedSmoothing * 0.5) + chordMid.x * (clampedSmoothing * 0.5);
    const cy = pControl.y * (1 - clampedSmoothing * 0.5) + chordMid.y * (clampedSmoothing * 0.5);

    const dist = getDistance(m1, m2);
    const steps = Math.max(2, Math.min(5, Math.ceil((dist / 8) * (0.5 + clampedSmoothing * 0.5))));

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const oneMinusT = 1 - t;
      const x = oneMinusT * oneMinusT * m1.x + 2 * oneMinusT * t * cx + t * t * m2.x;
      const y = oneMinusT * oneMinusT * m1.y + 2 * oneMinusT * t * cy + t * t * m2.y;
      result.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
      });
    }
  }

  // Final endpoint
  const last = points[points.length - 1]!;
  result.push({
    x: Math.round(last.x * 10) / 10,
    y: Math.round(last.y * 10) / 10,
  });

  return result;
}

/**
 * Builds a stroke path optionally applying curve interpolation or returning straight line segments.
 */
export function buildStrokePath(
  points: DrawingPoint[],
  useCurve: boolean,
  smoothing: number = 0.5,
): DrawingPoint[] {
  if (!useCurve || points.length <= 2) {
    return points.map(p => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));
  }
  return smoothPoints(points, smoothing);
}

/**
 * Predicts the next point based on recent velocity and a time horizon.
 */
export function predictPoint(
  pPrev: DrawingPoint,
  pCurr: DrawingPoint,
  dtMs: number,
  predictionMs: number,
): DrawingPoint {
  if (dtMs <= 0 || predictionMs <= 0) return { ...pCurr };
  const vx = (pCurr.x - pPrev.x) / dtMs;
  const vy = (pCurr.y - pPrev.y) / dtMs;
  return {
    x: Math.round((pCurr.x + vx * predictionMs) * 10) / 10,
    y: Math.round((pCurr.y + vy * predictionMs) * 10) / 10,
  };
}

/**
 * Simple 1st-order Low-Pass Filter
 */
class LowPassFilter {
  private s: number | null = null;

  reset() {
    this.s = null;
  }

  filter(value: number, alpha: number): number {
    if (this.s === null) {
      this.s = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * this.s;
    return this.s;
  }

  last(): number {
    return this.s ?? 0;
  }
}

/**
 * 1€ Filter for adaptive jitter reduction and responsive speed tracking.
 * Casiez, Roussel, Vogel (CHI 2012)
 */
export class OneEuroFilter {
  private xFilter = new LowPassFilter();
  private yFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private dyFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(
    public minCutoff: number = 1.0,
    public beta: number = 0.05,
    public dCutoff: number = 1.0,
  ) {}

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.dxFilter.reset();
    this.dyFilter.reset();
    this.lastTime = null;
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  filter(point: DrawingPoint, timestamp: number): DrawingPoint {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      this.xFilter.filter(point.x, 1.0);
      this.yFilter.filter(point.y, 1.0);
      this.dxFilter.filter(0, 1.0);
      this.dyFilter.filter(0, 1.0);
      return {
        x: Math.round(point.x * 10) / 10,
        y: Math.round(point.y * 10) / 10,
      };
    }

    const dt = Math.max(1e-3, (timestamp - this.lastTime) / 1000.0);
    this.lastTime = timestamp;
    const rate = 1.0 / dt;

    // Filter derivative
    const prevX = this.xFilter.last();
    const prevY = this.yFilter.last();
    const dx = (point.x - prevX) * rate;
    const dy = (point.y - prevY) * rate;

    const dAlpha = this.alpha(rate, this.dCutoff);
    const edx = this.dxFilter.filter(dx, dAlpha);
    const edy = this.dyFilter.filter(dy, dAlpha);

    // Dynamic cutoff frequency
    const speed = Math.hypot(edx, edy);
    const cutoff = this.minCutoff + this.beta * speed;

    // Filter coordinates
    const alpha = this.alpha(rate, cutoff);
    const filteredX = this.xFilter.filter(point.x, alpha);
    const filteredY = this.yFilter.filter(point.y, alpha);

    return {
      x: Math.round(filteredX * 10) / 10,
      y: Math.round(filteredY * 10) / 10,
    };
  }
}
