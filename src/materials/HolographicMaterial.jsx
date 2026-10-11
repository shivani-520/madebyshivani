import { useMemo } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    vPosition = p.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * p;
  }
`;
const fragmentShader = `
  uniform sampler2D uMap;
  uniform float uSeed;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  vec3 spectrum(float t) {
    return .5 + .5 * cos(6.283185 * (vec3(0.0, .33, .67) + t));
  }
  void main() {
    // Rounded silhouette and a foil frame, independent of image dimensions.
    vec2 q = abs(vUv - .5) - vec2(.469, .478);
    float rounded = length(max(q, 0.0)) + min(max(q.x,q.y),0.0) - .021;
    if (rounded > 0.0) discard;
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vPosition);
    vec3 R = reflect(-V, N);
    float edge = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y));
    float frame = 1.0 - smoothstep(.016,.027,edge);
    vec3 printColor = texture2D(uMap, clamp((vUv-.023)/.954,0.0,1.0)).rgb;
    printColor = mix(printColor, vec3(.39,.46,.5), frame);
    // Diffraction phase is tied to the reflected view ray, not a timer.
    float shift = R.x * 1.65 + R.y * .95;
    float diagonal = vUv.x*.82 + vUv.y*.48;
    float wave = diagonal * 2.9 + shift + uSeed;
    vec3 foil = spectrum(wave);
    float band = pow(max(0.0, cos((diagonal + shift*.8)*6.283185)), 9.0);
    float etch = pow(.5+.5*sin(vUv.x*340.0 + sin(vUv.y*110.0)*2.0),12.0);
    float facets = .5+.5*sin((vUv.x+vUv.y)*130.0 + shift*8.0);
    float protectedText = mix(.19, .58, smoothstep(.37,.50,vUv.y));
    float strength = mix(protectedText, .9, frame);
    vec3 color = printColor * (.91 + .09 * max(dot(N,V),0.0));
    color += foil * strength * (band*.5 + etch*.075 + facets*.035);
    // Two long studio softboxes: a narrow white specular and broad cool fill.
    float strip = pow(max(0.0, 1.0-abs(R.x+R.y*.32-.21)*1.5),26.0);
    float fill = pow(max(0.0,dot(R,normalize(vec3(-.6,.5,1.0)))),28.0);
    color += vec3(.83,.93,1.0) * strip * (.15 + frame*.65);
    color += vec3(.67,.79,.9)*fill*.12;
    color += spectrum(shift+.25)*pow(1.0-max(dot(N,V),0.0),2.0)*.25;
    gl_FragColor = vec4(color,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
export default function HolographicMaterial({ texture, seed = 0 }) {
  const uniforms = useMemo(
    () => ({ uMap: { value: texture }, uSeed: { value: seed } }),
    [texture, seed],
  );
  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      side={THREE.FrontSide}
    />
  );
}
