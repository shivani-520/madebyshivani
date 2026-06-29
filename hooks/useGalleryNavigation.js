import { useRef, useCallback } from "react";

export default function useGalleryNavigation({
  count,
  setSelected,
  threshold = 40,
  wheelThreshold = 20,
  wheelCooldown = 600,
  onScrolledAway,
}) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const pointerId = useRef(null);
  const lastWheelTime = useRef(0);

  const onPointerDown = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    pointerId.current = e.pointerId;
  }, []);

  const onPointerUp = useCallback(
    (e) => {
      if (!isDragging.current) return;
      if (pointerId.current !== e.pointerId) return;

      const deltaX = e.clientX - startX.current;

      if (Math.abs(deltaX) > threshold) {
        setSelected((prev) => {
          const next =
            deltaX < 0
              ? Math.min(prev + 1, count - 1)
              : Math.max(prev - 1, 0);

          if (onScrolledAway) {
            if (next > 0) onScrolledAway(true);
            if (next === 0) onScrolledAway(false);
          }

          return next;
        });
      }

      isDragging.current = false;
      pointerId.current = null;
    },
    [count, setSelected, threshold, onScrolledAway]
  );

  const onPointerCancel = useCallback(() => {
    isDragging.current = false;
    pointerId.current = null;
  }, []);

  const onWheel = useCallback(
    (e) => {
      if (Math.abs(e.deltaY) < wheelThreshold) return;

      const now = Date.now();
      if (now - lastWheelTime.current < wheelCooldown) return;

      lastWheelTime.current = now;

      setSelected((prev) => {
        if (e.deltaY > 0 && prev >= count - 1) return prev;
        if (e.deltaY < 0 && prev <= 0) return prev;

        const next = e.deltaY > 0 ? prev + 1 : prev - 1;

        if (onScrolledAway) {
          if (next > 0) onScrolledAway(true);
          if (next === 0) onScrolledAway(false);
        }

        return next;
      });
    },
    [count, setSelected, wheelThreshold, wheelCooldown, onScrolledAway]
  );

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onWheel,
  };
}