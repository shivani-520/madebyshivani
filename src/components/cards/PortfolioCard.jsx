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
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshPhysicalMaterial
          map={texture}
          color="#ffffff"
          roughness={0.32}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.16}
          envMapIntensity={0.35}
          ior={1.5}
        />
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