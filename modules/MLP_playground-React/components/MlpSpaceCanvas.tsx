import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { clamp, predict } from '../model/mlpEngine';
import type {
  MlpLabState,
  MlpSample,
  MlpViewState,
} from '../model/mlpTypes';
import {
  useResponsiveCanvas,
  type ResponsiveCanvasSize,
} from './useResponsiveCanvas';

export interface MlpSpaceCanvasProps {
  state: MlpLabState;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  onDraftView: (view: MlpViewState) => void;
  onCommitView: (view: MlpViewState) => void;
  onSelectSample: (sampleIndex: number) => void;
}

interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

interface ProjectedSample extends ProjectedPoint {
  index: number;
}

interface PointerSession {
  pointerId: number;
  startX: number;
  startY: number;
  startView: MlpViewState;
  moved: boolean;
}

type Point3D = readonly [number, number, number];

const FONT_SANS =
  '"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
const FONT_MONO =
  '"SFMono-Regular", Consolas, "Liberation Mono", monospace';
const SPACE_MIN = -1.2;
const SPACE_MAX = 1.2;
const TWO_DIMENSIONAL_GRID = 46;
const VIEW_MOVE_THRESHOLD = 2;
const WHEEL_COMMIT_DELAY = 140;

function copyView(view: MlpViewState): MlpViewState {
  return {
    zoom: view.zoom,
    panX: view.panX,
    panY: view.panY,
    rotX: view.rotX,
    rotY: view.rotY,
  };
}

function sameView(left: MlpViewState, right: MlpViewState): boolean {
  return (
    left.zoom === right.zoom &&
    left.panX === right.panX &&
    left.panY === right.panY &&
    left.rotX === right.rotX &&
    left.rotY === right.rotY
  );
}

function project2D(
  size: ResponsiveCanvasSize,
  view: MlpViewState,
  x: number,
  y: number,
): ProjectedPoint {
  const scale = Math.min(size.width, size.height) * 0.36 * view.zoom;
  return {
    x: size.width / 2 + view.panX + x * scale,
    y: size.height / 2 + view.panY - y * scale,
    depth: 0,
  };
}

function project3D(
  size: ResponsiveCanvasSize,
  view: MlpViewState,
  point: readonly number[],
): ProjectedPoint {
  const scale = Math.min(size.width, size.height) * 0.36 * view.zoom;
  const cosY = Math.cos(view.rotY);
  const sinY = Math.sin(view.rotY);
  const cosX = Math.cos(view.rotX);
  const sinX = Math.sin(view.rotX);
  const x1 = cosY * point[0] + sinY * point[2];
  const z1 = -sinY * point[0] + cosY * point[2];
  const y1 = cosX * point[1] - sinX * z1;
  return {
    x: size.width / 2 + view.panX + x1 * scale,
    y: size.height / 2 + view.panY - y1 * scale,
    depth: sinX * point[1] + cosX * z1,
  };
}

function projectSample(
  state: MlpLabState,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
  sample: MlpSample,
): ProjectedPoint {
  return state.dimension === 3
    ? project3D(size, view, sample.x)
    : project2D(
        size,
        view,
        sample.x[0],
        state.dimension === 1 ? 0 : sample.x[1],
      );
}

function prepareContext(
  canvas: HTMLCanvasElement,
  size: ResponsiveCanvasSize,
): CanvasRenderingContext2D | null {
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
  context.clearRect(0, 0, size.width, size.height);
  context.fillStyle = '#fbfdff';
  context.fillRect(0, 0, size.width, size.height);
  return context;
}

function drawOneDimensionalTicks(
  context: CanvasRenderingContext2D,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
  axisY: number,
) {
  for (let value = -1; value <= 1.001; value += 0.25) {
    const point = project2D(size, view, value, 0);
    const major =
      Math.abs(value * 2 - Math.round(value * 2)) < 0.01;
    context.strokeStyle = major ? '#68778f' : '#9fb0c8';
    context.lineWidth = major ? 1.6 : 1;
    context.beginPath();
    context.moveTo(point.x, axisY - (major ? 8 : 5));
    context.lineTo(point.x, axisY + (major ? 8 : 5));
    context.stroke();
    if (major) {
      context.fillStyle = '#68778f';
      context.font = `800 10px ${FONT_MONO}`;
      context.textAlign = 'center';
      context.textBaseline = 'alphabetic';
      context.fillText(
        value.toFixed(Math.abs(value) < 0.01 ? 0 : 1),
        point.x,
        axisY + 24,
      );
    }
  }

  const end = project2D(size, view, 1.15, 0);
  context.fillStyle = '#27446e';
  context.font = `900 13px ${FONT_SANS}`;
  context.textAlign = 'left';
  context.fillText('x', end.x + 7, axisY + 4);
}

function drawPoints(
  context: CanvasRenderingContext2D,
  state: MlpLabState,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
): ProjectedSample[] {
  const points = state.data.map((sample, index) => {
    const projected = projectSample(state, size, view, sample);
    if (state.dimension === 1) {
      projected.y += (index % 5 - 2) * 8;
    }
    return { ...projected, index };
  });
  const drawingOrder =
    state.dimension === 3
      ? [...points].sort((left, right) => left.depth - right.depth)
      : points;

  drawingOrder.forEach((point) => {
    const sample = state.data[point.index];
    const prediction = predict(state, sample.x) >= 0.5 ? 1 : 0;
    const wrong = state.epoch > 0 && prediction !== sample.y;
    context.beginPath();
    context.arc(point.x, point.y, wrong ? 8.5 : 7, 0, Math.PI * 2);
    context.fillStyle = sample.y === 1 ? '#c43f52' : '#27446e';
    context.fill();
    context.lineWidth = wrong ? 3.5 : 2;
    context.strokeStyle = wrong ? '#f07e47' : '#fff';
    context.stroke();

    if (point.index === state.selectedSampleIndex) {
      context.beginPath();
      context.arc(point.x, point.y, 13, 0, Math.PI * 2);
      context.lineWidth = 3;
      context.strokeStyle = '#21324a';
      context.stroke();
    }
  });

  return points;
}

function drawOneDimensionalSpace(
  context: CanvasRenderingContext2D,
  state: MlpLabState,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
): ProjectedSample[] {
  const axisStart = project2D(size, view, SPACE_MIN, 0);
  const axisEnd = project2D(size, view, SPACE_MAX, 0);
  const axisY = size.height / 2 + view.panY;

  context.lineWidth = 3;
  context.strokeStyle = '#9fb0c8';
  context.beginPath();
  context.moveTo(axisStart.x, axisY);
  context.lineTo(axisEnd.x, axisY);
  context.stroke();
  drawOneDimensionalTicks(context, size, view, axisY);

  const boundaries: number[] = [];
  let previousX = SPACE_MIN;
  let previousProbability = predict(state, [previousX]);
  for (let index = 1; index <= 240; index += 1) {
    const value = SPACE_MIN + index * 0.01;
    const probability = predict(state, [value]);
    const start = project2D(size, view, previousX, 0);
    const end = project2D(size, view, value, 0);
    context.strokeStyle =
      probability >= 0.5
        ? 'rgba(196,63,82,0.18)'
        : 'rgba(39,68,110,0.16)';
    context.lineWidth = 12;
    context.beginPath();
    context.moveTo(start.x, axisY - 48);
    context.lineTo(end.x, axisY - 48);
    context.stroke();

    if ((previousProbability - 0.5) * (probability - 0.5) < 0) {
      const ratio =
        (0.5 - previousProbability) /
        (probability - previousProbability);
      boundaries.push(previousX + (value - previousX) * ratio);
    }
    previousX = value;
    previousProbability = probability;
  }

  boundaries.forEach((boundary) => {
    const boundaryX = project2D(size, view, boundary, 0).x;
    context.strokeStyle = 'rgba(255,255,255,0.92)';
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(boundaryX, axisY - 105);
    context.lineTo(boundaryX, axisY + 105);
    context.stroke();
    context.strokeStyle = '#f07e47';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(boundaryX, axisY - 105);
    context.lineTo(boundaryX, axisY + 105);
    context.stroke();
  });

  return drawPoints(context, state, size, view);
}

function drawTwoDimensionalAxes(
  context: CanvasRenderingContext2D,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
) {
  const xStart = project2D(size, view, SPACE_MIN, 0);
  const xEnd = project2D(size, view, SPACE_MAX, 0);
  const yStart = project2D(size, view, 0, SPACE_MIN);
  const yEnd = project2D(size, view, 0, SPACE_MAX);

  context.strokeStyle = '#68778f';
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(xStart.x, xStart.y);
  context.lineTo(xEnd.x, xEnd.y);
  context.moveTo(yStart.x, yStart.y);
  context.lineTo(yEnd.x, yEnd.y);
  context.stroke();

  for (let value = -1; value <= 1.001; value += 0.25) {
    const major =
      Math.abs(value * 2 - Math.round(value * 2)) < 0.01;
    const tickSize = major ? 6 : 4;
    const xTick = project2D(size, view, value, 0);
    const yTick = project2D(size, view, 0, value);
    context.strokeStyle = major ? '#68778f' : '#9fb0c8';
    context.lineWidth = major ? 1.6 : 1;
    context.beginPath();
    context.moveTo(xTick.x, xTick.y - tickSize);
    context.lineTo(xTick.x, xTick.y + tickSize);
    context.moveTo(yTick.x - tickSize, yTick.y);
    context.lineTo(yTick.x + tickSize, yTick.y);
    context.stroke();
    if (major && Math.abs(value) > 0.01) {
      context.fillStyle = '#68778f';
      context.font = `800 9px ${FONT_MONO}`;
      context.textBaseline = 'alphabetic';
      context.textAlign = 'center';
      context.fillText(value.toFixed(1), xTick.x, xTick.y + 18);
      context.textAlign = 'right';
      context.fillText(value.toFixed(1), yTick.x - 9, yTick.y + 3);
    }
  }

  context.fillStyle = '#27446e';
  context.font = `900 13px ${FONT_SANS}`;
  context.textAlign = 'left';
  context.fillText('x', xEnd.x + 7, xEnd.y + 4);
  context.fillText('y', yEnd.x + 7, yEnd.y - 5);
}

function drawTwoDimensionalBoundary(
  context: CanvasRenderingContext2D,
  state: MlpLabState,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
  values: number[][],
) {
  const step = (SPACE_MAX - SPACE_MIN) / TWO_DIMENSIONAL_GRID;
  const segments: [ProjectedPoint, ProjectedPoint][] = [];

  const crossing = (
    ax: number,
    ay: number,
    av: number,
    bx: number,
    by: number,
    bv: number,
  ): ProjectedPoint | null => {
    if ((av - 0.5) * (bv - 0.5) >= 0) return null;
    const ratio = (0.5 - av) / (bv - av);
    return project2D(
      size,
      view,
      ax + (bx - ax) * ratio,
      ay + (by - ay) * ratio,
    );
  };

  for (let row = 0; row < TWO_DIMENSIONAL_GRID; row += 1) {
    for (let column = 0; column < TWO_DIMENSIONAL_GRID; column += 1) {
      const x = SPACE_MIN + column * step;
      const y = SPACE_MIN + row * step;
      const hits = [
        crossing(
          x,
          y,
          values[row][column],
          x + step,
          y,
          values[row][column + 1],
        ),
        crossing(
          x + step,
          y,
          values[row][column + 1],
          x + step,
          y + step,
          values[row + 1][column + 1],
        ),
        crossing(
          x + step,
          y + step,
          values[row + 1][column + 1],
          x,
          y + step,
          values[row + 1][column],
        ),
        crossing(
          x,
          y + step,
          values[row + 1][column],
          x,
          y,
          values[row][column],
        ),
      ].filter((hit): hit is ProjectedPoint => hit !== null);
      if (hits.length === 2) segments.push([hits[0], hits[1]]);
      if (hits.length === 4) {
        segments.push([hits[0], hits[1]], [hits[2], hits[3]]);
      }
    }
  }

  const strokeSegments = (color: string, lineWidth: number) => {
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    segments.forEach(([start, end]) => {
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    });
    context.stroke();
  };

  strokeSegments('rgba(255,255,255,0.9)', 7);
  strokeSegments('#f07e47', 3.5);
}

function drawTwoDimensionalSpace(
  context: CanvasRenderingContext2D,
  state: MlpLabState,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
): ProjectedSample[] {
  const step = (SPACE_MAX - SPACE_MIN) / TWO_DIMENSIONAL_GRID;
  const values = Array.from(
    { length: TWO_DIMENSIONAL_GRID + 1 },
    (_, row) =>
      Array.from(
        { length: TWO_DIMENSIONAL_GRID + 1 },
        (_, column) =>
          predict(state, [
            SPACE_MIN + column * step,
            SPACE_MIN + row * step,
          ]),
      ),
  );

  for (let row = 0; row < TWO_DIMENSIONAL_GRID; row += 1) {
    for (let column = 0; column < TWO_DIMENSIONAL_GRID; column += 1) {
      const x = SPACE_MIN + column * step;
      const y = SPACE_MIN + row * step;
      const start = project2D(size, view, x, y);
      const end = project2D(size, view, x + step, y + step);
      context.fillStyle =
        values[row][column] >= 0.5
          ? 'rgba(196,63,82,0.09)'
          : 'rgba(39,68,110,0.08)';
      context.fillRect(
        start.x,
        end.y,
        end.x - start.x + 1,
        start.y - end.y + 1,
      );
    }
  }

  context.strokeStyle = '#dfe6f1';
  context.lineWidth = 1;
  for (let index = -10; index <= 10; index += 1) {
    const vertical = project2D(size, view, index / 10, 0).x;
    const horizontal = project2D(size, view, 0, index / 10).y;
    context.beginPath();
    context.moveTo(vertical, 0);
    context.lineTo(vertical, size.height);
    context.moveTo(0, horizontal);
    context.lineTo(size.width, horizontal);
    context.stroke();
  }

  drawTwoDimensionalAxes(context, size, view);
  drawTwoDimensionalBoundary(context, state, size, view, values);
  return drawPoints(context, state, size, view);
}

function buildDecisionSurface(state: MlpLabState): Point3D[] {
  if (state.dimension !== 3) return [];
  const points: Point3D[] = [];
  const cells = 18;

  for (let xIndex = 0; xIndex <= cells; xIndex += 1) {
    const x = -1 + (xIndex / cells) * 2;
    for (let yIndex = 0; yIndex <= cells; yIndex += 1) {
      const y = -1 + (yIndex / cells) * 2;
      let previousZ = -1;
      let previous = predict(state, [x, y, previousZ]) - 0.5;
      for (let zIndex = 1; zIndex <= cells; zIndex += 1) {
        const z = -1 + (zIndex / cells) * 2;
        const current = predict(state, [x, y, z]) - 0.5;
        if (previous === 0 || current === 0 || previous * current < 0) {
          const denominator = current - previous;
          const ratio =
            Math.abs(denominator) < Number.EPSILON
              ? 1
              : clamp(-previous / denominator, 0, 1);
          points.push([x, y, previousZ + (z - previousZ) * ratio]);
          break;
        }
        previous = current;
        previousZ = z;
      }
    }
  }
  return points;
}

function drawThreeDimensionalAxis(
  context: CanvasRenderingContext2D,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
  start: Point3D,
  end: Point3D,
  label: 'x' | 'y' | 'z',
) {
  const projectedStart = project3D(size, view, start);
  const projectedEnd = project3D(size, view, end);
  const length = Math.max(
    1,
    Math.hypot(
      projectedEnd.x - projectedStart.x,
      projectedEnd.y - projectedStart.y,
    ),
  );
  const normalX = -(projectedEnd.y - projectedStart.y) / length;
  const normalY = (projectedEnd.x - projectedStart.x) / length;
  const axisIndex = label === 'x' ? 0 : label === 'y' ? 1 : 2;

  context.strokeStyle = '#68778f';
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(projectedStart.x, projectedStart.y);
  context.lineTo(projectedEnd.x, projectedEnd.y);
  context.stroke();

  for (let value = -1; value <= 1.001; value += 0.25) {
    const coordinates: [number, number, number] = [-1, -1, -1];
    coordinates[axisIndex] = value;
    const point = project3D(size, view, coordinates);
    const major =
      Math.abs(value * 2 - Math.round(value * 2)) < 0.01;
    const tickSize = major ? 6 : 3.5;
    context.strokeStyle = major ? '#68778f' : '#9fb0c8';
    context.lineWidth = major ? 1.5 : 1;
    context.beginPath();
    context.moveTo(
      point.x - normalX * tickSize,
      point.y - normalY * tickSize,
    );
    context.lineTo(
      point.x + normalX * tickSize,
      point.y + normalY * tickSize,
    );
    context.stroke();
    if (major) {
      context.fillStyle = '#68778f';
      context.font = `800 8px ${FONT_MONO}`;
      context.textAlign = 'center';
      context.textBaseline = 'alphabetic';
      context.fillText(
        value.toFixed(Math.abs(value) < 0.01 ? 0 : 1),
        point.x + normalX * 13,
        point.y + normalY * 13 + 3,
      );
    }
  }

  context.fillStyle = '#27446e';
  context.font = `900 13px ${FONT_SANS}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(
    label,
    projectedEnd.x + normalX * 13,
    projectedEnd.y + normalY * 13,
  );
}

function drawThreeDimensionalSpace(
  context: CanvasRenderingContext2D,
  state: MlpLabState,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
  surface: readonly Point3D[],
): ProjectedSample[] {
  drawThreeDimensionalAxis(
    context,
    size,
    view,
    [-1, -1, -1],
    [1.1, -1, -1],
    'x',
  );
  drawThreeDimensionalAxis(
    context,
    size,
    view,
    [-1, -1, -1],
    [-1, 1.1, -1],
    'y',
  );
  drawThreeDimensionalAxis(
    context,
    size,
    view,
    [-1, -1, -1],
    [-1, -1, 1.1],
    'z',
  );

  context.fillStyle = 'rgba(240,126,71,0.5)';
  surface
    .map((point) => project3D(size, view, point))
    .sort((left, right) => left.depth - right.depth)
    .forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
      context.fill();
    });

  return drawPoints(context, state, size, view);
}

function drawSpace(
  canvas: HTMLCanvasElement,
  state: MlpLabState,
  size: ResponsiveCanvasSize,
  view: MlpViewState,
  surface: readonly Point3D[],
): ProjectedSample[] {
  const context = prepareContext(canvas, size);
  if (!context) return [];
  if (state.dimension === 1) {
    return drawOneDimensionalSpace(context, state, size, view);
  }
  if (state.dimension === 2) {
    return drawTwoDimensionalSpace(context, state, size, view);
  }
  return drawThreeDimensionalSpace(
    context,
    state,
    size,
    view,
    surface,
  );
}

function logicalPointerPosition(
  event: ReactPointerEvent<HTMLCanvasElement>,
  size: ResponsiveCanvasSize,
): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x:
      ((event.clientX - rect.left) / Math.max(1, rect.width)) *
      size.width,
    y:
      ((event.clientY - rect.top) / Math.max(1, rect.height)) *
      size.height,
  };
}

export function MlpSpaceCanvas({
  state,
  className,
  ariaLabel,
  disabled = false,
  onDraftView,
  onCommitView,
  onSelectSample,
}: MlpSpaceCanvasProps) {
  const { canvasRef, size } = useResponsiveCanvas();
  const [renderView, setRenderView] = useState<MlpViewState>(() =>
    copyView(state.view),
  );
  const viewRef = useRef(renderView);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const sampleScreensRef = useRef<ProjectedSample[]>([]);
  const wheelCommitTimerRef = useRef<number | null>(null);
  const surface = useMemo(
    () => buildDecisionSurface(state),
    [
      state.B,
      state.W,
      state.dimension,
      state.useActivation,
      state.useBias,
    ],
  );

  useEffect(() => {
    if (pointerSessionRef.current) return;
    const next = copyView(state.view);
    viewRef.current = next;
    setRenderView((current) => (sameView(current, next) ? current : next));
  }, [
    state.view.panX,
    state.view.panY,
    state.view.rotX,
    state.view.rotY,
    state.view.zoom,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sampleScreensRef.current = drawSpace(
      canvas,
      state,
      size,
      renderView,
      surface,
    );
  }, [canvasRef, renderView, size, state, surface]);

  useEffect(
    () => () => {
      if (wheelCommitTimerRef.current !== null) {
        window.clearTimeout(wheelCommitTimerRef.current);
      }
    },
    [],
  );

  const publishDraft = useCallback(
    (next: MlpViewState) => {
      viewRef.current = next;
      setRenderView(next);
      onDraftView(copyView(next));
    },
    [onDraftView],
  );

  const flushWheelCommit = useCallback(() => {
    if (wheelCommitTimerRef.current === null) return;
    window.clearTimeout(wheelCommitTimerRef.current);
    wheelCommitTimerRef.current = null;
    onCommitView(copyView(viewRef.current));
  }, [onCommitView]);

  const finishPointer = useCallback(
    (
      event: ReactPointerEvent<HTMLCanvasElement>,
      allowSelection: boolean,
    ) => {
      const session = pointerSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      pointerSessionRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (session.moved) {
        onCommitView(copyView(viewRef.current));
        return;
      }
      if (!allowSelection) return;

      const pointer = logicalPointerPosition(event, size);
      let nearestIndex: number | null = null;
      let nearestDistance = 20;
      sampleScreensRef.current.forEach((sample) => {
        const distance = Math.hypot(
          sample.x - pointer.x,
          sample.y - pointer.y,
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = sample.index;
        }
      });
      if (nearestIndex !== null) onSelectSample(nearestIndex);
    },
    [onCommitView, onSelectSample, size],
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.09 : 0.92;
      const current = viewRef.current;
      const zoom = clamp(current.zoom * factor, 0.5, 3.5);
      if (zoom === current.zoom) return;

      publishDraft({ ...copyView(current), zoom });
      if (wheelCommitTimerRef.current !== null) {
        window.clearTimeout(wheelCommitTimerRef.current);
      }
      wheelCommitTimerRef.current = window.setTimeout(() => {
        wheelCommitTimerRef.current = null;
        onCommitView(copyView(viewRef.current));
      }, WHEEL_COMMIT_DELAY);
    },
    [disabled, onCommitView, publishDraft],
  );

  const canvasClassName = [
    'mlp-react-space-canvas',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <canvas
      ref={canvasRef}
      className={canvasClassName}
      data-telemetry-manual
      aria-label={
        ariaLabel ??
        `${state.dimension} 维 MLP 分类空间，可拖动视图、滚轮缩放并点击样本`
      }
      aria-disabled={disabled || undefined}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        flushWheelCommit();
        pointerSessionRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startView: copyView(viewRef.current),
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const session = pointerSessionRef.current;
        if (
          disabled ||
          !session ||
          session.pointerId !== event.pointerId
        ) {
          return;
        }
        const deltaX = event.clientX - session.startX;
        const deltaY = event.clientY - session.startY;
        if (
          !session.moved &&
          Math.abs(deltaX) + Math.abs(deltaY) <= VIEW_MOVE_THRESHOLD
        ) {
          return;
        }
        session.moved = true;
        const next =
          state.dimension === 3
            ? {
                ...copyView(session.startView),
                rotY: session.startView.rotY + deltaX * 0.01,
                rotX: clamp(
                  session.startView.rotX + deltaY * 0.01,
                  -1.45,
                  1.45,
                ),
              }
            : {
                ...copyView(session.startView),
                panX: session.startView.panX + deltaX,
                panY: session.startView.panY + deltaY,
              };
        publishDraft(next);
      }}
      onPointerUp={(event) => finishPointer(event, true)}
      onPointerCancel={(event) => finishPointer(event, false)}
      onLostPointerCapture={(event) => finishPointer(event, false)}
      onWheel={handleWheel}
    />
  );
}
