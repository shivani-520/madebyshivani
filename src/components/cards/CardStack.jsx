import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import PortfolioCard from "./PortfolioCard";
import { PROJECTS, CARD_COUNT } from "../../data/projects";
import {
  CARD_FRONT_Z,
  CARD_STACK_DEPTH,
  CARD_INSIDE_Z,
} from "../../constants/cards";
import { damp, progress } from "../../utils/animation";
import { getCardRevealPose } from "../../utils/cardReveal";
import { releasePointer } from "../../utils/pointer";

export default function CardStack({
  phase,
  timeline,
  reduced,
  active,
  flipped,
  onNavigate,
  onFlip,
  feedback,
}) {
  const { gl } = useThree();
  const nodes = useRef([]);
  const drag = useRef(null);
  const swipeDirection = useRef(-1);
  const tilt = useRef({ x: 0, y: 0 });
  const previous = useRef(active);
  const flight = useRef(null);
  const browsing = phase === "cards" || phase == "spread";
  useEffect(() => {
    const cancel = () => {
      const gesture = drag.current;
      drag.current = null;
      if (gesture)
        releasePointer({ target: gesture.target, pointerId: gesture.id });
      tilt.current = { x: 0, y: 0 };
      feedback("idle");
    };
    const canvas = gl.domElement;
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, [gl, feedback]);
  useEffect(() => {
    tilt.current = { x: 0, y: 0 };

    if (previous.current !== active) {
      flight.current = {
        index: previous.current,
        elapsed: 0,
        direction: swipeDirection.current,
      };

      previous.current = active;
    }
  }, [active]);
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (flight.current) {
      flight.current.elapsed += dt;
      if (flight.current.elapsed >= 0.3) flight.current = null;
    }
    nodes.current.forEach((node, index) => {
      if (!node) return;
      const safeActive = Number.isInteger(active) ? active : 0;

      const rank = (index - safeActive + CARD_COUNT) % CARD_COUNT;
      if (phase === "sealed" || phase === "opening") {
        const pose = getCardRevealPose(
          timeline.current - index * 0.045,
          reduced,
        );
        const fan =
          progress(timeline.current, 1.15, 0.4) *
          (1 - progress(timeline.current, 1.65, 0.35));
        node.position.set(
          (index - 2.5) * 0.08 * fan,
          pose.y + index * 0.012,
          pose.z - index * CARD_STACK_DEPTH,
        );
        node.rotation.set(
          0,
          reduced ? 0 : Math.sin(index) * 0.08 * fan,
          (index - 2.5) * 0.028 * fan,
        );
        node.scale.setScalar(pose.scale);
        return;
      }
      const top = rank === 0;
      const dx = top && drag.current ? drag.current.dx : 0;
      const idle = reduced ? 0 : Math.sin(clock.elapsedTime * 0.62) * 0.045;
      let x = top ? dx * 0.004 : 0;
      const y = 0;
      let z = CARD_FRONT_Z - rank * 0.045;
      if (top) z += 0.85 * Math.abs(Math.sin(node.rotation.y));
      if (!reduced && flight.current?.index === index) {
        const t = flight.current.elapsed / 0.3;
        x += flight.current.direction * Math.sin(t * Math.PI) * 2.0;
        z = t < 0.5 ? CARD_FRONT_Z + 0.06 : z;
      }
      const ry = top ? (0 ? Math.PI : 0) : 0;
      const rx = 0;
      const rz = 0;
      const speed = reduced ? 1000 : 12;
      node.position.x = damp(node.position.x, x, speed, dt);
      node.position.y = damp(node.position.y, y, speed, dt);
      node.position.z = damp(node.position.z, z, speed, dt);
      node.rotation.x = damp(node.rotation.x, rx, speed, dt);
      node.rotation.y = damp(node.rotation.y, ry, speed, dt);
      node.rotation.z = damp(node.rotation.z, rz, speed, dt);
      node.scale.setScalar(damp(node.scale.x, 1, speed, dt));
    });
  });
  function end(event, cancelled = false) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    event.stopPropagation();
    drag.current = null;
    releasePointer(event);
    feedback("idle");
    tilt.current = { x: 0, y: 0 };
    if (cancelled) return;
    const dx = event.clientX - gesture.x;
    if (Math.abs(dx) > 45) {
      swipeDirection.current = dx > 0 ? 1 : -1;
      onNavigate(1);
    } else if (Math.hypot(dx, event.clientY - gesture.y) < 7) onFlip();
  }
  return (
    <group>
      {PROJECTS.map((project, index) => (
        <group
          key={project.number}
          ref={(node) => {
            nodes.current[index] = node;
          }}
          position={[0, -0.22, CARD_INSIDE_Z - index * CARD_STACK_DEPTH]}
          onPointerOver={(event) => {
            if (browsing && index === active) {
              event.stopPropagation();
              feedback("hover");
            }
          }}
          onPointerOut={() => {
            if (!drag.current) {
              tilt.current = { x: 0, y: 0 };
              feedback("idle");
            }
          }}
          onPointerDown={(event) => {
            if (
              !browsing ||
              index !== active ||
              event.button !== 0 ||
              drag.current
            )
              return;
            event.stopPropagation();
            event.target.setPointerCapture(event.pointerId);
            drag.current = {
              id: event.pointerId,
              target: event.target,
              x: event.clientX,
              y: event.clientY,
              dx: 0,
            };
            feedback("drag");
          }}
          onPointerMove={(event) => {
            if (!browsing || index !== active) return;
            event.stopPropagation();
            if (event.uv)
              tilt.current = {
                x: (event.uv.x - 0.5) * 2,
                y: (event.uv.y - 0.5) * 2,
              };
            if (drag.current?.id === event.pointerId)
              drag.current.dx = event.clientX - drag.current.x;
          }}
          onPointerUp={(event) => end(event)}
          onPointerCancel={(event) => end(event, true)}
          onLostPointerCapture={(event) => end(event, true)}
        >
          <PortfolioCard index={index} />
        </group>
      ))}
    </group>
  );
}
