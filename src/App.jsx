import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import "./index.css";

// Place your pack artwork at public/textures/pack-front.webp.
const PACK_FRONT_TEXTURE = "/images/textures/Foil-Front.png";

// Change these paths to swap the image shown on each project card.
// These paths correspond to files inside public/images/textures/cards/.
const CARD_IMAGES = [
  "/images/cards/GreninjaXY41.jpg",
  "/images/cards/tg-jones-card.png",
  "/images/cards/games-card.webp",
  "/images/cards/games-card.webp",
  "/images/cards/games-card.webp",
];

// Edit the project content here. Image paths remain sourced from CARD_IMAGES.
const PROJECTS = [
  {
    title: "Interactive Atlas",
    image: CARD_IMAGES[0],
    description:
      "An interactive collection of places, stories, and small discoveries, built for curious explorers.",
    tech: ["React", "Three.js", "Vite"],
    category: "Interactive",
    rarity: "Rare",
    number: "001",
    year: "2026",
  },
  {
    title: "Studio Journal",
    image: CARD_IMAGES[1],
    description:
      "A thoughtful home for creative work, with careful typography and a focus on the details.",
    tech: ["React", "CSS", "Vite"],
    category: "Web Experience",
    rarity: "Edition",
    number: "002",
    year: "2026",
  },
  {
    title: "Playground",
    image: CARD_IMAGES[2],
    description:
      "Small games and playful interactions that turn a spare moment into something memorable.",
    tech: ["JavaScript", "React", "CSS"],
    category: "Experiment",
    rarity: "Rare",
    number: "003",
    year: "2026",
  },
  {
    title: "Component Lab",
    image: CARD_IMAGES[3],
    description:
      "A collection of useful interface components, designed for clarity and everyday interaction.",
    tech: ["React", "CSS", "Vite"],
    category: "Interface",
    rarity: "Edition",
    number: "004",
    year: "2026",
  },
  {
    title: "Motion Studies",
    image: CARD_IMAGES[4],
    description:
      "An exploration of movement and timing that makes digital objects feel a little more alive.",
    tech: ["Three.js", "React", "WebGL"],
    category: "Creative Code",
    rarity: "Special",
    number: "005",
    year: "2026",
  },
];

const COLORS = ["#ad91e8", "#729fe6", "#e99697", "#83bea6", "#dec184"];
const STACK_ANGLES = [0, -0.8, 0.5, -0.4, 0.7];
const WIDTH = 1.8;
const HEIGHT = 3;
const OPEN_DURATION = 1.65;
const FRONT_Z = 0.05;
const BACK_Z = -0.23;
const CARD_FRONT_Z = 0.65;

// 304 × 426 pixels at distanceFactor 2 match 1.52 × 2.13 world units.
// Using 96% leaves the physical plane visible around the HTML face.
const CARD_HTML_DISTANCE_FACTOR = 2 * 0.96;

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const radians = THREE.MathUtils.degToRad;

function smooth(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function progress(time, start, duration) {
  return smooth((time - start) / duration);
}

function springEase(value) {
  const t = clamp(value, 0, 1);
  if (t === 1) return 1;
  return 1 - Math.exp(-7 * t) * Math.cos(8 * t);
}

function seamX(y) {
  return Math.sin(y * 31) * 0.003 + Math.sin(y * 67 + 0.4) * 0.0015;
}

function releasePointer(event) {
  try {
    if (event.target.hasPointerCapture?.(event.pointerId)) {
      event.target.releasePointerCapture(event.pointerId);
    }
  } catch {
    // A cancelled pointer may already have lost capture.
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function usePackTexture(url) {
  const { gl } = useThree();
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();

    const texture = loader.load(
      url,
      (result) => {
        if (!active) {
          result.dispose();
          return;
        }

        result.colorSpace = THREE.SRGBColorSpace;
        result.wrapS = THREE.ClampToEdgeWrapping;
        result.wrapT = THREE.ClampToEdgeWrapping;

        result.minFilter = THREE.LinearMipmapLinearFilter;
        result.magFilter = THREE.LinearFilter;
        result.generateMipmaps = true;

        result.anisotropy = gl.capabilities.getMaxAnisotropy();

        result.flipY = true;
        result.needsUpdate = true;

        // Map the complete image without cropping, repeating, or mirroring.
        result.offset.set(0, 0);
        result.repeat.set(1, 1);
        result.center.set(0, 0);
        result.needsUpdate = true;

        setLoaded({ url, texture: result });
      },
      undefined,
      () => {
        // Keep the plain fallback color if the image is unavailable.
        if (active) setLoaded(null);
      }
    );

    return () => {
      active = false;
      texture.dispose();
    };
  }, [url, gl]);

  return loaded?.url === url ? loaded.texture : null;
}

function createFoilMaterial(back, packTexture = null, inside = false) {
  const silver = back || inside;

  const material = new THREE.MeshStandardMaterial({
    color: silver ? "#c7c3ca" : packTexture ? "#ffffff" : "#51405f",
    map: silver ? null : packTexture,
    metalness: silver ? 0.6 : 0.35,
    roughness: silver ? 0.4 : 0.42,
    side: back
      ? THREE.DoubleSide
      : inside
        ? THREE.BackSide
        : THREE.FrontSide,
  });

  material.userData.baseColor = material.color.clone();
  return material;
}

function createFoilGeometry(part) {
  const back = part === "back";
  const geometry = new THREE.PlaneGeometry(
    back ? WIDTH : WIDTH / 2,
    HEIGHT,
    back ? 36 : 28,
    48
  );
  const positions = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const original = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const y = (v - 0.5) * HEIGHT;
    const seam = seamX(y);

    let x;
    if (back) x = (u - 0.5) * WIDTH;
    else if (part === "left") x = THREE.MathUtils.lerp(-WIDTH / 2, seam, u);
    else x = THREE.MathUtils.lerp(seam, WIDTH / 2, u);

    original[i * 3] = x;
    original[i * 3 + 1] = y;
    original[i * 3 + 2] = v;

    // Both panels sample one continuous image in full-pack UV coordinates.
    uv.setXY(i, x / WIDTH + 0.5, v);
  }

  geometry.userData.original = original;
  deformFoil(geometry, part, 0);
  return geometry;
}

function deformFoil(geometry, part, time) {
  const positions = geometry.attributes.position;
  const original = geometry.userData.original;
  const side = part === "left" ? -1 : 1;
  const grab = Math.sin(progress(time, 0, 0.15) * Math.PI);

  for (let i = 0; i < positions.count; i++) {
    const ox = original[i * 3];
    const oy = original[i * 3 + 1];
    const v = original[i * 3 + 2];

    let x = ox;
    let y = oy;
    let z = part === "back" ? BACK_Z : FRONT_Z;

    if (part === "back") {
      z -= progress(time, 0.2, 1.1) * Math.sin(v * Math.PI) * 0.025;
    } else {
      const seam = seamX(oy);
      const panelWidth = WIDTH / 2 - side * seam;
      const distanceFromOuter = clamp(WIDTH / 2 - side * ox, 0, panelWidth);
      const centerInfluence = distanceFromOuter / panelWidth;

      // The upper-middle opens first. The lower seam remains joined longer.
      const belowStart = Math.max(0, 0.8 - oy) / 2.3;
      const aboveStart = Math.max(0, oy - 0.8) / 0.7;
      const delay =
        belowStart * 0.5 +
        aboveStart * 0.07 +
        (side === 1 ? 0.035 : 0);
      const peel = progress(time, 0.12 + delay, 0.7);

      /*
       * Integrate a curved cross-section from the anchored outer edge.
       * The inner edge rolls across a bend and turns outward.
       * Each Y row has its own peel amount, producing the moving V-shaped tear.
       */
      // Opens outward, but settles much flatter
      const maxAngle = Math.PI * 0.8;
      const angle = peel * maxAngle;

      const bendLength = 0.34 + Math.sin(oy * 3.7 + side) * 0.018;
      const curvature = angle / bendLength;
      const curvedLength = Math.min(distanceFromOuter, bendLength);
      const remaining = Math.max(0, distanceFromOuter - bendLength);

      let inward = distanceFromOuter;
      let lift = 0;

      if (curvature > 0.0001) {
        const localAngle = curvedLength * curvature;

        inward =
          Math.sin(localAngle) / curvature +
          remaining * Math.cos(angle);

        lift =
          (1 - Math.cos(localAngle)) / curvature +
          remaining * Math.sin(angle);
      }

      x = side * (WIDTH / 2 - inward);

      // Spread the foil farther sideways
      const openSpread = 0.5;
      x += side * openSpread * peel * centerInfluence;

      // Compress its depth as it finishes opening
      const flatten = THREE.MathUtils.lerp(1, 0.22, peel);
      z += lift * flatten;

      const irregularity =
        Math.sin(oy * 29 + side * 0.7) * 0.006 +
        Math.sin(oy * 61 + 0) * 0.002;

      x += side * irregularity * centerInfluence * peel;
      y += Math.sin(oy * 5 + side) * 0.012 * centerInfluence * peel;
      // A shallow embossed center seam stays continuous while sealed.
      z += Math.exp(-Math.abs(ox - seam) * 90) * 0.009 * (1 - peel);
      z += grab * centerInfluence ** 2 * 0.024;
      y -= grab * smooth((oy + 0.2) / 1.7) * 0.016;
    }

    positions.setXYZ(i, x, y, z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function FoilPanel({ part, phase, timeline, packTexture = null }) {
  const geometry = useMemo(() => createFoilGeometry(part), [part]);

  const materials = useMemo(() => {
    if (part === "back") {
      return [createFoilMaterial(true)];
    }

    return [
      createFoilMaterial(false, packTexture),
      createFoilMaterial(false, null, true),
    ];
  }, [part, packTexture]);

  const lastTime = useRef(-1);
  const brightness = useRef(1);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useEffect(() => {
    return () => {
      materials.forEach((material) => material.dispose());
    };
  }, [materials]);

  useFrame((_, delta) => {
    const time = phase === "sealed"
      ? 0
      : Math.min(timeline.current, OPEN_DURATION);

    if (lastTime.current !== time) {
      deformFoil(geometry, part, time);
      lastTime.current = time;
    }

    brightness.current = damp(
      brightness.current,
      phase === "spread" ? 0.62 : 1,
      6,
      Math.min(delta, 0.05)
    );

    materials.forEach((material) => {
      material.color
        .copy(material.userData.baseColor)
        .multiplyScalar(brightness.current);
    });
  });

  return (
    <group dispose={null}>
      <mesh
        geometry={geometry}
        material={materials[0]}
        frustumCulled={false}
      />

      {/* Opposite face culling gives the same deformed sheet a silver inside. */}
      {materials[1] && (
        <mesh
          geometry={geometry}
          material={materials[1]}
          frustumCulled={false}
        />
      )}
    </group>
  );
}

function BoosterPack({ phase, timeline, open, feedback, reduced, packTexture }) {
  const root = useRef();
  const gesture = useRef(null);

  useFrame(({ pointer, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const sealed = phase === "sealed";
    const spread = phase === "spread";
    const idleY = sealed && !reduced
      ? Math.sin(clock.elapsedTime * 1.3) * 0.012
      : 0;

    root.current.position.y = damp(root.current.position.y, idleY, 10, dt);
    root.current.position.z = damp(
      root.current.position.z, spread ? -0.18 : 0, 7, dt
    );
    root.current.scale.setScalar(
      damp(root.current.scale.x, spread ? 0.94 : 1, 7, dt)
    );

    root.current.rotation.x = damp(
      root.current.rotation.x,
      sealed && !reduced ? -pointer.y * radians(1.5) : 0,
      10,
      dt
    );
    root.current.rotation.y = damp(
      root.current.rotation.y,
      sealed && !reduced ? pointer.x * radians(2) : 0,
      10,
      dt
    );
    root.current.rotation.z = damp(
      root.current.rotation.z,
      sealed && !reduced ? pointer.x * radians(0.4) : 0,
      10,
      dt
    );
  });

  function end(event, cancelled = false) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    event.stopPropagation();

    const distance = Math.hypot(
      event.clientX - start.x,
      event.clientY - start.y
    );

    gesture.current = null;
    releasePointer(event);
    feedback("idle");

    if (!cancelled && distance < 12) open();
  }

  return (
    <group
      ref={root}
      onPointerOver={(event) => {
        if (phase !== "sealed") return;
        event.stopPropagation();
        feedback("hover");
      }}
      onPointerOut={() => {
        if (phase === "sealed" && !gesture.current) feedback("idle");
      }}
      onPointerDown={(event) => {
        if (
          phase !== "sealed" ||
          event.button !== 0 ||
          gesture.current
        ) return;

        event.stopPropagation();
        gesture.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
        event.target.setPointerCapture(event.pointerId);
        feedback("drag");
      }}
      onPointerMove={(event) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        event.stopPropagation();

        if (
          Math.abs(event.clientX - start.x) > 40 ||
          Math.abs(event.clientY - start.y) > 44
        ) {
          gesture.current = null;
          releasePointer(event);
          feedback("idle");
          open();
        }
      }}
      onPointerUp={(event) => end(event)}
      onPointerCancel={(event) => end(event, true)}
      onLostPointerCapture={() => {
        if (!gesture.current) return;
        gesture.current = null;
        feedback("idle");
      }}
    >
      <FoilPanel part="back" phase={phase} timeline={timeline} />
      <FoilPanel
        part="left"
        phase={phase}
        timeline={timeline}
        packTexture={packTexture}
      />
      <FoilPanel
        part="right"
        phase={phase}
        timeline={timeline}
        packTexture={packTexture}
      />
    </group>
  );
}

function PortfolioCard({ index, highlighted }) {
  const project = PROJECTS[index];
  const [failedImage, setFailedImage] = useState(null);
  const imageFailed = failedImage === project.image;

  return (
    <group>
      {/* Real, visible 3D card and raycast target for the existing handlers. */}
      <mesh>
        <planeGeometry args={[1.52, 2.13]} />
        <meshStandardMaterial
          color={COLORS[index]}
          metalness={0.15}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* A very shallow dark reverse surface, visible from behind. */}
      <mesh position={[0, 0, -0.006]}>
        <planeGeometry args={[1.52, 2.13]} />
        <meshStandardMaterial
          color="#211c2b"
          metalness={0.1}
          roughness={0.6}
          side={THREE.BackSide}
        />
      </mesh>

      {/*
       * The HTML inherits this same Three.js group transform.
       * Blending occlusion allows the wrapper and other cards to cover it.
       */}
      <Html
        transform
        position={[0, 0, 0.01]}
        distanceFactor={CARD_HTML_DISTANCE_FACTOR}
        occlude="blending"
        zIndexRange={[16777271, 0]}
        pointerEvents="none"
        wrapperClass="project-card-html"
        className="project-card-anchor"
        style={{ pointerEvents: "none" }}
      >
        <article
          className={`project-card ${highlighted ? "is-highlighted" : ""}`}
          style={{ "--card-color": COLORS[index] }}
          aria-label={`${project.title}, project ${project.number}`}
        >
          <div className="project-card__frame">
            <header className="project-card__header">
              <div className="project-card__heading">
                <h3 className="project-card__title">{project.title}</h3>
                <span className="project-card__eyebrow">
                  {project.category}
                </span>
              </div>

              <div className="project-card__number">
                <span>NO.</span>
                <strong>{project.number}</strong>
              </div>
            </header>

            <div className="project-card__image-wrap">
              {imageFailed ? (
                <div className="project-card__image-fallback">
                  <strong aria-hidden="true">{project.number}</strong>
                  <span>Project preview coming soon</span>
                </div>
              ) : (
                <img
                  src={project.image}
                  alt={project.title}
                  draggable={false}
                  decoding="async"
                  onError={() => setFailedImage(project.image)}
                />
              )}

              <span className="project-card__image-caption" aria-hidden="true">
                SELECTED WORK / {project.year}
              </span>
            </div>

            <div className="project-card__meta">
              <span className="project-card__category">
                <span className="project-card__type-mark" aria-hidden="true" />
                {project.category}
              </span>

              <span className="project-card__rarity">
                <span aria-hidden="true">✦</span>
                {project.rarity}
              </span>
            </div>

            <div className="project-card__details">
              <span className="project-card__section-label">The project</span>
              <p className="project-card__description">
                {project.description}
              </p>
            </div>

            <div className="project-card__tech" aria-label="Technology stack">
              {project.tech.map((technology) => (
                <span className="project-card__tech-item" key={technology}>
                  {technology}
                </span>
              ))}
            </div>

            <footer className="project-card__footer">
              <span>PORTFOLIO SERIES · {project.year}</span>
              <span>{project.number} / 005</span>
            </footer>
          </div>

          <div className="project-card__shine" aria-hidden="true" />
        </article>
      </Html>
    </group>
  );
}

function CardStack({
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
}) {
  const nodes = useRef([]);
  const order = useRef([0, 1, 2, 3, 4]);
  const viewedCards = useRef(new Set());
  const drag = useRef(null);
  const flight = useRef(null);
  const spread = useRef({ elapsed: 0, snapshots: null });
  const [hovered, setHovered] = useState(null);
  const { size, viewport } = useThree();

  const worldPerPixel = viewport.width / size.width / sceneScale;
  const exitX = viewport.width / sceneScale / 2 + 1.2;
  const narrow = size.width < 600;
  const rowStep = narrow ? 1.3 : 1.65;
  const availableWidth = viewport.width / sceneScale * 0.87;
  const rowScale = Math.min(1, availableWidth / (1.52 + rowStep * 4));

  const throwCard = useCallback((direction) => {
    if (phase !== "cards" || flight.current || drag.current) return;
    flight.current = {
      id: order.current[0],
      direction,
      elapsed: 0,
      committed: false,
      final: viewedCards.current.size === COLORS.length - 1,
    };
    setHovered(null);
    feedback("idle");
  }, [phase, feedback]);

  useEffect(() => {
    controls.current = throwCard;
    return () => {
      controls.current = null;
    };
  }, [controls, throwCard]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const action = flight.current;

    if (action) {
      action.elapsed += dt;

      if (action.elapsed >= 0.3 && !action.committed) {
        action.committed = true;
        viewedCards.current.add(action.id);
        onViewed(viewedCards.current.size);

        // Every card remains mounted. Previously viewed cards return behind.
        if (!action.final) {
          order.current.push(order.current.shift());
          onActive(order.current[0]);
        }

        nodes.current[action.id].position.z = -0.1;
      }

      if (action.elapsed >= 0.68) {
        flight.current = null;
        if (action.final) onSpread();
      }
    }

    if (phase === "spread") {
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
        const targetX = (id - 2) * rowStep * rowScale;
        const targetY = highlighted ? 0.11 : 0;
        const targetZ = highlighted ? 0.62 : 0.43 + id * 0.006;
        const targetScale = rowScale * (highlighted ? 1.5 : 1);

        if (state.elapsed <= 0.96) {
          node.position.x = THREE.MathUtils.lerp(snapshot.position.x, targetX, eased);
          node.position.y = THREE.MathUtils.lerp(snapshot.position.y, 0, eased);
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
          node.rotation.y = damp(node.rotation.y, 0, 14, dt);
          node.rotation.z = damp(node.rotation.z, 0, 14, dt);
          node.scale.setScalar(damp(node.scale.x, targetScale, 14, dt));
        }
      });

      return;
    }

    order.current.forEach((id, rank) => {
      const node = nodes.current[id];
      if (!node) return;

      let x = rank === 0 ? 0 : (rank % 2 ? 1 : -1) * rank * 0.006;
      let y = rank * 0.005;
      let z = CARD_FRONT_Z - rank * 0.04;
      let rz = radians(STACK_ANGLES[rank]);
      let ry = 0;

      if (phase !== "cards") {
        const reveal = progress(timeline.current, 1.12, 0.38);
        node.position.set(x, y, reveal * CARD_FRONT_Z - rank * 0.04);
        node.rotation.set(0, 0, rz);
        node.scale.setScalar(0.96 + reveal * 0.04);
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
      node.scale.setScalar(damp(node.scale.x, 1, 15, dt));
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
      {COLORS.map((color, index) => (
        <group
          key={color}
          ref={(node) => {
            nodes.current[index] = node;
          }}
          position={[0, 0, -index * 0.04]}
          scale={0.96}
          onPointerOver={(event) => {
            if (phase === "spread" && spread.current.elapsed >= 0.96) {
              event.stopPropagation();
              setHovered(index);
              feedback("pointer");
            } else if (
              phase === "cards" &&
              order.current[0] === index &&
              !flight.current
            ) {
              event.stopPropagation();
              feedback("hover");
            }
          }}
          onPointerOut={() => {
            setHovered((current) => current === index ? null : current);
            if (!drag.current) feedback("idle");
          }}
          onPointerDown={(event) => {
            if (phase === "spread") {
              event.stopPropagation();
              return;
            }

            if (
              phase !== "cards" ||
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
            if (!drag.current || drag.current.id !== event.pointerId) return;
            event.stopPropagation();
            updateDrag(event);
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
              phase !== "spread" ||
              spread.current.elapsed < 0.96 ||
              event.delta > 8
            ) return;

            event.stopPropagation();
            onSelected(index);
          }}
        >
          <PortfolioCard
            index={index}
            highlighted={phase === "spread" && (hovered === index || selected === index)}
          />
        </group>
      ))}
    </group>
  );
}

function Scene({
  phase,
  timeline,
  open,
  finish,
  feedback,
  onActive,
  onViewed,
  onSpread,
  onSelected,
  selected,
  controls,
  reduced,
  cycle,
}) {
  const { viewport, size } = useThree();
  const packTexture = usePackTexture(PACK_FRONT_TEXTURE);
  const heightFraction = size.width < 600 ? 0.55 : 0.52;
  const sceneScale = Math.min(
    viewport.height * heightFraction / HEIGHT,
    viewport.width / 3.65
  );

  useFrame((_, delta) => {
    if (phase !== "opening") return;
    timeline.current = Math.min(
      OPEN_DURATION,
      timeline.current + Math.min(delta, 0.05)
    );
    if (timeline.current >= OPEN_DURATION) finish();
  });

  return (
    <>
      <ambientLight intensity={1.05} />
      <directionalLight position={[-3, 5, 6]} color="#f4ecff" intensity={2.8} />
      <directionalLight position={[4, 1, 5]} color="#becde3" intensity={1.25} />
      <directionalLight position={[0, -4, 3]} color="#d0abd1" intensity={0.55} />

      <group key={cycle} scale={sceneScale}>
        <CardStack
          phase={phase}
          timeline={timeline}
          sceneScale={sceneScale}
          feedback={feedback}
          onActive={onActive}
          onViewed={onViewed}
          onSpread={onSpread}
          onSelected={onSelected}
          selected={selected}
          controls={controls}
        />
        <BoosterPack
          phase={phase}
          timeline={timeline}
          open={open}
          feedback={feedback}
          reduced={reduced}
          packTexture={packTexture}
        />
      </group>
    </>
  );
}

export default function App() {
  const [phase, setPhase] = useState("sealed");
  const [cursor, setCursor] = useState("idle");
  const [active, setActive] = useState(0);
  const [viewed, setViewed] = useState(0);
  const [selected, setSelected] = useState(null);
  const [cycle, setCycle] = useState(0);
  const phaseRef = useRef("sealed");
  const timeline = useRef(0);
  const controls = useRef(null);
  const sceneElement = useRef(null);
  const reduced = useReducedMotion();

  const open = useCallback(() => {
    if (phaseRef.current !== "sealed") return;
    phaseRef.current = "opening";
    timeline.current = 0;
    setCursor("idle");
    setPhase("opening");
  }, []);

  const finish = useCallback(() => {
    if (phaseRef.current !== "opening") return;
    phaseRef.current = "cards";
    setPhase("cards");
  }, []);

  const expand = useCallback(() => {
    if (phaseRef.current !== "cards") return;
    phaseRef.current = "spread";
    setCursor("idle");
    setPhase("spread");
  }, []);

  const replay = useCallback(() => {
    phaseRef.current = "sealed";
    timeline.current = 0;
    controls.current = null;
    setCursor("idle");
    setActive(0);
    setViewed(0);
    setSelected(null);
    setCycle((value) => value + 1);
    setPhase("sealed");
  }, []);

  function onKeyDown(event) {
    if (event.target !== event.currentTarget) return;

    if (
      phaseRef.current === "sealed" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      open();
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;

      if (phaseRef.current === "cards") {
        event.preventDefault();
        controls.current?.(direction);
      } else if (phaseRef.current === "spread") {
        event.preventDefault();
        setSelected((value) => (
          value === null
            ? direction === 1 ? 0 : 4
            : clamp(value + direction, 0, 4)
        ));
      }
    }
  }

  const label = phase === "sealed"
    ? "Foil card pack. Press Enter or swipe to open the center seam."
    : phase === "opening"
      ? "The center seam is opening."
      : phase === "cards"
        ? `Card ${active + 1} of 5. Flick or use arrow keys. ${viewed} cards viewed.`
        : "Five project cards. Select a card or use arrow keys.";

  return (
    <main className={`experience cursor-${cursor}`} data-phase={phase}>
      <div className="backdrop" aria-hidden="true" />
      <div
        ref={sceneElement}
        className="scene"
        tabIndex={0}
        role="region"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        <Canvas
          eventSource={sceneElement}
          eventPrefix="client"
          camera={{ position: [0, 0, 7], fov: 25, near: 0.1, far: 30 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.setClearColor("#000000", 0);
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.1;
          }}
          fallback={
            <div className="fallback">
              Enable WebGL in your browser to open this pack.
            </div>
          }
        >
          <Scene
            phase={phase}
            timeline={timeline}
            open={open}
            finish={finish}
            feedback={setCursor}
            onActive={setActive}
            onViewed={setViewed}
            onSpread={expand}
            onSelected={setSelected}
            selected={selected}
            controls={controls}
            reduced={reduced}
            cycle={cycle}
          />
        </Canvas>
      </div>

      <div className="interface">
        <div className="status" aria-live="polite" aria-atomic="true">
          {phase === "sealed" && (
            <>
              <span className="micro-label">FIVE CARDS INSIDE</span>
              <button className="open-button" onClick={open}>
                Swipe or click the seam to open
              </button>
            </>
          )}

          {phase === "opening" && (
            <>
              <span className="micro-label">BREAKING THE SEAL</span>
              <span className="hint">A little discovery.</span>
            </>
          )}

          {phase === "cards" && (
            <>
              <span className="micro-label">
                0{active + 1} <span className="muted">/ 05</span>
              </span>
              <span className="hint">
                {active === 4
                  ? "Flick to reveal the full collection"
                  : "Flick through the cards"}
              </span>
            </>
          )}

          {phase === "spread" && (
            <>
              <span className="micro-label">
                {selected === null
                  ? "THE COMPLETE COLLECTION"
                  : `PROJECT 0${selected + 1} SELECTED`}
              </span>
              <span className="hint">Choose a card</span>
            </>
          )}
        </div>

        <div className={`collection-controls ${
          phase === "cards" || phase === "spread" ? "is-visible" : ""
        }`}>
          {phase === "spread" ? (
            <div className="project-selectors" aria-label="Select a project">
              {COLORS.map((color, index) => (
                <button
                  key={color}
                  className={`project-selector ${selected === index ? "is-selected" : ""}`}
                  style={{ "--card-color": color }}
                  aria-label={`Select project ${index + 1}`}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  0{index + 1}
                </button>
              ))}
            </div>
          ) : (
            <div className="dots" aria-hidden="true">
              {COLORS.map((color, index) => (
                <span
                  key={color}
                  className={`dot ${index === active ? "is-active" : ""}`}
                  style={{ "--card-color": color }}
                />
              ))}
            </div>
          )}

          <button
            className="replay-button"
            onClick={replay}
            disabled={phase !== "cards" && phase !== "spread"}
            tabIndex={phase === "cards" || phase === "spread" ? 0 : -1}
          >
            Open another pack <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </main>
  );
}