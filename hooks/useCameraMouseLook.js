import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export default function useCameraMouseLook({
  intensity = 1,
  smoothness = 0.08,
}) {
  const { camera } = useThree();

  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;

      target.current.x = x;
      target.current.y = y;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    // smooth inertia (lerp)
    current.current.x += (target.current.x - current.current.x) * smoothness;
    current.current.y += (target.current.y - current.current.y) * smoothness;

    // apply subtle rotation
    camera.rotation.y = -current.current.x * intensity * 0.3;
    //camera.rotation.x = -current.current.y * intensity * 0.2;
  });
}