import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";

export default function GalleryFrame({
  texture,
  selected,
  width,
  height,
}) {
  const [hovered, setHovered] = useState(false);
  const imageMaterial = useRef();

  // grayscale amount: 1 = B&W, 0 = full color
  const grayscale = useRef(1);

  useFrame((_, delta) => {
    const targetZoom = hovered ? 0.92 : 1;

    texture.repeat.x = THREE.MathUtils.lerp(
      texture.repeat.x,
      targetZoom,
      delta * 8
    );

    texture.repeat.y = THREE.MathUtils.lerp(
      texture.repeat.y,
      targetZoom,
      delta * 8
    );

    // keep image centered
    texture.offset.x = (1 - texture.repeat.x) / 2;
    texture.offset.y = (1 - texture.repeat.y) / 2;
    

    // animate grayscale
    const targetGray = hovered || selected ? 0 : 0.7;
    grayscale.current = THREE.MathUtils.lerp(
      grayscale.current,
      targetGray,
      delta * 6
    );

    if (imageMaterial.current?.userData.shader) {
      imageMaterial.current.userData.shader.uniforms.uGrayscale.value =
        grayscale.current;
    }
  });

  return (
    <group>
      {/* Outer glow border — flat plane, slightly larger than image */}
      <mesh position={[0, 0, 0.079]}>
        <planeGeometry args={[width + 0.01, height + 0.01]} />
        <meshStandardMaterial
          color="#000"
          emissive="#cf9254"
          emissiveIntensity={selected ? 3.5 : 1.2}
          roughness={0.3}
          metalness={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Image */}
      <mesh
        position={[0, 0, 0.081]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <planeGeometry args={[width * 0.995, height * 0.995]} />
        <meshStandardMaterial
          ref={imageMaterial}
          roughness={1}
          metalness={0}
          map={texture}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.uniforms.uGrayscale = { value: 1 };
            shader.fragmentShader = `uniform float uGrayscale;\n` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <dithering_fragment>",
              `
              vec3 gray = vec3(dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)));
              gl_FragColor.rgb = mix(gl_FragColor.rgb, gray, uGrayscale);
              #include <dithering_fragment>
              `
            );
            imageMaterial.current.userData.shader = shader;
          }}
        />
      </mesh>
    </group>
  );
}