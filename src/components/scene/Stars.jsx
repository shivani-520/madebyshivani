import { Stars } from "@react-three/drei";

export default function StarsBackground() {
  return (
    <Stars
      radius={50}
      depth={30}
      count={1500}
      factor={3}
      saturation={0}
      fade
      speed={0.5}
    />
  );
}
