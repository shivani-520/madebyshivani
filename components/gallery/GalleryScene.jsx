import { Environment, MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { RepeatWrapping } from "three";
import { useRef } from "react";

import GalleryRow from "./GalleryRow";
import ActiveSpotlight from "../lighting/ActiveSpotlight";
import PostFX from "../effects/PostFX";

export default function GalleryScene({
  selected,
  isMobile,
  isTransitioning,
  onNavigate
}) 
{
  const selectedRef = useRef();

  const floorTexture = useTexture(
    "/images/textures/tgzkdehv_4K_Albedo.jpg"
    );

    floorTexture.wrapS = floorTexture.wrapT = RepeatWrapping;
    floorTexture.repeat.set(50, 50);

  return (
    <>
      <Environment preset="night" />
      <color attach="background" args={["#101010"]} />
      <fog attach="fog" args={["#101010", 10, 20]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[200, 200]} />
        
        <MeshReflectorMaterial
          map={floorTexture}
          blur={[50, 20]}
          resolution={1024}
          mixBlur={0.5}
          mixStrength={1}
          roughness={1}
          metalness={0.5}
          color="rgb(80, 80, 80)"
        />
      </mesh>

      <mesh position={[0, -3, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[200, 0.15, 0.3]} />
        <meshStandardMaterial
          color="#222222"
          roughness={0.6}
          metalness={0.2}
        />
    </mesh>

    <mesh rotation={[0, 0, 0]} position={[0, -2.6, -0.5]}>
        <planeGeometry args={[200, 200]} />
        
        <MeshReflectorMaterial
          map={floorTexture}
          blur={[50, 20]}
          resolution={1024}
          mixBlur={0.5}
          mixStrength={1}
          roughness={1}
          metalness={0.2}
          color="rgb(80, 80, 80)"
        />
      </mesh>

      <GalleryRow
        selected={selected}
        isMobile={isMobile}
        isTransitioning={isTransitioning}
        onNavigate={onNavigate}
      />

      <ActiveSpotlight targetRef={selectedRef} />
      <PostFX />
    </>
  );
}