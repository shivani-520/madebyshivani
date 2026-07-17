// useCarouselScroll.js
import { useRef, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Drives a carousel's scroll offset, always easing toward a "selected" card.
// No free-scroll momentum, so it never overshoots before centering.
//
// centers:     array of each card's center x position (from your layout calc)
// totalWidth:  total track width, used for wraparound math
// options:
//   snapStrength: how fast it eases toward the selected card (0-1, higher = snappier)
//   wheelThreshold: how much accumulated wheel delta triggers moving to the next/prev card
export function useCarouselScroll(centers, totalWidth, options = {}) {
  const {
    snapStrength = 0.04,
    wheelThreshold = 180,
  } = options;

  const { gl } = useThree();

  const scrollOffset = useRef(0);     // current smoothed scroll position
  const velocity = useRef(0);
  const selectedIndex = useRef(0);    // which card is "selected"
  const wheelAccum = useRef(0);       // accumulated wheel delta since last step

  const scrollDistortion = useRef(0);
  const lastSelected = useRef(0);

  const lastScroll = useRef(0);
  const SCROLL_DELAY = 250; // ms

  const triggerDistortion = () => {
    scrollDistortion.current = 1;
  };

  const selectCard = useCallback((index) => {
    const next = ((index % centers.length) + centers.length) % centers.length;

    if (next !== selectedIndex.current) {
      selectedIndex.current = next;
      triggerDistortion();
    }
  }, [centers.length]);

  const selectNext = useCallback(() => {
    selectCard(selectedIndex.current + 1);
  }, [selectCard]);

  const selectPrev = useCallback(() => {
    selectCard(selectedIndex.current - 1);
  }, [selectCard]);

  const reset = () => {
    scrollOffset.current = 0;
    selectedIndex.current = 0;
  };


  // wheel input steps the selection by one card at a time, no momentum
  useEffect(() => {
    const dom = gl.domElement;

    const handleWheel = (e) => {
      const now = performance.now();

      if (now - lastScroll.current < SCROLL_DELAY) return;

      wheelAccum.current += e.deltaY;

      if (wheelAccum.current > wheelThreshold) {
        selectNext();
        wheelAccum.current = 0;
        lastScroll.current = now;
      }

      if (wheelAccum.current < -wheelThreshold) {
        selectPrev();
        wheelAccum.current = 0;
        lastScroll.current = now;
      }
    };

    dom.addEventListener("wheel", handleWheel, { passive: true });
    return () => dom.removeEventListener("wheel", handleWheel);
  }, [gl, wheelThreshold, selectNext, selectPrev]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // avoid interfering with typing in inputs
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) {
        return;
      }

      switch (e.code) {
        case "ArrowRight":
        case "KeyD":
          selectNext();
          break;

        case "ArrowLeft":
        case "KeyA":
          selectPrev();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectNext, selectPrev]);

  useFrame((state, delta) => {

    const stiffness = 18;
    const damping = 8;

    const target = centers[selectedIndex.current];

    let diff = target - scrollOffset.current;
    diff =
      ((diff + totalWidth / 2) % totalWidth + totalWidth) %
        totalWidth -
      totalWidth / 2;

    velocity.current += diff * stiffness * delta;
    velocity.current *= Math.exp(-damping * delta);

    scrollOffset.current += velocity.current * delta;

    // decay distortion
    scrollDistortion.current = THREE.MathUtils.damp(
      scrollDistortion.current,
      0,
      2,
      delta
    );
  });

  return {
    scrollOffset,      // ref, read this each frame to position cards
    scrollDistortion,
    selectedIndex,     // ref, current selected card index
    selectCard,        // call to select a specific index (e.g. onClick)
    selectNext,
    selectPrev,
    reset
  };
}