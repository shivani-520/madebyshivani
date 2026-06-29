import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useRef } from "react";
import GalleryFrame from "./GalleryFrame";
import { galleryItems } from "../../constants/galleryData";
import GalleryText from "./GalleryText";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";

export default function GalleryRow({
  selected,
  isMobile,
  isTransitioning,
  onNavigate
}) {
  const refs = useRef([]);
  const initialized = useRef(false);

  const textures = useTexture(galleryItems.map((item) => item.image));
  const navigate = useNavigate();

  const introTime = useRef(0);
  const introDone = useRef(false);

  // texture setup
  textures.forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 16;
  });

  useFrame((state, delta) => {
    introTime.current += delta;

    // mark intro done after ~2 seconds
    if (!introDone.current && introTime.current > 2) {
      introDone.current = true;
    }

    // ===== INITIAL SETUP =====
    if (!initialized.current) {
      refs.current.forEach((mesh, i) => {
        if (!mesh) return;

        // start ABOVE final position, but keep correct X spacing
        mesh.position.set(
          (i - selected) * 3.5,
          8,
          0
        );
      });

      initialized.current = true;
    }

    const transitioning = isTransitioning;

    // ===== UPDATE LOOP =====
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;

      // -------------------------
      // X / Z (always smooth, no intro conflict)
      // -------------------------
      const targetX = transitioning ? 0 : (i - selected) * 3.5;
      const targetZ = transitioning && i === selected ? 5 : 0;

      mesh.position.x += (targetX - mesh.position.x) * 0.08;
      mesh.position.z += (targetZ - mesh.position.z) * 0.06;

      // -------------------------
      // INTRO DROP (Y only)
      // -------------------------
      const delay = i * 0.2;
      const t = Math.max(0, introTime.current - delay);

      const progress = Math.min(t * 2, 1);
      const eased = progress * (2 - progress);

      const startY = 8;
      const finalY = i === selected ? 0.2 : 0;

      if (!introDone.current) {
        // drop animation
        mesh.position.y =
          startY + (finalY - startY) * eased;
      } else {
        // lock into place after intro
        mesh.position.y += (finalY - mesh.position.y) * 0.08;
      }

      // -------------------------
      // SCALE
      // -------------------------
      const targetScale =
        transitioning && i === selected ? 5 : 1;

      mesh.scale.lerp(
        new THREE.Vector3(
          targetScale,
          targetScale,
          targetScale
        ),
        0.05
      );
    });
  });

  const handleClick = (item) => {
    if (!item?.href) return;
    if (onNavigate) onNavigate(item.href);
  };

  return (
    <group
      position={[0, isMobile ? 0.8 : 0.2, 0]}
      scale={isMobile ? 0.9 : 1.1}
    >
      {galleryItems.map((item, i) => (
        <group
          key={item.id}
          ref={(el) => (refs.current[i] = el)}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(item);
          }}
        >
          <GalleryFrame
            texture={textures[i]}
            selected={i === selected}
            width={3}
            height={5}
          />

          <GalleryText
            index={i}
            title={item.title}
            selected={i === selected}
          />
        </group>
      ))}
    </group>
  );
}