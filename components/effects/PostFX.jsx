import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";

export default function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.2}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
      />

      <Vignette
        eskil={false}
        offset={0.1}
        darkness={0.6}
      />
    </EffectComposer>
  );
}