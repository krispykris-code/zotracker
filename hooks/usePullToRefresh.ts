"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, RefObject, TouchEvent } from "react";

const PULL_THRESHOLD = 60;
const MAX_PULL = 100;

// Pull-to-refresh gesture on a scroll container.
// iOS Safari notes (do not "simplify" these away — see CLAUDE.md):
// - the pull only arms when scrollTop === 0, otherwise it fights scrolling
// - the spinner element must stay permanently in the DOM with only its
//   opacity animated (single element, will-change) to avoid flicker
export function usePullToRefresh(scrollRef: RefObject<HTMLElement | null>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Mirrors "is a pull gesture in progress" for render-time style decisions
  // (reading touchStartY.current during render is not allowed).
  const [isTouching, setIsTouching] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (scrollRef.current && scrollRef.current.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
        setIsTouching(true);
      }
    },
    [scrollRef]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (touchStartY.current === null || isRefreshing) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0 && scrollRef.current?.scrollTop === 0) {
        // Resistance: diminishing return as user pulls further
        const resisted = Math.min(delta * 0.5, MAX_PULL);
        setPullDistance(resisted);
      }
    },
    [isRefreshing, scrollRef]
  );

  const onTouchEnd = useCallback(() => {
    if (touchStartY.current === null) return;
    touchStartY.current = null;
    setIsTouching(false);
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance]);

  // Style for the scroll container: follow the finger while pulling,
  // animate back only after release.
  const containerStyle: CSSProperties = {
    transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
    transition: !isTouching ? "transform 0.2s ease-out" : undefined,
  };

  return {
    pullDistance,
    isRefreshing,
    threshold: PULL_THRESHOLD,
    bind: { onTouchStart, onTouchMove, onTouchEnd },
    containerStyle,
  };
}
