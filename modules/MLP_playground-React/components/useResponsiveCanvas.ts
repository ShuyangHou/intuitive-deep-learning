import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

export interface ResponsiveCanvasSize {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface ResponsiveCanvasOptions {
  maxPixelRatio?: number;
}

export interface ResponsiveCanvasResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  size: ResponsiveCanvasSize;
}

const INITIAL_SIZE: ResponsiveCanvasSize = {
  width: 1,
  height: 1,
  pixelRatio: 1,
};

function sameSize(
  current: ResponsiveCanvasSize,
  next: ResponsiveCanvasSize,
): boolean {
  return (
    Math.abs(current.width - next.width) < 0.1 &&
    Math.abs(current.height - next.height) < 0.1 &&
    current.pixelRatio === next.pixelRatio
  );
}

/**
 * Keeps a CSS-sized canvas backed by a high-DPI bitmap.
 *
 * The hook only observes layout and configures the bitmap. Drawing remains a
 * pure concern of the consumer, so restored MLP snapshots are rendered exactly
 * from props without creating data or emitting activity events.
 */
export function useResponsiveCanvas(
  options: ResponsiveCanvasOptions = {},
): ResponsiveCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<ResponsiveCanvasSize>(INITIAL_SIZE);
  const maxPixelRatio = Math.max(1, options.maxPixelRatio ?? 2);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const pixelRatio = Math.min(
      Math.max(1, window.devicePixelRatio || 1),
      maxPixelRatio,
    );
    const bitmapWidth = Math.max(1, Math.round(width * pixelRatio));
    const bitmapHeight = Math.max(1, Math.round(height * pixelRatio));

    if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
    if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;

    const next = { width, height, pixelRatio };
    setSize((current) => (sameSize(current, next) ? current : next));
  }, [maxPixelRatio]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resize();
    window.addEventListener('resize', resize);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', resize);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [resize]);

  return { canvasRef, size };
}
