import * as THREE from "three";
import { useEffect, useState } from "react";
import { PROJECTS } from "../../data/projects";
import { CARD_HEIGHT, CARD_WIDTH } from "../../constants/cards";
import { makeCardArtwork, textureFrom } from "../../utils/artwork";
import HolographicMaterial from "../../materials/HolographicMaterial";

export default function PortfolioCard({ index }) {
  const project = PROJECTS[index];
  const [maps, setMaps] = useState(null);
  useEffect(() => {
    let active = true;
    const front = textureFrom(makeCardArtwork(project, index));
    const back = textureFrom(makeCardArtwork(project, index, true));
    setMaps({ front, back });
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      // Preserve the entire supplied card image, with no cropping.
      const c = document.createElement("canvas");
      c.width = 768;
      c.height = 1080;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#101923";
      ctx.fillRect(0, 0, 768, 1080);
      const scale = Math.min(768 / image.width, 1080 / image.height);
      const w = image.width * scale,
        h = image.height * scale;
      ctx.drawImage(image, (768 - w) / 2, (1080 - h) / 2, w, h);
      front.image = c;
      front.needsUpdate = true;
    };
    image.onerror = () => {}; // Real project title/metadata remain visible.
    image.src = project.image;
    return () => {
      active = false;
      image.onload = image.onerror = null;
      front.dispose();
      back.dispose();
    };
  }, [project, index]);

  if (!maps) return null;
  return (
    <group>
      <mesh>
        <boxGeometry args={[CARD_WIDTH - 0.04, CARD_HEIGHT - 0.04, 0.018]} />
        <meshStandardMaterial
          color="#95a7ae"
          metalness={0.8}
          roughness={0.28}
        />
      </mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <HolographicMaterial texture={maps.front} seed={index * 0.13} />
      </mesh>
      <mesh position={[0, 0, -0.011]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <HolographicMaterial texture={maps.back} seed={index * 0.13} />
      </mesh>
    </group>
  );
}
