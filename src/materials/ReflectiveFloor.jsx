import { MeshReflectorMaterial } from "@react-three/drei";

export default function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2 + 0.1, 0, 0]} position={[0, -1.8, 0]}>
      <planeGeometry args={[200, 200]} />

      <MeshReflectorMaterial
        resolution={1024}
        color="#b6cacf"
        metalness={0}
        roughness={0.5}
        mirror={0.3}
        mixStrength={2}
        mixBlur={0.15}
        blur={[300, 100]}
        depthScale={0}
      />
    </mesh>
  );
}
