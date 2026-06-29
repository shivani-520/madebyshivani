import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export default function ActiveSpotlight({
  targetRef,
}) {
  const light = useRef();

  useFrame(() => {
    if (!targetRef.current || !light.current) return;

    const x = targetRef.current.position.x;

    light.current.position.x +=
      (x - light.current.position.x) * 0.08;

    light.current.target.position.x =
      light.current.position.x;

    light.current.target.updateMatrixWorld();
  });

  return (
    <spotLight
      ref={light}
      position={[0, 11, 3]}
      angle={0.2}
      penumbra={0.5}
      intensity={300}
      color="#D7B091"
      castShadow
    />
  );
}