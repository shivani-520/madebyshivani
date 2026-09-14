import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import FoilPack, { FOIL_RELEASE_TIME } from "./components/FoilPack";
import "./index.css";

const PACK_FRONT_TEXTURE = "/images/textures/Foil-Front.png";

const CARD_IMAGES = [
  "/images/artwork/games.webp",
  "/images/artwork/pivotal.webp",
  "/images/artwork/vr configurator.webp",
  "/images/artwork/iceland.webp",
  "/images/artwork/rl-agents.webp",
  "/images/artwork/vr configurator.webp",
];

const PROJECTS = [
  {
    title: "Game & Personal Projects",
    image: CARD_IMAGES[0],
    description:
      "A selection of games I've developed during my studies and in my own time, highlighting my passion for creating engaging gameplay and interactive experiences.",
    tech: ["Unity", "C#", "Unreal Engine", "C++", "JavaScript", "WebGL"],
    category: "Interactive",
    rarity: "Rare",
    number: "001",
    year: "2026",
  },
  {
    title: "Pivotal CGI Website",
    image: CARD_IMAGES[1],
    description:
      "A browser-based interactive 3D gallery built for Pivotal CGI, an architectural visualisation studio. Users scroll through and explore a gallery on the home page. Built from scratch and delivered as a deployed project.",
    tech: ["React", "React Three Fiber", "HTML", "CSS", "Vite"],
    category: "Web Experience",
    rarity: "Edition",
    number: "002",
    year: "2026",
  },
  {
    title: "TG Jones Virtual Store",
    image: CARD_IMAGES[2],
    description:
      "A browser-based immersive virtual store built using panoramic imagery exported from Realsee.ai, based on the physical TG Jones store in Leeds.",
    tech: ["Three.js", "JavaScript", "HTML", "CSS", "WebGL"],
    category: "Experiment",
    rarity: "Rare",
    number: "003",
    year: "2026",
  },
  {
    title: "Iceland Interactive Fridge",
    image: CARD_IMAGES[3],
    description:
      "A real-time interactive 3D product visualiser built using three.js as a pitch demo for Iceland. Developed in close collaboration with graphic designers at UYR, the application renders a fully detailed fridge model with supplied artwork and animations that can be applied dynamically.",
    tech: ["Three.js", "Blender", "JavaScript", "HTML & CSS"],
    category: "Interface",
    rarity: "Edition",
    number: "004",
    year: "2026",
  },
  {
    title: "UAV Search & Rescue Simulation",
    image: CARD_IMAGES[4],
    description:
      "This MSc dissertation explored the use of multi-agent reinforcement learning to train autonomous UAVs to perform coordinated search-and-rescue missions in a simulated environment built in Unity using C# and Python.",
    tech: ["Unity", "C#", "Python", "Reinforcement Learning"],
    category: "Creative Code",
    rarity: "Special",
    number: "005",
    year: "2026",
  },
  {
    title: "Virtual Reality Configurator",
    image: CARD_IMAGES[5],
    description:
      "A modular VR configurator built in Unreal Engine, enabling real-time customisation of a 3D architectural environment. Users navigate the space in VR and dynamically swap materials and structural elements, with changes reflected instantly across the scene.",
    tech: ["Unreal Engine", "C++", "Blueprints"],
    category: "Creative Code",
    rarity: "Special",
    number: "006",
    year: "2026",
  },
];

const COLORS = [
  "#ad91e8",
  "#729fe6",
  "#e99697",
  "#83bea6",
  "#dec184",
  "#b9a3d8",
];

const CARD_COUNT = PROJECTS.length;
const getCardColor = (index) => COLORS[index % COLORS.length];
const STACK_ANGLES = [0, -0.8, 0.5, -0.4, 0.7];

const WIDTH = 1.8;
const HEIGHT = (WIDTH * 1920) / 1080;

const BODY_HEIGHT = (WIDTH * 603) / 369;
const BODY_Y = (BODY_HEIGHT - HEIGHT) / 2;

// Shift extraction as a unit so cards do not rise before foil detachment.
const OPEN_DURATION = 1.9 + (FOIL_RELEASE_TIME - 0.72);
const FRONT_Z = 0.05;
const CARD_FRONT_Z = 0.65;

const CARD_WIDTH = 1.52;
const CARD_HEIGHT = 2.13;
const CARD_STACK_DEPTH = 0.04;
const CARD_INITIAL_SCALE = 0.96;

const CARD_INSIDE_Y = -0.22;
const CARD_INSIDE_Z = -0.08;

const CARD_REVEAL_START = FOIL_RELEASE_TIME;
const CARD_PRELIFT_DURATION = 0.08;
const CARD_PRELIFT_DISTANCE = 0.06;

const CARD_RISE_START = CARD_REVEAL_START + CARD_PRELIFT_DURATION;
const CARD_RISE_DURATION = 0.48;

const CARD_PUSH_FORWARD_START = 1.26 + (FOIL_RELEASE_TIME - 0.72);
const CARD_PUSH_FORWARD_DURATION = 0.24;

const CARD_SETTLE_START =
  CARD_PUSH_FORWARD_START + CARD_PUSH_FORWARD_DURATION;
const CARD_SETTLE_DURATION = 0.38;

const CARD_OPENING_CLEARANCE = 0.06;

const CARD_MAX_HALF_HEIGHT = Math.max(
  ...STACK_ANGLES.map((degrees) => {
    const angle = THREE.MathUtils.degToRad(degrees);
    return (
      Math.abs(Math.cos(angle)) * CARD_HEIGHT / 2 +
      Math.abs(Math.sin(angle)) * CARD_WIDTH / 2
    );
  })
);

const PACK_OPENING_Y = BODY_Y + BODY_HEIGHT / 2;
const CARD_EXIT_Y =
  PACK_OPENING_Y + CARD_MAX_HALF_HEIGHT + CARD_OPENING_CLEARANCE;
const CARD_RISE_DISTANCE = CARD_EXIT_Y - CARD_INSIDE_Y;
const CARD_RETURN_Z = FRONT_Z + 0.08;

const CARD_REDUCED_REVEAL_START = 1.12;
const CARD_REDUCED_REVEAL_DURATION = 0.38;
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

function getCardRevealPose(time, reduced) {
  if (reduced) {
    const reveal = progress(
      time,
      CARD_REDUCED_REVEAL_START,
      CARD_REDUCED_REVEAL_DURATION
    );

    return {
      y: 0,
      z: THREE.MathUtils.lerp(CARD_INSIDE_Z, CARD_FRONT_Z, reveal),
      scale: THREE.MathUtils.lerp(CARD_INITIAL_SCALE, 1, reveal),
    };
  }

  const prelift = progress(
    time,
    CARD_REVEAL_START,
    CARD_PRELIFT_DURATION
  );
  const rise = progress(time, CARD_RISE_START, CARD_RISE_DURATION);
  const forward = progress(
    time,
    CARD_PUSH_FORWARD_START,
    CARD_PUSH_FORWARD_DURATION
  );
  const settle = progress(
    time,
    CARD_SETTLE_START,
    CARD_SETTLE_DURATION
  );

  const liftedY =
    CARD_INSIDE_Y +
    CARD_PRELIFT_DISTANCE * prelift +
    (CARD_RISE_DISTANCE - CARD_PRELIFT_DISTANCE) * rise;

  return {
    y: liftedY * (1 - settle),
    z: THREE.MathUtils.lerp(CARD_INSIDE_Z, CARD_FRONT_Z, forward),
    scale: THREE.MathUtils.lerp(CARD_INITIAL_SCALE, 1, forward),
  };
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

function usePackTextures() {
  const { gl } = useThree();
  const [assets, setAssets] = useState({ textures: null, error: null });

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    const pending = [];
    setAssets({ textures: null, error: null });

    const load = (url) => new Promise((resolve, reject) => {
      const texture = loader.load(url, (result) => {
        if (!active) {
          result.dispose();
          resolve(result);
          return;
        }

        try {
          result.colorSpace = THREE.SRGBColorSpace;
          result.wrapS = result.wrapT = THREE.ClampToEdgeWrapping;
          result.minFilter = THREE.LinearMipmapLinearFilter;
          result.magFilter = THREE.LinearFilter;
          result.generateMipmaps = true;
          result.anisotropy = gl.capabilities.getMaxAnisotropy();
          result.flipY = true;
          result.offset.set(0, 0);
          result.repeat.set(1, 1);
          result.needsUpdate = true;

          gl.initTexture(result);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, undefined, () => reject(new Error(`Could not load ${url}`)));

      pending.push(texture);
    });

    load(PACK_FRONT_TEXTURE).then((front) => {
      if (active) {
        setAssets({ textures: { front }, error: null });
      }
    }).catch((error) => {
      if (active) {
        setAssets({ textures: null, error: error.message });
      }
    });

    return () => {
      active = false;
      pending.forEach((texture) => texture.dispose());
    };
  }, [gl]);

  return assets;
}

function BoosterPack({
  phase,
  timeline,
  open,
  feedback,
  reduced,
  textures,
  tearGesture,
}) {
  return (
    <FoilPack
      texture={textures.front}
      width={WIDTH}
      height={HEIGHT}
      openingY={PACK_OPENING_Y}
      frontZ={FRONT_Z}
      phase={phase}
      timeline={timeline}
      reduced={reduced}
      tearGesture={tearGesture}
      onTearComplete={() => open(true)}
      feedback={feedback}
    />
  );
}

function PortfolioCard({ index, highlighted }) {
  const project = PROJECTS[index];
  const [failedImage, setFailedImage] = useState(null);
  const imageFailed = failedImage === project.image;

  return (
    <group>
      <mesh>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial
          color={getCardColor(index)}
          metalness={0.15}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0, -0.006]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial
          color="#211c2b"
          metalness={0.1}
          roughness={0.6}
          side={THREE.BackSide}
        />
      </mesh>

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
          style={{ "--card-color": getCardColor(index) }}
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
              <span>
                {project.number} / {String(CARD_COUNT).padStart(3, "0")}
              </span>
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
  reduced,
}) {
  const nodes = useRef([]);
  const order = useRef(PROJECTS.map((_, index) => index));
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
  const rowScale = Math.min(
    1,
    availableWidth / (1.52 + rowStep * Math.max(CARD_COUNT - 1, 0))
  );
  const centerIndex = (CARD_COUNT - 1) / 2;

  const throwCard = useCallback((direction) => {
    if (phase !== "cards" || flight.current || drag.current) return;

    flight.current = {
      id: order.current[0],
      direction,
      elapsed: 0,
      committed: false,
      final: viewedCards.current.size === CARD_COUNT - 1,
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
          node.rotation.y = damp(node.rotation.y, 0, 14, dt);
          node.rotation.z = damp(node.rotation.z, 0, 14, dt);
          node.scale.setScalar(damp(node.scale.x, targetScale, 14, dt));
        }
      });

      return;
    }

    const reveal = phase !== "cards"
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
            if (phase !== "sealed" && !drag.current) feedback("idle");
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
            highlighted={
              phase === "spread" &&
              (hovered === index || selected === index)
            }
          />
        </group>
      ))}
    </group>
  );
}

const COLLAGE_IMAGES = [
  "/images/stickers/me.png",
  "/images/stickers/xbox-controller.webp",
  "/images/stickers/vibe.png",
  "/images/stickers/BLUEWIN.png",
  "/images/stickers/friends.png",
  "/images/stickers/tennis-racket.webp",
  "/images/stickers/tennis-ball.webp",
  "/images/stickers//graduation-cap.png",
];

const COLLAGE_ITEMS = [
  { image: COLLAGE_IMAGES[0], x: 18,  y: 7,  size: 110, rotate: -10 },
  { image: COLLAGE_IMAGES[1], x: 35, y: 10,  size: 90,  rotate: 7 },
  { image: COLLAGE_IMAGES[2], x: 66, y: 15,  size: 250, rotate: 10 },
  { image: COLLAGE_IMAGES[3], x: 81, y: 27, size: 100, rotate: -8 },
  { image: COLLAGE_IMAGES[4], x: 18,  y: 68, size: 250, rotate: 8 },
  { image: COLLAGE_IMAGES[5], x: 38, y: 88, size: 150,  rotate: -6 },
  { image: COLLAGE_IMAGES[6], x: 41, y: 83, size: 50, rotate: 7 },
  { image: COLLAGE_IMAGES[7], x: 81, y: 69, size: 140,  rotate: -5 },
];

function CollageBackdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      {COLLAGE_ITEMS.map((item, index) => (
        <img
          key={index}
          className="collage-sticker"
          src={item.image}
          alt=""
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.size}px`,
            transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
          }}
        />
      ))}
    </div>
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
  onAssetsChange,
  tearGesture,
}) {
  const { viewport, size } = useThree();
  const { textures, error } = usePackTextures();
  const openingStarted = useRef(false);

  useEffect(() => {
    onAssetsChange(error ? "error" : textures ? "ready" : "loading");
  }, [textures, error, onAssetsChange]);

  const packRoot = useRef();
  const heightFraction = size.width < 600 ? 0.55 : 0.52;
  const sceneScale = Math.min(
    viewport.height * heightFraction / HEIGHT,
    viewport.width / 3.65
  );

  useFrame(({ pointer, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const sealed = phase === "sealed";

    // Keep the drag plane stable while a pointer owns the flap.
    if (packRoot.current && !tearGesture.current) {
      const idleY = sealed && !reduced
        ? Math.sin(clock.elapsedTime * 1.5) * 0.03
        : 0;

      packRoot.current.position.y = damp(
        packRoot.current.position.y,
        idleY,
        10,
        dt
      );

      packRoot.current.rotation.x = damp(
        packRoot.current.rotation.x,
        sealed && !reduced ? -pointer.y * radians(3) : 0,
        10,
        dt
      );
      packRoot.current.rotation.y = damp(
        packRoot.current.rotation.y,
        sealed && !reduced ? pointer.x * radians(5) : 0,
        10,
        dt
      );
      packRoot.current.rotation.z = damp(
        packRoot.current.rotation.z,
        sealed && !reduced ? pointer.x * radians(0.5) : 0,
        10,
        dt
      );
    }

    if (phase !== "opening") {
      openingStarted.current = false;
      return;
    }

    if (!openingStarted.current) {
      openingStarted.current = true;
      return;
    }

    timeline.current = Math.min(
      OPEN_DURATION,
      timeline.current + dt
    );

    if (timeline.current >= OPEN_DURATION) finish();
  });

  return (
    <>
      <ambientLight intensity={1.05} />
      <directionalLight position={[-3, 5, 6]} color="#f4ecff" intensity={2.8} />
      <directionalLight position={[4, 1, 5]} color="#becde3" intensity={1.25} />
      <directionalLight position={[0, -4, 3]} color="#d0abd1" intensity={0.55} />

      {textures && (
        <group key={cycle} scale={sceneScale}>
          <group ref={packRoot}>
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
              reduced={reduced}
            />
            <BoosterPack
              phase={phase}
              timeline={timeline}
              open={open}
              feedback={feedback}
              reduced={reduced}
              textures={textures}
              tearGesture={tearGesture}
            />
          </group>
        </group>
      )}
    </>
  );
}

export default function App() {
  const [phase, setPhase] = useState("sealed");
  const [assetStatus, setAssetStatus] = useState("loading");
  const assetsReady = useRef(false);

  const onAssetsChange = useCallback((status) => {
    assetsReady.current = status === "ready";
    setAssetStatus(status);
  }, []);

  const [cursor, setCursor] = useState("idle");
  const [active, setActive] = useState(0);
  const [viewed, setViewed] = useState(0);
  const [selected, setSelected] = useState(null);
  const [cycle, setCycle] = useState(0);
  const phaseRef = useRef("sealed");
  const timeline = useRef(0);
  const tearGesture = useRef(null);
  const controls = useRef(null);
  const sceneElement = useRef(null);
  const reduced = useReducedMotion();

  const open = useCallback((manual = false) => {
    if (phaseRef.current !== "sealed" || !assetsReady.current) return;

    phaseRef.current = "opening";

    // Manual tearing already reached the release pose. Keyboard opening
    // starts the procedural automatic tear from the existing partial state.
    timeline.current = manual === true ? FOIL_RELEASE_TIME : 0;

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

    // Remount foil and cards. Foil cleanup releases any captured pointer;
    // its fresh refs, geometry, uniforms and transforms restore the seal.
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
            ? direction === 1 ? 0 : CARD_COUNT - 1
            : clamp(value + direction, 0, CARD_COUNT - 1)
        ));
      }
    }
  }

  const label = assetStatus !== "ready"
    ? assetStatus === "error"
      ? "Pack artwork could not load. Check the image files and reload the page."
      : "Loading pack artwork."
    : phase === "sealed"
      ? "Card pack. Grab the top foil strip and drag to tear it open. Release and grab again to continue a partial tear. Press Enter or Space to open automatically."
      : phase === "opening"
        ? "The pack is opening and the project cards are being revealed."
        : phase === "cards"
          ? `Card ${active + 1} of ${CARD_COUNT}. Flick or use arrow keys. ${viewed} cards viewed.`
          : `${CARD_COUNT} project cards. Select a card or use arrow keys.`;

  return (
    <main className={`experience cursor-${cursor}`} data-phase={phase}>
      <CollageBackdrop />

      <div
        ref={sceneElement}
        className="scene"
        style={{ touchAction: "none" }}
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
            onAssetsChange={onAssetsChange}
            tearGesture={tearGesture}
          />
        </Canvas>
      </div>

      <div className="interface">
        <button
          className="replay-button"
          onClick={replay}
          disabled={phase !== "cards" && phase !== "spread"}
          tabIndex={phase === "cards" || phase === "spread" ? 0 : -1}
        >
          Open another pack <span aria-hidden="true">↗</span>
        </button>
      </div>
    </main>
  );
}