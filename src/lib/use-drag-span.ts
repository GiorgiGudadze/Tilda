import { type DragEvent, type PointerEvent, useRef, useState } from 'react';

/** How far the pointer must move before a press counts as a drag, in px. */
const DRAG_THRESHOLD_PX = 4;

/** A span across a chart, as shares of its width from 0 to 1. */
interface DragSpan {
  startShare: number;
  endShare: number;
}

interface Options {
  /** Without it, the chart takes no drags. */
  onSpan?: (startShare: number, endShare: number) => void;
  /**
   * Whether a press without a drag is a span too (of zero width). It is
   * for bars, where a click zooms to the bar. It is not for marks that are
   * links: there a click must reach the link.
   */
  clickSelects: boolean;
}

/**
 * Drag across a chart to pick a span of it. Put `ref` and `handlers` on the
 * box the chart fills; `span` is the drag in progress, for drawing it.
 *
 * The pointer is captured only once a press becomes a drag, so a plain
 * click still goes to whatever is under it.
 */
export function useDragSpan({ onSpan, clickSelects }: Options) {
  const ref = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; share: number; dragging: boolean } | null>(
    null,
  );
  const [span, setSpan] = useState<DragSpan | null>(null);

  function shareAt(clientX: number): number | null {
    const box = ref.current?.getBoundingClientRect();
    if (!box || box.width === 0) {
      return null;
    }
    return Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
  }

  function reset() {
    press.current = null;
    setSpan(null);
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      const share = shareAt(event.clientX);
      if (!onSpan || event.button !== 0 || share === null) {
        return;
      }
      press.current = { x: event.clientX, share, dragging: clickSelects };
      if (clickSelects) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setSpan({ startShare: share, endShare: share });
      }
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const current = press.current;
      const share = shareAt(event.clientX);
      if (!current || share === null) {
        return;
      }
      if (
        !current.dragging &&
        Math.abs(event.clientX - current.x) >= DRAG_THRESHOLD_PX
      ) {
        current.dragging = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      if (current.dragging) {
        setSpan({ startShare: current.share, endShare: share });
      }
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const current = press.current;
      const share = shareAt(event.clientX);
      reset();
      if (current?.dragging && share !== null) {
        onSpan?.(current.share, share);
      }
    },
    onPointerCancel: reset,
    // A link under the pointer would otherwise start the browser's own drag.
    onDragStart(event: DragEvent) {
      event.preventDefault();
    },
  };

  return { ref, span, handlers };
}
