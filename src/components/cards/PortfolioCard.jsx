import { useMemo } from "react";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";

import { PROJECTS } from "../../data/projects";
import { CARD_HEIGHT } from "../../constants/cards";

PROJECTS.forEach((project) => {
  if (project.image) {
    useTexture.preload(project.image);
  }
});

function HolographicMaterial({ texture }) {
  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      map: texture,

      // Base card coating
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.2,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.holoStrength = { value: 0.3 };

      // --------------------------------------------------
      // VERTEX SHADER
      // --------------------------------------------------

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
        #include <common>

        varying vec3 vHoloWorldPosition;
        varying vec3 vHoloWorldNormal;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `
        #include <worldpos_vertex>

        vHoloWorldPosition = worldPosition.xyz;

        // World-space normal.
        // This rotates with the card.
        vHoloWorldNormal = normalize(
          mat3(modelMatrix) * objectNormal
        );
        `
      );

      // --------------------------------------------------
      // FRAGMENT SHADER
      // --------------------------------------------------

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
        #include <common>

        varying vec3 vHoloWorldPosition;
        varying vec3 vHoloWorldNormal;

        uniform float holoStrength;

        vec3 rainbow(float t) {
          vec3 color;

          color.r =
            0.5 +
            0.5 * cos(
              6.28318 * (t + 0.00)
            );

          color.g =
            0.5 +
            0.5 * cos(
              6.28318 * (t + 0.33)
            );

          color.b =
            0.5 +
            0.5 * cos(
              6.28318 * (t + 0.67)
            );

          return color;
        }
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        #include <map_fragment>

        // ------------------------------------------------
        // VIEW + REFLECTION
        // ------------------------------------------------

        vec3 N = normalize(vHoloWorldNormal);

        // Surface -> camera
        vec3 V = normalize(
          cameraPosition - vHoloWorldPosition
        );

        // Camera ray reflected off the card.
        //
        // This is the important part:
        // as the card rotates, this direction changes in
        // world space like an environment reflection.
        vec3 R = reflect(-V, N);


        // ------------------------------------------------
        // REFLECTION MOVEMENT
        // ------------------------------------------------

        // Project the reflected world direction onto a
        // diagonal direction.
        //
        // This means X/Y card tilt moves the rainbow
        // differently instead of only changing intensity.
        float reflectionShift =
            R.x * 0.85
          + R.y * 0.55
          + R.z * 0.15;


        // ------------------------------------------------
        // CARD-SPACE FOIL DIRECTION
        // ------------------------------------------------

        // Gives the holographic foil its diagonal shape.
        float diagonal =
            vMapUv.x * 0.75
          + vMapUv.y * 0.35;


        // ------------------------------------------------
        // RAINBOW POSITION
        // ------------------------------------------------

        // UV controls where the band exists on the card.
        //
        // Reflection direction controls where it MOVES
        // when the card is tilted.
        float bandPosition =
            diagonal * 0.40
          + reflectionShift * 2.0;

        vec3 holoColor =
          rainbow(bandPosition * 1.35);


        // ------------------------------------------------
        // MAIN REFLECTION BAND
        // ------------------------------------------------

        float sweep =
          fract(bandPosition * 0.70);

        float band =
          1.0 -
          smoothstep(
            0.08,
            0.34,
            abs(sweep - 0.5)
          );

        band = pow(band, 2.0);


        // ------------------------------------------------
        // SECONDARY FOIL DETAIL
        // ------------------------------------------------

        // Smaller interference pattern that also moves
        // with the reflected direction.
        float foil =
          sin(
              diagonal * 18.0
            + reflectionShift * 10.0
          );

        foil =
          foil * 0.5 + 0.5;

        foil =
          pow(foil, 3.0);


        // ------------------------------------------------
        // FRESNEL
        // ------------------------------------------------

        float facing =
          max(dot(N, V), 0.0);

        float fresnel =
          pow(
            1.0 - facing,
            1.6
          );


        // ------------------------------------------------
        // FINAL HOLOGRAPHIC STRENGTH
        // ------------------------------------------------

        float holo =
            band * 0.70
          + foil * 0.12
          + fresnel * 0.18;

        holo =
          clamp(holo, 0.0, 1.0);


        // ------------------------------------------------
        // APPLY RAINBOW
        // ------------------------------------------------

        vec3 rainbowReflection =
            holoColor
          * holo
          * holoStrength;

        // Screen blend.
        //
        // Keeps the original project artwork visible
        // instead of painting opaque rainbow over it.
        diffuseColor.rgb =
          1.0 -
          (1.0 - diffuseColor.rgb) *
          (1.0 - rainbowReflection);
        `
      );

      mat.userData.shader = shader;
    };

    mat.customProgramCacheKey = () =>
      "portfolio-holographic-card-v2";

    return mat;
  }, [texture]);

  return (
    <primitive
      object={material}
      attach="material"
    />
  );
}

export default function PortfolioCard({ index, highlighted }) {
  const project = PROJECTS[index];
  const texture = useTexture(project.image);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const [width, height] = useMemo(() => {
    const image = texture.image;

    if (!image?.width || !image?.height) {
      return [1, CARD_HEIGHT];
    }

    const aspect = image.width / image.height;

    return [CARD_HEIGHT * aspect, CARD_HEIGHT];
  }, [texture]);

  return (
    <group>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[width, height]} />

        <HolographicMaterial texture={texture} />
      </mesh>
      
      {project.url && (
      <Html
        transform
        center
        occlude
        position={[0, -height / 2 + 0.2, 0.02]}
        scale={0.2}
        style={{ pointerEvents: "auto" }}
      >
        <a
          className="project-button"
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Project
        </a>
      </Html>
    )}

    {/* <Html
  transform
  sprite={false}
  position={[0, 0, 0.01]}
  scale={CARD_HTML_SCALE}
  zIndexRange={[16777271, 0]}
  wrapperClass="project-card-html"
  className="project-card-anchor"
  style={{
    width: CARD_HTML_WIDTH,
    height: CARD_HTML_HEIGHT,
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
    pointerEvents: "none",
    position: "absolute",
    left: -CARD_HTML_WIDTH / 2,
    top: -CARD_HTML_HEIGHT / 2,
  }}
>
  <article
    className={`project-card ${highlighted ? "is-highlighted" : ""}`}
    style={{
      "--card-color": getCardColor(index),
      width: "100%",
      height: "100%",
    }}
    aria-label={`${project.title}, project ${project.number}`}
    data-has-link={showLink ? "true" : undefined}
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
      </div>

      <div className="project-card__meta">
        <span className="project-card__category">
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

      <div
        className="project-card__tech"
        aria-label="Technology stack"
      >
        {project.tech.map((technology) => (
          <span
            className="project-card__tech-item"
            key={technology}
          >
            {technology}
          </span>
        ))}
      </div>

      {showLink && (
        <a
          className="project-card__link"
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${project.title} project (opens in a new tab)`}
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          View Project
        </a>
      )}

      <footer className="project-card__footer">
        <span>PORTFOLIO SERIES · {project.year}</span>
        <span>
          {project.number} / {String(CARD_COUNT).padStart(3, "0")}
        </span>
      </footer>
    </div>

    <div className="project-card__shine" aria-hidden="true" />
  </article>
</Html> */}
    </group>
  );
}