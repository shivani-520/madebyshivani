import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function TwinklingStars({ count = 180 }) {
  const stars = useRef();

  const { positions, phases, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = -3;

      phases[i] = Math.random() * Math.PI * 2;
      sizes[i] = Math.random() * 0.5 + 0.5;
    }

    return { positions, phases, sizes };
  }, [count]);

  useFrame(({ clock }) => {
    if (!stars.current) return;

    const time = clock.elapsedTime;
    const material = stars.current.material;

    // Gentle overall shimmer
    material.opacity = 0.85 + Math.sin(time * 1.2) * 0.15;
    // Very subtle movement
    stars.current.rotation.z = Math.sin(time * 0.1) * 0.005;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    return geo;
  }, [positions]);

  return (
    <points ref={stars} geometry={geometry}>
      <pointsMaterial
        color="#ffffff"
        size={0.045}
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
