import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform vec2 uHoverUv;
    uniform float uHoverStrength;
    uniform float uScrollDistortion;
    uniform float uTime;

    varying vec2 vUv;
    varying float vDisp;

    void main() {
        vUv = uv;
        vec3 pos = position;

        //----------------------------------
        // Hover ripple
        //----------------------------------

        float dist = distance(uv, uHoverUv);
        float ripple = sin(dist * 14.0 - uTime * 4.5) * 0.5 + 0.5;
        float falloff = smoothstep(0.55, 0.0, dist);
        float bulge = falloff * uHoverStrength;

        float disp = bulge * (0.14 + ripple * 0.07);
        pos.z += disp;

        //----------------------------------
        // Scroll distortion
        //----------------------------------

        float wave = sin((uv.y - uTime * 0.6) * 6.0);

        // edge-weighted mask (prevents center bulge dominance)
        float edge = 1.0 - abs(uv.y - 0.5) * 2.0;
        edge = clamp(edge, 0.0, 1.0);

        float bend = wave * edge;

        // push the middle forward
        pos.z += bend * uScrollDistortion * 0.25;

        // stretch sideways slightly
        pos.x += (uv.x - 0.5) * bend * uScrollDistortion * 0.12;

        vDisp = disp + bend * uScrollDistortion;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform bool uUseTexture;
  uniform vec3 uColor;

  varying vec2 vUv;
  varying float vDisp;

  void main() {
    vec4 color;
    if (uUseTexture) {
      color = texture2D(uTexture, vUv);
    } else {
      color = vec4(uColor, 1.0);
    }

    // subtle rim brightening where the bulge peaks
    // color.rgb = mix(color.rgb, color.rgb * 1.4 + 0.05, vDisp * 3.0);

    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
`;

const CardDistortMaterial = shaderMaterial(
  {
    uTexture: null,
    uOpacity: 1,
    uHoverUv: new THREE.Vector2(0.5, 0.5),
    uHoverStrength: 0,
    uScrollDistortion: 0,
    uTime: 0,
    uUseTexture: true,
    uColor: new THREE.Color("#222222"),
    
  },
  vertexShader,
  fragmentShader
);

extend({ CardDistortMaterial });

export default CardDistortMaterial;