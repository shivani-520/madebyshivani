import { useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PROJECTS, CARD_COUNT } from "../../data/projects";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_HTML_DISTANCE_FACTOR,
  getCardColor,
} from "../../constants/cards";

export default function PortfolioCard({ index, highlighted }) {
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