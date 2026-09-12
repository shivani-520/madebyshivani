import {
  Suspense,
  useEffect,
  useRef,
  useMemo,
} from "react";

import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";

import {
  Text,
  useTexture,
} from "@react-three/drei";

import * as THREE from "three";

import { ScreenLiquify } from "./liquify";
import "./index.css";

/* ============================================================
   PROJECTS
============================================================ */

const projects = [
  {
    title: "PROJECT 01",
    image: "/images/artwork/games.png",
  },
  {
    title: "PROJECT 02",
    image: "/images/artwork/iceland.png",
  },
  {
    title: "PROJECT 03",
    image: "/images/artwork/pivotal.png",
  },
  {
    title: "PROJECT 04",
    image: "/images/artwork/tg-jones.png",
  },
  {
    title: "PROJECT 05",
    image: "/images/artwork/vr configurator.png",
  },
  {
    title: "PROJECT 06",
    image: "/images/artwork/rl-agents.png",
  },
  {
    title: "PROJECT 07",
    image: "/images/artwork/The_Farmhouse_Kitchen_CGI_008B.png",
  },
];

/* ============================================================
   HEADING
============================================================ */

function HeroHeading() {
  return (
    <Suspense fallback={null}>
      <Text
        position={[0, 0, -2.25]}
        font="/fonts/zarathustra-v01.otf"
        fontSize={1.65}
        color="#73362A"

        outlineWidth={0.05}
        outlineColor="#fff"
        outlineOpacity={0}

        anchorX="center"
        anchorY="middle"
        textAlign="center"
        material-depthWrite={false}
      >
        Creative Developer
      </Text>
    </Suspense>
  );
}

/* ============================================================
   PROJECT PLANE
============================================================ */

function ProjectPlane({
  project,
  index,
  planes,
  labels,
}) {
  const texture = useTexture(project.image);

  const gl = useThree((state) => state.gl);

  useEffect(() => {
    if (!texture) return;

    /*
     * Keep the image in the correct colour space.
     */
    texture.colorSpace = THREE.SRGBColorSpace;

    /*
     * Prevent edge repetition.
     */
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    /*
     * High-quality texture sampling.
     *
     * LinearFilter keeps the image clean at its native / enlarged
     * scale, while LinearMipmapLinearFilter gives us good sampling
     * as cards move backwards in 3D.
     */
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    /*
     * Generate mipmaps for project cards as they recede into depth.
     */
    texture.generateMipmaps = true;

    /*
     * Anisotropic filtering is especially important here because
     * the project planes rotate in 3D.
     *
     * Using the GPU's maximum supported level keeps the images
     * considerably sharper when viewed at an angle.
     */
    const maxAnisotropy =
      gl.capabilities.getMaxAnisotropy();

    texture.anisotropy = maxAnisotropy;

    texture.needsUpdate = true;
  }, [texture, gl]);

  return (
    <mesh
      ref={(mesh) => {
        planes.current[index] = mesh;
      }}
    >
      <planeGeometry args={[5.4, 3]} />

      <meshBasicMaterial
        map={texture}
        transparent
        opacity={1}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ============================================================
   CAROUSEL
============================================================ */

function Carousel({ container }) {
  const planes = useRef([]);
  const labels = useRef([]);

  const target = useRef(0);
  const current = useRef(0);
  const reduced = useRef(false);

  const count = projects.length;

  useEffect(() => {
    const element = container.current;

    if (!element) return;

    const media = matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const policy = () => {
      reduced.current = media.matches;
    };

    const wheel = (event) => {
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? element.clientHeight
            : 1;

      target.current +=
        event.deltaY * unit * 0.0017;
    };

    policy();

    element.addEventListener("wheel", wheel, {
      passive: true,
    });

    media.addEventListener("change", policy);

    return () => {
      element.removeEventListener("wheel", wheel);
      media.removeEventListener("change", policy);
    };
  }, [container]);

  useFrame((_, delta) => {
    current.current = reduced.current
      ? target.current
      : THREE.MathUtils.damp(
          current.current,
          target.current,
          5,
          delta,
        );

    const turns =
      Math.trunc(current.current / count) * count;

    current.current -= turns;
    target.current -= turns;

    planes.current.forEach((mesh, index) => {
      if (!mesh) return;

      const offset =
        THREE.MathUtils.euclideanModulo(
          index - current.current + count / 2,
          count,
        ) -
        count / 2;

      const distance = Math.abs(offset);

      mesh.position.set(
        0,
        -offset * 3.4,
        -distance * 1.1,
      );

      // mesh.rotation.set(
      //   -offset * 0.16,
      //   offset * 0.035,
      //   0,
      // );

      mesh.scale.setScalar(
        Math.max(
          0.58,
          1 - distance * 0.11,
        ),
      );

      const opacity = Math.max(
        0.08,
        1 - distance * 0.22,
      );

      if (mesh.material) {
        mesh.material.opacity = opacity;
      }

      const label = labels.current[index];

      if (label?.material) {
        label.material.opacity = opacity;
      }
    });
  });

  return (
    <group rotation={[0, 0, 0]} position={[0, 0, 0]}>
      {projects.map((project, index) => (
        <ProjectPlane
          key={project.title}
          project={project}
          index={index}
          planes={planes}
          labels={labels}
        />
      ))}
    </group>
  );
}

/* ============================================================
   SCREEN CONTENT
============================================================ */

function ScreenContent({ container }) {
  return (
    <>
      <HeroHeading />

      <Suspense fallback={null}>
        <Carousel container={container} />
      </Suspense>
    </>
  );
}

/* ============================================================
   SMOKE
============================================================ */

function Smoke() {
  const materialRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.8 },

      uColor: {
        value: new THREE.Color("#DE838D"),
      },
    }),
    [],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value =
        state.clock.elapsedTime;
    }
  });

  return (
    <mesh
      position={[0, 0, -1.5]}
      renderOrder={-1}
      frustumCulled={false}
    >
      <planeGeometry args={[20, 12]} />

      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        blending={THREE.NormalBlending}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          precision highp float;

          varying vec2 vUv;

          uniform float uTime;
          uniform float uOpacity;
          uniform vec3 uColor;

          float hash(vec2 p) {
            p = fract(
              p * vec2(123.34, 456.21)
            );

            p += dot(
              p,
              p + 45.32
            );

            return fract(p.x * p.y);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);

            f =
              f *
              f *
              (3.0 - 2.0 * f);

            float a = hash(i);

            float b = hash(
              i + vec2(1.0, 0.0)
            );

            float c = hash(
              i + vec2(0.0, 1.0)
            );

            float d = hash(
              i + vec2(1.0, 1.0)
            );

            return mix(
              mix(a, b, f.x),
              mix(c, d, f.x),
              f.y
            );
          }

          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;

            for (int i = 0; i < 5; i++) {
              value +=
                amplitude * noise(p);

              p =
                p * 2.03 +
                vec2(17.1, 9.2);

              amplitude *= 0.5;
            }

            return value;
          }

          void main() {
            vec2 uv = vUv;

            vec2 p =
              uv * vec2(3.0, 2.0);

            float t =
              uTime * 0.08;

            float n1 = fbm(
              p +
              vec2(t, -t * 0.45)
            );

            float n2 = fbm(
              p * 1.7 +
              vec2(
                -t * 0.55,
                t * 0.3
              ) +
              n1 * 1.15
            );

            float smoke =
              smoothstep(
                0.48,
                0.78,
                n1 * 0.65 +
                n2 * 0.55
              );

            smoke *= 0.7;

            float edgeFade =
                smoothstep(
                  0.0,
                  0.15,
                  uv.x
                )
              * smoothstep(
                  0.0,
                  0.15,
                  1.0 - uv.x
                )
              * smoothstep(
                  0.0,
                  0.15,
                  uv.y
                )
              * smoothstep(
                  0.0,
                  0.15,
                  1.0 - uv.y
                );

            float distanceY =
              abs(uv.y - 0.42);

            float vertical =
              1.0 -
              smoothstep(
                0.15,
                0.65,
                distanceY
              );

            float alpha =
              smoke *
              edgeFade *
              vertical *
              uOpacity;

            alpha = pow(alpha, 0.7);
            alpha *= 1.4;

            gl_FragColor =
              vec4(
                uColor,
                alpha
              );
          }
        `}
      />
    </mesh>
  );
}

function CursorSquare({ container }) {
  const square = useRef(null);

  const position = useRef({
    x: 0,
    y: 0,
  });

  const target = useRef({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const element = container.current;
    const cursor = square.current;

    if (!element || !cursor) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const coarsePointer = window.matchMedia(
      "(pointer: coarse)",
    );

    if (reducedMotion.matches || coarsePointer.matches) {
      return;
    }

    let frame;

    const onPointerMove = (event) => {
      const rect = element.getBoundingClientRect();

      target.current.x =
        event.clientX - rect.left;

      target.current.y =
        event.clientY - rect.top;

      cursor.classList.add("cursor-square--visible");
    };

    const onPointerLeave = () => {
      cursor.classList.remove("cursor-square--visible");
    };

    const animate = () => {
      // Smaller value = more delay / softness.
      // Try 0.08 → 0.2.
      const followSpeed = 0.11;

      position.current.x +=
        (target.current.x - position.current.x) *
        followSpeed;

      position.current.y +=
        (target.current.y - position.current.y) *
        followSpeed;

      cursor.style.transform = `
        translate3d(
          ${position.current.x}px,
          ${position.current.y}px,
          0
        )
        translate(-50%, -50%)
      `;

      frame = requestAnimationFrame(animate);
    };

    element.addEventListener(
      "pointermove",
      onPointerMove,
    );

    element.addEventListener(
      "pointerleave",
      onPointerLeave,
    );

    frame = requestAnimationFrame(animate);

    return () => {
      element.removeEventListener(
        "pointermove",
        onPointerMove,
      );

      element.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );

      cancelAnimationFrame(frame);
    };
  }, [container]);

  return (
    <div
      ref={square}
      className="cursor-square"
      aria-hidden="true"
    />
  );
}

/* ============================================================
   APP
============================================================ */

export default function App() {
  const app = useRef(null);

  return (
    <div
      className="app"
      ref={app}
    >
      <div
        className="carousel-canvas"
        aria-hidden="true"
      >
        <Canvas
          camera={{
            position: [0, 0, 8],
            fov: 42,
          }}
          gl={{
            alpha: false,
            antialias: true,
            premultipliedAlpha: false,
            powerPreference: "high-performance",
          }}
          dpr={[1, 3]}
        >
          <color
            attach="background"
            args={["#F3E0BE"]}
          />

          <ScreenContent container={app} />
          <ScreenLiquify container={app} />
          <Smoke />
        </Canvas>
      </div>

      <CursorSquare container={app} />

      <ul
        className="sr-only"
        aria-label="Projects"
      >
        {projects.map((project) => (
          <li key={project.title}>
            {project.title}
          </li>
        ))}
      </ul>
    </div>
  );
}