import { Text, useTexture } from "@react-three/drei";

export default function GalleryText({
  index,
  title,
  selected,
}) {
  const number = String(index + 1).padStart(2, "0");

  const arrowTexture = useTexture("/images/logos/arrow.png");

  return (
    <group position={[-1.25, 2.2, 0.1]}>
      {/* Number */}
      <Text
        font="/fonts/Montserrat-Regular.ttf"
        fontSize={0.12}
        color="rgba(255,255,255,0.5)"
        anchorX="left"
        anchorY="top"
      >
        {number}
      </Text>

      {/* Title */}
      <Text
        font="/fonts/Montserrat-Regular.ttf"
        position={[0, -0.25, 0]}
        fontSize={0.21}
        color="white" 
        anchorX="left"
        anchorY="top"
        maxWidth={2}
      >
        {title.toUpperCase()}
      </Text>

      {/* underline */}
      <mesh position={[0.15, -0.7, 0]}>
        <planeGeometry args={[0.25, 0.01]} />
        <meshBasicMaterial
          color="white"
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Bottom-right CTA */}
      <group position={[0, -4.3, 0]}>
        {/* Text */}
        <Text
          font="/fonts/Montserrat-Regular.ttf"
          fontSize={0.12}
          color="#cf9254"
          anchorX="left"
          anchorY="bottom"
        >
          VIEW PROJECTS
        </Text>

        {/* Arrow (simple inline icon) */}
        <mesh position={[1.3, 0.08, 0]}>
        <planeGeometry args={[0.25, 0.25]} />
        <meshBasicMaterial
            map={arrowTexture}
            transparent
            color="#cf9254"
        />
        </mesh>
      </group>
    </group>
  );
}