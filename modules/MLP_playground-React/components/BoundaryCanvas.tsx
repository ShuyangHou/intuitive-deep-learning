import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { ClassificationScenario } from '../model/scenarioTypes';
import {
  boundarySide,
  type BoundaryChallengeState,
  type BoundaryVector,
} from '../model/boundaryEngine';

export interface BoundaryCanvasProps {
  state: BoundaryChallengeState;
  scenario: ClassificationScenario;
  disabled?: boolean;
  className?: string;
  noiseRevealStartedAt?: number | null;
  onDrawEnd: (path: BoundaryVector[]) => void;
}

interface CanvasSize {
  width: number;
  height: number;
  ratio: number;
}

const EMPTY_SIZE: CanvasSize = { width: 1, height: 1, ratio: 1 };

function strokePath(
  context: CanvasRenderingContext2D,
  path: BoundaryVector[],
  width: number,
  height: number,
) {
  context.beginPath();
  path.forEach((point, index) => {
    const x = point.x * width;
    const y = point.y * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function drawPredictionRegions(
  context: CanvasRenderingContext2D,
  state: BoundaryChallengeState,
  width: number,
  height: number,
) {
  const cell = 16;
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      let side = boundarySide(
        {
          x: (x + cell / 2) / width,
          y: (y + cell / 2) / height,
        },
        state.path,
      );
      if (state.flip) side = side === 1 ? 0 : 1;
      context.fillStyle =
        side === 1 ? 'rgba(196,63,82,0.09)' : 'rgba(39,68,110,0.09)';
      context.fillRect(x, y, cell + 1, cell + 1);
    }
  }
}

function drawAxisLabels(
  context: CanvasRenderingContext2D,
  scenario: ClassificationScenario,
  width: number,
  height: number,
) {
  context.save();
  context.fillStyle = 'rgba(39,68,110,0.72)';
  context.font =
    '800 12px "Segoe UI", "PingFang SC", system-ui, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'bottom';
  context.fillText(`横轴：${scenario.xAxis} ↑`, width - 14, height - 10);
  context.translate(14, 18);
  context.rotate(-Math.PI / 2);
  context.textAlign = 'right';
  context.fillText(`纵轴：${scenario.yAxis} ↑`, 0, 0);
  context.restore();
}

function drawLegend(
  context: CanvasRenderingContext2D,
  scenario: ClassificationScenario,
  width: number,
) {
  const maxText = Math.max(
    scenario.negativeLabel.length,
    scenario.positiveLabel.length,
  );
  const boxWidth = Math.min(width - 28, Math.max(210, maxText * 14 + 58));
  const x = 14;
  const y = 12;
  context.save();
  context.fillStyle = 'rgba(255,255,255,0.88)';
  context.strokeStyle = 'rgba(159,176,200,0.55)';
  context.lineWidth = 1;
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, boxWidth, 62, 8);
  } else {
    context.rect(x, y, boxWidth, 62);
  }
  context.fill();
  context.stroke();
  context.font =
    '800 12px "Segoe UI", "PingFang SC", system-ui, sans-serif';
  context.textBaseline = 'middle';
  context.fillStyle = '#27446e';
  context.beginPath();
  context.arc(x + 18, y + 21, 5, 0, Math.PI * 2);
  context.fill();
  context.fillText(scenario.negativeLabel, x + 30, y + 21);
  context.fillStyle = '#c43f52';
  context.beginPath();
  context.arc(x + 18, y + 43, 5, 0, Math.PI * 2);
  context.fill();
  context.fillText(scenario.positiveLabel, x + 30, y + 43);
  context.restore();
}

function drawCanvas(
  canvas: HTMLCanvasElement,
  size: CanvasSize,
  state: BoundaryChallengeState,
  scenario: ClassificationScenario,
  noiseRevealElapsed: number | null,
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height, ratio } = size;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fbfdff';
  context.fillRect(0, 0, width, height);

  if (state.scored && state.path.length > 1) {
    drawPredictionRegions(context, state, width, height);
  }

  context.strokeStyle = '#e2e8f0';
  context.lineWidth = 1;
  for (let x = 40; x < width; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 40; y < height; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  drawAxisLabels(context, scenario, width, height);

  if (state.path.length > 1) {
    context.strokeStyle = 'rgba(255,255,255,0.95)';
    context.lineWidth = 9;
    strokePath(context, state.path, width, height);
    context.strokeStyle = state.passed ? '#228d5c' : '#f07e47';
    context.lineWidth = 5;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    strokePath(context, state.path, width, height);
  }

  state.points.forEach((point) => {
    context.save();
    context.globalAlpha =
      point.noise && noiseRevealElapsed !== null
        ? Math.max(
            0,
            Math.min(
              1,
              (noiseRevealElapsed - point.revealDelay) / 520,
            ),
          )
        : point.alpha;
    context.beginPath();
    context.arc(
      point.x * width,
      point.y * height,
      point.wrong ? 8.5 : 6.5,
      0,
      Math.PI * 2,
    );
    context.fillStyle = point.label === 1 ? '#c43f52' : '#27446e';
    context.fill();
    context.lineWidth = point.wrong ? 3.5 : 2;
    context.strokeStyle = point.wrong
      ? '#f07e47'
      : point.noise
        ? 'rgba(255,255,255,0.72)'
        : '#fff';
    context.stroke();
    context.restore();
  });
  drawLegend(context, scenario, width);
}

export function BoundaryCanvas({
  state,
  scenario,
  disabled = false,
  className,
  noiseRevealStartedAt = null,
  onDrawEnd,
}: BoundaryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const pathRef = useRef<BoundaryVector[]>([]);
  const [draftPath, setDraftPath] = useState<BoundaryVector[]>([]);
  const [size, setSize] = useState<CanvasSize>(EMPTY_SIZE);
  const [noiseRevealFrame, setNoiseRevealFrame] = useState<{
    startedAt: number;
    elapsed: number;
  } | null>(null);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    setSize((current) =>
      current.width === width &&
      current.height === height &&
      current.ratio === ratio
        ? current
        : { width, height, ratio },
    );
  }, []);

  useEffect(() => {
    if (noiseRevealStartedAt === null) {
      setNoiseRevealFrame(null);
      return;
    }
    setNoiseRevealFrame({
      startedAt: noiseRevealStartedAt,
      elapsed: 0,
    });
    let frame = 0;
    const finalDelay = state.points.reduce(
      (maximum, point) =>
        point.noise
          ? Math.max(maximum, point.revealDelay + 520)
          : maximum,
      0,
    );
    const animate = (now: number) => {
      const elapsed = Math.max(0, now - noiseRevealStartedAt);
      setNoiseRevealFrame({
        startedAt: noiseRevealStartedAt,
        elapsed,
      });
      if (elapsed < finalDelay) {
        frame = window.requestAnimationFrame(animate);
      }
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [noiseRevealStartedAt, state.points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resize();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drawing = draftPath.length > 0;
    const renderState: BoundaryChallengeState = drawing
      ? {
          ...state,
          path: draftPath,
          scored: false,
          passed: false,
          points: state.points.map((point) =>
            point.wrong ? { ...point, wrong: false } : point,
          ),
        }
      : state;
    drawCanvas(
      canvas,
      size,
      renderState,
      scenario,
      noiseRevealStartedAt === null
        ? null
        : noiseRevealFrame?.startedAt === noiseRevealStartedAt
          ? noiseRevealFrame.elapsed
          : 0,
    );
  }, [
    draftPath,
    noiseRevealFrame,
    noiseRevealStartedAt,
    scenario,
    size,
    state,
  ]);

  const eventPoint = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): BoundaryVector => {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      };
    },
    [],
  );

  const finishDrawing = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || pointerIdRef.current !== event.pointerId) return;
      drawingRef.current = false;
      pointerIdRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const finishedPath = pathRef.current;
      pathRef.current = [];
      setDraftPath([]);
      onDrawEnd(finishedPath);
    },
    [onDrawEnd],
  );

  return (
    <div className={`mlp-boundary-canvas-wrap${className ? ` ${className}` : ''}`}>
      <canvas
        ref={canvasRef}
        className="mlp-boundary-canvas"
        aria-label="手绘分类边界画布"
        aria-disabled={disabled || undefined}
        onPointerDown={(event) => {
          if (disabled) return;
          drawingRef.current = true;
          pointerIdRef.current = event.pointerId;
          const firstPoint = eventPoint(event);
          pathRef.current = [firstPoint];
          setDraftPath([firstPoint]);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (
            disabled ||
            !drawingRef.current ||
            pointerIdRef.current !== event.pointerId
          ) {
            return;
          }
          const nextPoint = eventPoint(event);
          const lastPoint = pathRef.current[pathRef.current.length - 1];
          const pixelDistance = Math.hypot(
            (nextPoint.x - lastPoint.x) * size.width,
            (nextPoint.y - lastPoint.y) * size.height,
          );
          if (pixelDistance <= 3) return;
          pathRef.current = [...pathRef.current, nextPoint];
          setDraftPath(pathRef.current);
        }}
        onPointerUp={finishDrawing}
        onPointerCancel={(event) => {
          if (pointerIdRef.current !== event.pointerId) return;
          drawingRef.current = false;
          pointerIdRef.current = null;
          pathRef.current = [];
          setDraftPath([]);
        }}
      />
      <div
        className={`mlp-boundary-canvas-prompt${
          draftPath.length > 0 || state.path.length > 0 ? ' is-hidden' : ''
        }`}
      >
        横向或纵向拖动，画出分类边界
      </div>
    </div>
  );
}
