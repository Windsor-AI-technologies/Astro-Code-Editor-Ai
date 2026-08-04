import { useRef, useCallback } from 'react';

/**
 * Lightweight drag-to-resize hook. Returns an onMouseDown handler.
 * @param axis 'x' for horizontal, 'y' for vertical
 * @param getStart function returning current size when drag starts
 * @param onResize called with new size during drag
 * @param min minimum size
 * @param max maximum size
 * @param invert true = moving mouse left/up increases size (right/bottom panels)
 */
export function useResize(
  axis: 'x' | 'y',
  getStart: () => number,
  onResize: (size: number) => void,
  min: number,
  max: number,
  invert = false,
) {
  const dragging = useRef(false);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startPos = axis === 'x' ? e.clientX : e.clientY;
    const startSize = getStart();

    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const pos = axis === 'x' ? ev.clientX : ev.clientY;
      const delta = invert ? startPos - pos : pos - startPos;
      onResize(Math.max(min, Math.min(max, startSize + delta)));
    }
    function onUp() {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [axis, getStart, onResize, min, max, invert]);

  return onResizeStart;
}
