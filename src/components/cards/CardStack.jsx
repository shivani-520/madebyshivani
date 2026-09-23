import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import PortfolioCard from "./PortfolioCard";
import { PROJECTS, CARD_COUNT } from "../../data/projects";
import {
  STACK_ANGLES,
  CARD_FRONT_Z,
  CARD_STACK_DEPTH,
  CARD_INITIAL_SCALE,
  CARD_INSIDE_Y,
  CARD_INSIDE_Z,
  CARD_RETURN_Z,
  CARD_WIDTH,
  CARD_HEIGHT,
} from "../../constants/cards";
import { clamp, damp, radians, springEase } from "../../utils/animation";
import { getCardRevealPose } from "../../utils/cardReveal";
import { releasePointer } from "../../utils/pointer";

export default function CardStack({
  phase,
  timeline,
  sceneScale,
  feedback,
  onActive,
  onViewed,
  onSpread,
  onSelected,
  selected,
  controls,
  reduced,
}) {
  const nodes = useRef([]);
  const order = useRef(PROJECTS.map((_, index) => index));
  const viewedCards = useRef(new Set());
  const drag = useRef(null);
  const flight = useRef(null);

  const hoverTilt = useRef({
    x: 0,
    y: 0,
  });

  const spread = useRef({ elapsed: 0, snapshots: null });
  const [hovered, setHovered] = useState(null);
  const { size, viewport, camera } = useThree();

  // A temporarily collapsed canvas must not write NaN/Infinity into nodes.
  const validSize = size.width > 0 && size.height > 0 && sceneScale > 0;
  const worldPerPixel = validSize ? viewport.width / size.width / sceneScale : 0;
  const narrow = size.width < 1000;
  const inSpread = phase === "spread" && !narrow;
  const browsing = phase === "cards" || (phase === "spread" && narrow);
  // Fit one card, independently of the number of projects. Measure at its
  // actual depth so perspective doesn't push it outside the canvas.
  const cardViewport = viewport.getCurrentViewport(
    camera,
    new THREE.Vector3(0, 0, CARD_FRONT_Z * sceneScale)
  );
  const OUT_OF_PACK_SCALE = narrow ? 1.1 : 1.5;

  const deckScale = validSize ? Math.min(
    narrow ? 1.65 : 1,
    cardViewport.width * 0.78 / sceneScale / CARD_WIDTH,
    cardViewport.height * 0.70 / sceneScale / CARD_HEIGHT
  ) * OUT_OF_PACK_SCALE : 1;
  const exitX = validSize
    ? viewport.width / sceneScale / 2 + Math.max(1.2, CARD_WIDTH * deckScale / 2 + 0.2)
    : 0;
  const rowStep = CARD_WIDTH + 0.05;
  const highlightedViewport = viewport.getCurrentViewport(camera,
    new THREE.Vector3(0, 0, sceneScale));
  const availableWidth = validSize ? highlightedViewport.width / sceneScale * 0.87 : 0;

  const ROW_SCALE_MULTIPLIER = 1.1;

  const rowScale = Math.min(
    1,
    availableWidth / (CARD_WIDTH * 1.5 + rowStep * Math.max(CARD_COUNT - 1, 0))
  ) * ROW_SCALE_MULTIPLIER;

  const centerIndex = (CARD_COUNT - 1) / 2;

  const throwCard = useCallback((direction) => {
    if (!browsing || flight.current || drag.current) return;

    flight.current = {
      id: order.current[0],
      direction,
      elapsed: 0,
      committed: false,
      // >= also handles returning to desktop after a complete mobile lap.
      final: !narrow && viewedCards.current.size >= CARD_COUNT - 1,
    };

    setHovered(null);
    feedback("idle");
  }, [browsing, feedback, narrow]);

  useEffect(() => {
    controls.current = throwCard;
    return () => {
      controls.current = null;
    };
  }, [controls, throwCard]);

  useEffect(() => {
    if (!inSpread) {
      spread.current = { elapsed: 0, snapshots: null };
      setHovered(null);
    }
  }, [inSpread]);

  useFrame((_, delta) => {
    if (!validSize) return;
    const dt = Math.min(delta, 0.05);
    const action = flight.current;

    if (action) {
      // Resize can happen on either side of the commit point. A cancelled
      // terminal flick must rotate exactly once, even if already committed.
      if (narrow && action.final) {
        action.final = false;
        if (action.committed) {
          order.current.push(order.current.shift());
          onActive(order.current[0]);
        }
      }
      action.elapsed += dt;

      if (action.elapsed >= 0.3 && !action.committed) {
        action.committed = true;
        viewedCards.current.add(action.id);
        onViewed(viewedCards.current.size);

        if (!action.final) {
          order.current.push(order.current.shift());
          onActive(order.current[0]);
        }

        nodes.current[action.id].position.z = CARD_RETURN_Z;
      }

      if (action.elapsed >= 0.68) {
        flight.current = null;
        if (action.final) onSpread();
      }
    }

    if (inSpread) {
      const state = spread.current;

      if (!state.snapshots) {
        state.snapshots = nodes.current.map((node) => ({
          position: node.position.clone(),
          rotation: node.rotation.clone(),
          scale: node.scale.x,
        }));
      }

      state.elapsed += dt;

      nodes.current.forEach((node, id) => {
        const snapshot = state.snapshots[id];
        const elapsed = state.elapsed - id * 0.06;
        const eased = springEase(elapsed / 0.7);
        const interactive = state.elapsed >= 0.96;
        const highlighted = interactive && (hovered === id || selected === id);
        const targetX = (id - centerIndex) * rowStep * rowScale;
        const targetY = highlighted ? 0.11 : 0;
        const targetZ = highlighted ? 1.0 : 0.43 + id * 0.006;
        const targetScale = rowScale * (highlighted ? 1.5 : 1);

        if (state.elapsed <= 0.96) {
          node.position.x = THREE.MathUtils.lerp(
            snapshot.position.x,
            targetX,
            eased
          );
          node.position.y = THREE.MathUtils.lerp(
            snapshot.position.y,
            0,
            eased
          );
          node.position.z = THREE.MathUtils.lerp(
            snapshot.position.z,
            0.43 + id * 0.006,
            eased
          );
          node.rotation.y = snapshot.rotation.y * (1 - eased);
          node.rotation.z = snapshot.rotation.z * (1 - eased);
          node.scale.setScalar(
            THREE.MathUtils.lerp(snapshot.scale, rowScale, eased)
          );
        } else {
          node.position.x = damp(node.position.x, targetX, 14, dt);
          node.position.y = damp(node.position.y, targetY, 14, dt);
          node.position.z = damp(node.position.z, targetZ, 14, dt);

          const MAX_TILT = 0.10;

          let targetRotationX = 0;
          let targetRotationY = 0;

          if (hovered === id) {
            targetRotationY =
              hoverTilt.current.x * MAX_TILT;

            targetRotationX =
              -hoverTilt.current.y * MAX_TILT;
          }

          node.rotation.x = damp(
            node.rotation.x,
            targetRotationX,
            12,
            dt
          );

          node.rotation.y = damp(
            node.rotation.y,
            targetRotationY,
            12,
            dt
          );

          node.rotation.z = damp(
            node.rotation.z,
            0,
            14,
            dt
          );

          node.scale.setScalar(damp(node.scale.x, targetScale, 14, dt));
        }
      });

      return;
    }

    const reveal = !browsing
      ? getCardRevealPose(
          phase === "sealed" ? 0 : timeline.current,
          reduced
        )
      : null;

    order.current.forEach((id, rank) => {
      const node = nodes.current[id];
      if (!node) return;

      let x = rank === 0 ? 0 : (rank % 2 ? 1 : -1) * rank * 0.006;
      let y = rank * 0.005;
      let z = CARD_FRONT_Z - rank * CARD_STACK_DEPTH;
      let rz = radians(STACK_ANGLES[rank % STACK_ANGLES.length] ?? 0);
      let ry = 0;

      if (reveal) {
        node.position.set(
          x,
          y + reveal.y,
          reveal.z - rank * CARD_STACK_DEPTH
        );
        node.rotation.set(0, 0, rz);
        node.scale.setScalar(reveal.scale);
        return;
      }

      if (rank === 0 && drag.current) {
        x += drag.current.dx * worldPerPixel;
        y += Math.min(Math.abs(x) * 0.035, 0.08);
        z += Math.min(Math.abs(x) * 0.11, 0.2);
        rz = clamp(-x * 0.12, -0.18, 0.18);
        ry = clamp(x * 0.025, -0.045, 0.045);
      }

      if (action?.id === id) {
        if (!action.committed) {
          x = action.direction * exitX;
          y = 0.1;
          z = 0.5;
          rz = -action.direction * 0.15;
        } else if (action.final) {
          z = 0.16;
        }
      }

      const speed = rank === 0 && drag.current ? 30 : 17;
      node.position.x = damp(node.position.x, x, speed, dt);
      node.position.y = damp(node.position.y, y, speed, dt);
      node.position.z = damp(node.position.z, z, speed, dt);
      node.rotation.z = damp(node.rotation.z, rz, speed, dt);
      node.rotation.y = damp(node.rotation.y, ry, speed, dt);
      node.scale.setScalar(damp(node.scale.x, deckScale, 15, dt));
    });
  });

  function updateDrag(event) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;

    const now = performance.now();
    const elapsed = now - current.lastTime;
    const movement = event.clientX - current.lastX;

    current.dx = event.clientX - current.startX;

    if (elapsed > 0 && movement !== 0) {
      const instantaneous = movement / Math.max(elapsed, 4);
      current.velocity = current.velocity * 0.25 + instantaneous * 0.75;
      current.lastMotion = now;
    }

    current.lastX = event.clientX;
    current.lastTime = now;
  }

  function end(event, cancelled = false) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;

    event.stopPropagation();
    updateDrag(event);

    const distance = current.dx;
    const velocity = performance.now() - current.lastMotion < 100
      ? current.velocity
      : 0;

    drag.current = null;
    releasePointer(event);
    feedback("idle");

    const distanceThreshold = Math.min(76, size.width * 0.16);
    const fastFlick = Math.abs(distance) > 8 && Math.abs(velocity) > 0.55;

    if (!cancelled && (Math.abs(distance) > distanceThreshold || fastFlick)) {
      throwCard(
        Math.abs(distance) > distanceThreshold
          ? Math.sign(distance)
          : Math.sign(velocity)
      );
    }
  }

  return (
    <group>
      {PROJECTS.map((project, index) => (
        <group
          key={project.number ?? index}
          ref={(node) => {
            nodes.current[index] = node;
          }}
          position={[
            0,
            reduced ? 0 : CARD_INSIDE_Y,
            CARD_INSIDE_Z - index * CARD_STACK_DEPTH,
          ]}
          scale={CARD_INITIAL_SCALE}
          onPointerOver={(event) => {
            if (inSpread && spread.current.elapsed >= 0.96) {
              event.stopPropagation();
              setHovered(index);
              feedback("pointer");
            } else if (
              browsing &&
              order.current[0] === index &&
              !flight.current
            ) {
              event.stopPropagation();
              feedback("hover");
            }
          }}
          onPointerOut={() => {
            setHovered((current) =>
              current === index ? null : current
            );

            hoverTilt.current.x = 0;
            hoverTilt.current.y = 0;

            if (phase !== "sealed" && !drag.current) {
              feedback("idle");
            }
          }}
          onPointerDown={(event) => {
            if (inSpread) {
              event.stopPropagation();
              return;
            }

            if (
              !browsing ||
              order.current[0] !== index ||
              flight.current ||
              drag.current ||
              event.button !== 0
            ) return;

            event.stopPropagation();

            const now = performance.now();
            drag.current = {
              id: event.pointerId,
              startX: event.clientX,
              lastX: event.clientX,
              lastTime: now,
              lastMotion: now,
              dx: 0,
              velocity: 0,
            };

            event.target.setPointerCapture(event.pointerId);
            feedback("drag");
          }}
          onPointerMove={(event) => {
            // Existing drag behaviour
            if (drag.current && drag.current.id === event.pointerId) {
              event.stopPropagation();
              updateDrag(event);
              return;
            }

            // Hover tilt while cards are spread
            if (
              inSpread &&
              spread.current.elapsed >= 0.96 &&
              hovered === index
            ) {
              event.stopPropagation();

              const uv = event.uv;

              if (uv) {
                // Convert UV 0 -> 1 into -1 -> 1
                const x = (uv.x - 0.5) * 2;
                const y = (uv.y - 0.5) * 2;

                hoverTilt.current.x = x;
                hoverTilt.current.y = y;
              }
            }
          }}
          onPointerUp={(event) => end(event)}
          onPointerCancel={(event) => end(event, true)}
          onLostPointerCapture={() => {
            if (!drag.current) return;
            drag.current = null;
            feedback("idle");
          }}
          onClick={(event) => {
            if (
              !inSpread ||
              spread.current.elapsed < 0.96 ||
              event.delta > 8
            ) return;

            event.stopPropagation();
            onSelected(index);
          }}
        >
          <PortfolioCard
            index={index}
            highlighted={
              inSpread &&
              (hovered === index || selected === index)
            }
          />
        </group>
      ))}
    </group>
  );
}