import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// Geometry resolution.
const WIDTH_SEGMENTS = 112;
const BODY_ROWS = 48;
const FLAP_ROWS = 14;
const COLUMNS = WIDTH_SEGMENTS + 1;

const GRIP_PHASE_DURATION = 0.12;
const PRE_TEAR_PULL_DURATION = 0.12;
const TEAR_START_TIME = GRIP_PHASE_DURATION + PRE_TEAR_PULL_DURATION;
const TEAR_DURATION = 0.54;

export const FOIL_RELEASE_TIME = TEAR_START_TIME + TEAR_DURATION;

const RELEASE_TIME = FOIL_RELEASE_TIME;
const RELEASE_FOLLOW_THROUGH = 0.34;
const FLAP_FADE_START = 0.82;
const FLAP_FADE_DURATION = 0.24;
const PACK_ANIMATION_END = 1.12;

// Resting foil shape, in local world units.
const BODY_BULGE = 0.04;
const SEAL_WIDTH = 0.045;
const CRIMP_STRENGTH = 0.0006;
const CRIMP_SPACING = 0.045;
const REST_FOLD_STRENGTH = 0.0007;

// Geometry and force controls, in local world units.
const TEAR_EDGE_AMPLITUDE = 0.018;
const TEAR_EDGE_INSET = 0.045;
const GRIP_RADIUS = 0.19;
const GRIP_COMPRESSION = 0.045;
const GRIP_Z_PULL = 0.048;
const PACK_SHEAR = 0.014;
const WRINKLE_STRENGTH = 0.0035;
const RELEASE_RECOIL = 0.008;

const FLAP_CURL_LENGTH = 0.6;
const FLAP_CURL_STRENGTH = 1.05;
const FLAP_CREASE_STRENGTH = 0.16;
const FLAP_TWIST = 0.06;
const FLAP_LIFT = 0.035;

const FOLLOW_X = -0.18;
const FOLLOW_Y = 0.4;
const FOLLOW_Z = 0.08;
const FOIL_SHADING = 0.8;

const clamp = THREE.MathUtils.clamp;

function smooth(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function progress(time, start, duration) {
  return smooth((time - start) / duration);
}

function gaussian(value) {
  return Math.exp(-value * value);
}

function impulse(time, start, duration) {
  const t = clamp((time - start) / duration, 0, 1);
  return Math.sin(t * Math.PI * 2) * Math.exp(-4 * t);
}

// Keyboard/accessibility opening retains the original tear curve.
const TEAR_KEYS = [
  [0, 0, 0],
  [0.08, 0.055, 0.55],
  [0.22, 0.24, 1.25],
  [0.48, 0.55, 1.05],
  [0.72, 0.76, 0.65],
  [0.88, 0.93, 0.45],
  [0.97, 0.992, 0.35],
  [1, 1, 0],
];

function humanTearProgress(time) {
  const t = (time - TEAR_START_TIME) / TEAR_DURATION;

  if (t <= 0) return 0;
  if (t >= 1) return 1;

  for (let i = 1; i < TEAR_KEYS.length; i += 1) {
    const a = TEAR_KEYS[i - 1];
    const b = TEAR_KEYS[i];

    if (t <= b[0]) {
      const duration = b[0] - a[0];
      const s = (t - a[0]) / duration;
      const s2 = s * s;
      const s3 = s2 * s;

      return (
        (2 * s3 - 3 * s2 + 1) * a[1] +
        (s3 - 2 * s2 + s) * duration * a[2] +
        (-2 * s3 + 3 * s2) * b[1] +
        (s3 - s2) * duration * b[2]
      );
    }
  }

  return 1;
}

function tearY(u, baseY) {
  return baseY + TEAR_EDGE_AMPLITUDE * (
    0.55 * Math.sin(u * 11 + 0.3) +
    0.3 * Math.sin(u * 27 + 1.1) +
    0.15 * Math.sin(u * 61 + 0.7)
  );
}

const VERTEX_SHADER = `
  attribute float edgeDistance;
  uniform float uHintPull;
  uniform float uHintBase;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vReferenceNormal;
  varying vec3 vViewDirection;
  varying float vEdgeDistance;

  void main() {
    vUv = uv;
    vEdgeDistance = edgeDistance;
    vNormal = normalMatrix * normal;
    vReferenceNormal = normalMatrix * vec3(0.0, 0.0, 1.0);

    // Presentation only: pin the attached edge and flex the upper strip.
    // CPU geometry, raycasting, and the irreversible tear stay untouched.
    vec3 hintPosition = position;
    float freeEdge = smoothstep(0.0, 0.08, edgeDistance);
    float upperStrip = smoothstep(uHintBase, 1.0, uv.y);
    hintPosition.x += uHintPull * freeEdge * upperStrip;
    hintPosition.z += uHintPull * 0.18 * freeEdge * upperStrip;
    vec4 viewPosition = modelViewMatrix * vec4(hintPosition, 1.0);
    vViewDirection = -viewPosition.xyz;

    gl_Position = projectionMatrix * viewPosition;
  }
`;

const OUTPUT_COLOR_CHUNK = THREE.ShaderChunk.colorspace_fragment
  ? "#include <colorspace_fragment>"
  : "#include <encodings_fragment>";

const FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uFront;
  uniform float uShading;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vReferenceNormal;
  varying vec3 vViewDirection;
  varying float vEdgeDistance;

  void main() {
    vec4 artwork = texture2D(uMap, vUv);

    if (artwork.a < 0.005) discard;

    vec3 n = normalize(vNormal);
    vec3 referenceNormal = normalize(vReferenceNormal);
    vec3 viewDirection = normalize(vViewDirection);

    if (!gl_FrontFacing) {
      n = -n;
      referenceNormal = -referenceNormal;
    }

    // Main virtual light.
    vec3 lightDirection = normalize(vec3(-0.35, 0.55, 1.0));

    // Difference from the original flat foil lighting.
    // This means the printed artwork stays relatively unchanged until
    // the foil actually bends/wrinkles.
    float diffuse =
      dot(n, lightDirection) -
      dot(referenceNormal, lightDirection);

    // Sharp reflection on the deformed foil.
    float sharpSpecular = pow(
      max(
        dot(
          reflect(-lightDirection, n),
          viewDirection
        ),
        0.0
      ),
      60.0
    );

    // Equivalent reflection on the original flat surface.
    // Subtracting this prevents the whole unopened pack from
    // suddenly acquiring a giant permanent white highlight.
    float referenceSharpSpecular = pow(
      max(
        dot(
          reflect(-lightDirection, referenceNormal),
          viewDirection
        ),
        0.0
      ),
      60.0
    );

    // Broader metallic reflection.
    float broadSpecular = pow(
      max(
        dot(
          reflect(-lightDirection, n),
          viewDirection
        ),
        0.0
      ),
      8.0
    );

    float referenceBroadSpecular = pow(
      max(
        dot(
          reflect(-lightDirection, referenceNormal),
          viewDirection
        ),
        0.0
      ),
      8.0
    );

    // Fresnel:
    // surfaces facing away from the camera become more reflective.
    float fresnel = pow(
      1.0 - clamp(dot(n, viewDirection), 0.0, 1.0),
      3.0
    );

    // Reference Fresnel keeps the undeformed artwork visually stable.
    float referenceFresnel = pow(
      1.0 - clamp(
        dot(referenceNormal, viewDirection),
        0.0,
        1.0
      ),
      3.0
    );

    // Allow substantially more contrast than the original shader.
    float brightness = clamp(
      1.0 + uShading * (
        0.38 * diffuse +
        0.14 * (
          broadSpecular -
          referenceBroadSpecular
        )
      ),
      0.70,
      1.35
    );

    float exposed = smoothstep(
      0.0,
      0.025,
      uFront - vUv.x
    );

    float edge = (
      1.0 -
      smoothstep(
        0.0008,
        0.0035,
        vEdgeDistance
      )
    ) * exposed;

    // Start with the original printed artwork.
    vec3 printedColor = artwork.rgb * brightness;

    // Tight bright reflection.
    printedColor +=
      vec3(1.0) *
      max(
        0.0,
        sharpSpecular -
        referenceSharpSpecular
      ) *
      0.32 *
      uShading;

    // Wider cool metallic reflection.
    printedColor +=
      vec3(0.82, 0.86, 0.95) *
      max(
        0.0,
        broadSpecular -
        referenceBroadSpecular
      ) *
      0.10 *
      uShading;

    // Fresnel reflection around curled / angled foil.
    printedColor +=
      vec3(0.78, 0.84, 0.95) *
      max(
        0.0,
        fresnel -
        referenceFresnel
      ) *
      0.16 *
      uShading;

    // Very fine foil texture.
    // Kept deliberately subtle so it doesn't become glitter.
    float micro =
      sin(vUv.x * 310.0 + vUv.y * 170.0) *
      sin(vUv.y * 420.0 - vUv.x * 90.0);

    printedColor += vec3(micro * 0.008) * uShading;

    // Brighten the newly exposed torn edge.
    printedColor += vec3(0.025) * edge;

    gl_FragColor = vec4(
      printedColor,
      artwork.a * uOpacity
    );

    ${OUTPUT_COLOR_CHUNK}
  }
`;

function makeUniforms(texture) {
  return {
    uMap: { value: texture },
    uOpacity: { value: 1 },
    uFront: { value: 0 },
    uShading: { value: FOIL_SHADING },
    uHintPull: { value: 0 },
    uHintBase: { value: 0.9 },
    uHintShimmer: { value: 0 },
    uHintSweep: { value: -0.2 },
  };
}

// Both pieces sample the same pack-space surface, including their shared edge.
// Only Z changes: the artwork's XY coordinates and UVs remain untouched.
function restingZ(rig, x, y) {
  const nx = x / (rig.width * 0.5);
  const ny = y / rig.halfHeight;
  const dx = Math.max(0, rig.width * 0.5 - Math.abs(x));
  const dy = Math.max(0, rig.halfHeight - Math.abs(y));
  const seal = rig.sealWidth;

  // A flat sealed band meets a soft shoulder with zero slope at its start.
  const shoulderX = smooth((dx - seal) / rig.sealTransition);
  const shoulderY = smooth((dy - seal) / rig.sealTransition);
  const fullness =
    Math.pow(Math.max(0, 1 - nx * nx), 0.7) *
    Math.pow(Math.max(0, 1 - ny * ny), 0.7) *
    shoulderX * shoulderY;
  const asymmetry = 1 + 0.045 * nx - 0.03 * ny + 0.025 * nx * ny;

  // Broad, shallow tension marks; much quieter than the grip wrinkles.
  const folds = REST_FOLD_STRENGTH * fullness * (
    gaussian((nx + 0.48 * ny - 0.2) / 0.2) -
    0.7 * gaussian((nx - 0.36 * ny + 0.35) / 0.25)
  );

  // Crimps run across each seal. Phase/amplitude variation is deterministic,
  // and wavelengths respect the existing (nonuniform) grid's sampling limit.
  const horizontalSeal = 1 - smooth(dy / seal);
  const verticalSeal = (1 - smooth(dx / seal)) * (1 - horizontalSeal);
  const phaseX = 2 * Math.PI * x / rig.crimpSpacingX +
    0.23 * Math.sin(nx * 9 + 0.4);
  const phaseY = 2 * Math.PI * y / rig.crimpSpacingY +
    0.21 * Math.sin(ny * 8 - 0.6);
  const crimp = CRIMP_STRENGTH * (
    horizontalSeal * Math.sin(phaseX) * (0.88 + 0.12 * Math.sin(nx * 17)) +
    verticalSeal * Math.sin(phaseY) * (0.88 + 0.12 * Math.sin(ny * 13 + 0.8))
  );

  return BODY_BULGE * fullness * asymmetry + folds + crimp;
}

function buildPiece(geometry, rig, isFlap) {
  const rows = isFlap ? FLAP_ROWS : BODY_ROWS;
  const count = COLUMNS * (rows + 1);

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const edgeDistance = new Float32Array(count);
  const indices = new Uint16Array(WIDTH_SEGMENTS * rows * 6);

  const column = new Uint16Array(count);
  const pinch = new Float32Array(count * 3);
  const pull = new Float32Array(count);
  const anchor = new Float32Array(count);
  const upper = new Float32Array(count);
  const wrinkle = new Float32Array(count);
  const lip = new Float32Array(count);
  const corner = new Float32Array(count);

  let indexOffset = 0;

  for (let row = 0; row <= rows; row += 1) {
    const fraction = row / rows;
    const v = isFlap ? fraction : 1 - Math.pow(1 - fraction, 1.3);

    for (let col = 0; col < COLUMNS; col += 1) {
      const i = row * COLUMNS + col;
      const offset = i * 3;
      const x = rig.x[col];
      const edge = rig.edge[col];

      const y = isFlap
        ? edge + (rig.halfHeight - edge) * v
        : -rig.halfHeight + (edge + rig.halfHeight) * v;

      positions[offset] = x;
      positions[offset + 1] = y;
      column[i] = col;

      const restX = positions[offset];
      const restY = positions[offset + 1];

      positions[offset + 2] = restingZ(rig, restX, restY);

      uv[i * 2] = (restX + rig.width / 2) / rig.width;
      uv[i * 2 + 1] = (restY + rig.halfHeight) / rig.height;
      edgeDistance[i] = Math.abs(restY - edge);

      const pullDX = restX - rig.pullGripX;
      const pullDY = restY - rig.pullGripY;
      const holdDX = restX - rig.holdGripX;
      const holdDY = restY - rig.holdGripY;

      const pullWeight = Math.exp(
        -(pullDX * pullDX + pullDY * pullDY) /
        (2 * GRIP_RADIUS * GRIP_RADIUS)
      );

      const holdRadius = GRIP_RADIUS * 1.3;
      const holdWeight = Math.exp(
        -(holdDX * holdDX + holdDY * holdDY) /
        (2 * holdRadius * holdRadius)
      );

      pull[i] = pullWeight * (1 - holdWeight);
      anchor[i] = holdWeight;
      upper[i] = smooth((restY + 0.15) / (rig.halfHeight + 0.15));
      lip[i] = gaussian((restY - edge) / 0.095);

      pinch[offset] = -GRIP_COMPRESSION * (
        pullDX * pullWeight + holdDX * holdWeight
      );

      pinch[offset + 1] = -GRIP_COMPRESSION * 0.45 * (
        pullDY * pullWeight + holdDY * holdWeight
      );

      pinch[offset + 2] =
        -0.008 * pullWeight - 0.006 * holdWeight;

      wrinkle[i] = WRINKLE_STRENGTH * (
        pullWeight * Math.sin(74 * (pullDX + 0.42 * pullDY)) +
        0.65 * holdWeight * Math.sin(65 * (-0.6 * holdDX + holdDY))
      );

      corner[i] = 0.0025 * pullWeight * (
        Math.sin(92 * pullDX + 34 * pullDY) +
        0.4 * Math.sin(51 * pullDX - 71 * pullDY)
      );

      if (row < rows && col < WIDTH_SEGMENTS) {
        const a = i;
        const b = a + 1;
        const c = a + COLUMNS;
        const d = c + 1;

        indices[indexOffset++] = a;
        indices[indexOffset++] = b;
        indices[indexOffset++] = c;

        indices[indexOffset++] = b;
        indices[indexOffset++] = d;
        indices[indexOffset++] = c;
      }
    }
  }

  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const normalAttribute = new THREE.BufferAttribute(normals, 3);

  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  normalAttribute.setUsage(THREE.DynamicDrawUsage);

  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("normal", normalAttribute);
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute(
    "edgeDistance",
    new THREE.BufferAttribute(edgeDistance, 1)
  );
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  return {
    geometry,
    count,
    positions,
    normals,
    indices,
    rest: positions.slice(),
    column,
    pinch,
    pull,
    anchor,
    upper,
    wrinkle,
    lip,
    corner,
  };
}

function buildRig(
  bodyGeometry,
  flapGeometry,
  width,
  height,
  openingY
) {
  const rig = {
    width,
    height,
    halfHeight: height / 2,
    sealWidth: Math.min(SEAL_WIDTH, Math.min(width, height) * 0.08),
    sealTransition: Math.max(SEAL_WIDTH * 2, Math.min(width, height) * 0.06),
    crimpSpacingX: Math.max(CRIMP_SPACING, 4 * width / WIDTH_SEGMENTS),
    crimpSpacingY: CRIMP_SPACING,
    baseY: openingY - TEAR_EDGE_INSET,

    pullGripX: -width * 0.43,
    pullGripY: height / 2 - 0.09,
    holdGripX: width * 0.38,
    holdGripY: openingY - 0.31,

    x: new Float32Array(COLUMNS),
    edge: new Float32Array(COLUMNS),
    foldProfile: new Float32Array(COLUMNS),
    twistProfile: new Float32Array(COLUMNS),

    centerX: new Float64Array(COLUMNS),
    centerZ: new Float64Array(COLUMNS),
    bendX: new Float64Array(COLUMNS),
    bendY: new Float64Array(COLUMNS),
    bendZ: new Float64Array(COLUMNS),
    detached: new Float64Array(COLUMNS),
    lift: new Float64Array(COLUMNS),

    followX: 0,
    followY: 0,
    followZ: 0,
    grabU: 0,
    front: 0,
    frontX: -width / 2,
    grip: 0,
    load: 0,
    recoil: 0,
    tipForce: 0,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    foldStrength: 1,
    lastTime: -1,
    lastReduced: null,
    dirty: false,
    lastInteraction: {},
  };

  for (let col = 0; col < COLUMNS; col += 1) {
    const u = col / WIDTH_SEGMENTS;
    const distanceFromLeft = u * width;

    rig.x[col] = -width / 2 + distanceFromLeft;
    rig.edge[col] = tearY(u, rig.baseY);

    rig.foldProfile[col] = FLAP_CREASE_STRENGTH * (
      gaussian((distanceFromLeft - 0.17) / 0.075) -
      0.65 * gaussian((distanceFromLeft - 0.4) / 0.1)
    ) + 0.022 * Math.sin(distanceFromLeft * 21 + 0.5);

    rig.twistProfile[col] =
      0.65 + 0.35 * Math.sin(u * 6.2 + 0.4);
  }

  // Body rows are widest at the bottom; include flap rows for unusual cuts.
  const maxBodyStep = 1 - Math.pow(1 - 1 / BODY_ROWS, 1.3);
  let maxRowStep = 0;
  for (let col = 0; col < COLUMNS; col += 1) {
    maxRowStep = Math.max(
      maxRowStep,
      (rig.edge[col] + rig.halfHeight) * maxBodyStep,
      (rig.halfHeight - rig.edge[col]) / FLAP_ROWS
    );
  }
  rig.crimpSpacingY = Math.max(CRIMP_SPACING, 4 * maxRowStep);

  rig.body = buildPiece(bodyGeometry, rig, false);
  rig.flap = buildPiece(flapGeometry, rig, true);

  // Initial highlights must match the curved surface before the first frame.
  updateNormals(rig.body);
  updateNormals(rig.flap);
  weldAttachedNormals(rig);
  rig.body.restNormals = rig.body.normals.slice();
  rig.flap.restNormals = rig.flap.normals.slice();

  return rig;
}

function sampleFold(rig, distanceFromLeft) {
  const sample = clamp(
    distanceFromLeft / rig.width * WIDTH_SEGMENTS,
    0,
    WIDTH_SEGMENTS
  );

  const index = Math.min(WIDTH_SEGMENTS - 1, Math.floor(sample));
  const fraction = sample - index;

  return (
    rig.foldProfile[index] * (1 - fraction) +
    rig.foldProfile[index + 1] * fraction
  );
}

function bendAngle(rig, distance, detachedLength) {
  if (detachedLength <= 0) return 0;

  const along = distance / detachedLength;
  const curlStart = Math.max(0, detachedLength - FLAP_CURL_LENGTH);

  const curl = FLAP_CURL_STRENGTH * smooth(
    (distance - curlStart) / FLAP_CURL_LENGTH
  );

  const folds =
    sampleFold(rig, detachedLength - distance) *
    smooth(distance / 0.09) *
    smooth(detachedLength / 0.25);

  return rig.foldStrength * Math.max(
    0,
    curl + 0.12 * along * along + folds
  );
}

function updateFlapCenterline(rig) {
  const detachedLength = rig.width * rig.front;
  const frontX = rig.frontX;
  const HINGE_LENGTH = 0.11;
  const MIN_PEEL_LENGTH = 0.015;

  let curveX = frontX;
  let curveZ = 0;
  let previousDistance = 0;

  for (let col = WIDTH_SEGMENTS; col >= 0; col -= 1) {
    const x = rig.x[col];
    const distanceBehindFront = Math.max(0, frontX - x);

    if (
      x >= frontX ||
      distanceBehindFront <= MIN_PEEL_LENGTH ||
      detachedLength <= 0
    ) {
      rig.centerX[col] = x;
      rig.centerZ[col] = 0;
      rig.bendX[col] = 0;
      rig.bendY[col] = 1;
      rig.bendZ[col] = 0;
      rig.detached[col] = 0;
      rig.lift[col] = 0;
      continue;
    }

    const hinge = smooth(
      (distanceBehindFront - MIN_PEEL_LENGTH) / HINGE_LENGTH
    );

    const step = Math.max(0, distanceBehindFront - previousDistance);
    const midpointDistance =
      (distanceBehindFront + previousDistance) * 0.5;

    let midpointAngle = bendAngle(
      rig,
      midpointDistance,
      detachedLength
    );

    const midpointHinge = smooth(
      (midpointDistance - MIN_PEEL_LENGTH) / HINGE_LENGTH
    );

    midpointAngle *= midpointHinge;
    curveX -= Math.cos(midpointAngle) * step;
    curveZ += Math.sin(midpointAngle) * step;
    previousDistance = distanceBehindFront;

    let angle = bendAngle(rig, distanceBehindFront, detachedLength);
    angle *= hinge;

    const halfFlapHeight = (rig.halfHeight - rig.edge[col]) / 2;

    const clearance = Math.min(
      1,
      curveZ / Math.max(halfFlapHeight * FLAP_TWIST * 2, 0.000001)
    );

    const twist =
      FLAP_TWIST *
      hinge *
      smooth(distanceBehindFront / 0.18) *
      smooth(detachedLength / 0.4) *
      rig.twistProfile[col] *
      clearance;

    rig.bendX[col] = Math.sin(angle) * Math.sin(twist);
    rig.bendY[col] = Math.cos(twist);
    rig.bendZ[col] = Math.cos(angle) * Math.sin(twist);

    rig.centerX[col] = x + (curveX - x) * hinge;
    rig.centerZ[col] = curveZ * hinge;
    rig.detached[col] = hinge;

    const alongDetached = detachedLength > 0
      ? clamp(distanceBehindFront / detachedLength, 0, 1)
      : 0;

    rig.lift[col] =
      FLAP_LIFT *
      hinge *
      smooth(alongDetached) *
      smooth(detachedLength / 0.25);
  }
}

function deformPiece(piece, rig, isFlap) {
  const positions = piece.positions;
  const rest = piece.rest;

  for (let i = 0; i < piece.count; i += 1) {
    const offset = i * 3;
    const col = piece.column[i];
    const restX = rest[offset];
    const restY = rest[offset + 1];

    const upper = piece.upper[i];
    const anchored = piece.anchor[i];
    const freeUpper = upper * (1 - 0.94 * anchored);
    const pullWeight = piece.pull[i];
    const lip = piece.lip[i];

    const damaged = smooth((rig.frontX - restX) / 0.06);

    const nearFront =
      gaussian((restX - rig.frontX) / 0.1) *
      lip *
      rig.tipForce;

    let x =
      restX +
      piece.pinch[offset] * rig.grip +
      pullWeight * rig.targetX -
      PACK_SHEAR * freeUpper * rig.load +
      rig.recoil * freeUpper -
      0.003 * nearFront;

    let y =
      restY +
      piece.pinch[offset + 1] * rig.grip +
      pullWeight * rig.targetY +
      0.006 * freeUpper * rig.load -
      0.5 * rig.recoil * freeUpper +
      0.006 * nearFront -
      0.0035 * damaged * lip;

    // Interaction offsets build on the precomputed foil shape.
    let z =
      rest[offset + 2] +
      piece.pinch[offset + 2] * rig.grip +
      pullWeight * rig.targetZ +
      0.009 *
        freeUpper *
        Math.sin(Math.PI * col / WIDTH_SEGMENTS) *
        rig.load +
      piece.wrinkle[i] * (0.3 * rig.grip + 0.7 * rig.load) +
      0.012 * nearFront +
      0.006 * damaged * lip * (0.35 + 0.65 * rig.load);

    if (isFlap && rig.detached[col] > 0) {
      const detached = rig.detached[col];
      const middleY = (rig.edge[col] + rig.halfHeight) / 2;
      const transverseDistance = restY - middleY;

      x +=
        (rig.centerX[col] - restX) * detached +
        transverseDistance * rig.bendX[col] * detached;

      y +=
        rig.lift[col] +
        transverseDistance * (rig.bendY[col] - 1) * detached;

      z +=
        rig.centerZ[col] * detached +
        transverseDistance * rig.bendZ[col] * detached +
        piece.corner[i] * detached * (0.35 + 0.65 * rig.load);
    }

    // A smooth spatial falloff pins the unbroken seam, while the free foil
    // follows the held point. The centerline curl above is retained.
    if (isFlap) {
      const free = smooth(
        (rig.front - col / WIDTH_SEGMENTS) /
        Math.max(rig.front - rig.grabU, 0.06)
      );

      x += rig.followX * free;
      y += rig.followY * free;
      z += rig.followZ * free;
    }

    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
  }

  piece.geometry.attributes.position.needsUpdate = true;
}

function updateNormals(piece) {
  const p = piece.positions;
  const n = piece.normals;
  const indices = piece.indices;

  n.fill(0);

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;

    const abX = p[b] - p[a];
    const abY = p[b + 1] - p[a + 1];
    const abZ = p[b + 2] - p[a + 2];

    const acX = p[c] - p[a];
    const acY = p[c + 1] - p[a + 1];
    const acZ = p[c + 2] - p[a + 2];

    const nx = abY * acZ - abZ * acY;
    const ny = abZ * acX - abX * acZ;
    const nz = abX * acY - abY * acX;

    n[a] += nx;
    n[a + 1] += ny;
    n[a + 2] += nz;

    n[b] += nx;
    n[b + 1] += ny;
    n[b + 2] += nz;

    n[c] += nx;
    n[c + 1] += ny;
    n[c + 2] += nz;
  }

  for (let i = 0; i < n.length; i += 3) {
    const length = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;

    n[i] /= length;
    n[i + 1] /= length;
    n[i + 2] /= length;
  }

  piece.geometry.attributes.normal.needsUpdate = true;
}

function weldAttachedNormals(rig) {
  const bodyNormals = rig.body.normals;
  const flapNormals = rig.flap.normals;

  for (let col = 0; col < COLUMNS; col += 1) {
    const distance = Math.max(0, rig.frontX - rig.x[col]);
    const weld = 1 - smooth(distance / 0.035);

    if (weld <= 0) continue;

    const bodyOffset = (BODY_ROWS * COLUMNS + col) * 3;
    const flapOffset = col * 3;

    const bx = bodyNormals[bodyOffset];
    const by = bodyNormals[bodyOffset + 1];
    const bz = bodyNormals[bodyOffset + 2];

    const fx = flapNormals[flapOffset];
    const fy = flapNormals[flapOffset + 1];
    const fz = flapNormals[flapOffset + 2];

    const length = Math.hypot(bx + fx, by + fy, bz + fz) || 1;
    const nx = (bx + fx) / length;
    const ny = (by + fy) / length;
    const nz = (bz + fz) / length;

    bodyNormals[bodyOffset] = bx + (nx - bx) * weld;
    bodyNormals[bodyOffset + 1] = by + (ny - by) * weld;
    bodyNormals[bodyOffset + 2] = bz + (nz - bz) * weld;

    flapNormals[flapOffset] = fx + (nx - fx) * weld;
    flapNormals[flapOffset + 1] = fy + (ny - fy) * weld;
    flapNormals[flapOffset + 2] = fz + (nz - fz) * weld;
  }

  rig.body.geometry.attributes.normal.needsUpdate = true;
  rig.flap.geometry.attributes.normal.needsUpdate = true;
}

function resetPiece(piece) {
  piece.positions.set(piece.rest);
  piece.normals.set(piece.restNormals);

  piece.geometry.attributes.position.needsUpdate = true;
  piece.geometry.attributes.normal.needsUpdate = true;
}

function updateRig(rig, time, reduced, tear) {
  const previous = rig.lastInteraction;

  if (
    rig.lastTime === time &&
    rig.lastReduced === reduced &&
    previous.progress === tear.progress &&
    previous.manual === tear.manual &&
    previous.x === tear.x &&
    previous.y === tear.y &&
    previous.z === tear.z &&
    previous.grip === tear.grip &&
    previous.load === tear.load &&
    previous.grabU === tear.grabU &&
    previous.used === tear.used
  ) return false;

  Object.assign(previous, tear);
  rig.lastTime = time;
  rig.lastReduced = reduced;

  rig.front = humanTearProgress(time);

  if (time >= RELEASE_TIME) {
    rig.front = 1;
  }

  rig.frontX = THREE.MathUtils.lerp(
    -rig.width / 2,
    rig.width / 2,
    rig.front
  );

  const release = progress(time, RELEASE_TIME, 0.16);

  const catchLoad =
    progress(time, TEAR_START_TIME + 0.19, 0.06) *
    (1 - progress(time, TEAR_START_TIME + 0.29, 0.05));

  rig.grip =
    progress(time, 0, GRIP_PHASE_DURATION) *
    (1 - release);

  rig.load =
    progress(time, GRIP_PHASE_DURATION, PRE_TEAR_PULL_DURATION) *
    (1 - release) *
    (1 + 0.22 * catchLoad);

  const firstSnap = impulse(time, TEAR_START_TIME, 0.14);
  const finalSnap = impulse(time, RELEASE_TIME, 0.2);

  rig.recoil = RELEASE_RECOIL * (
    0.65 * firstSnap + finalSnap
  );

  rig.tipForce =
    progress(time, TEAR_START_TIME, 0.025) *
    (1 - progress(time, RELEASE_TIME - 0.04, 0.04)) *
    (0.75 + 0.25 * catchLoad);

  rig.targetX = -0.022 * rig.load;
  rig.targetY = 0.025 * rig.load;
  rig.targetZ = GRIP_Z_PULL * rig.load;

  rig.foldStrength = 1 + 0.06 * firstSnap + 0.1 * finalSnap;

  // Manual rupture is controlled exclusively by pointer displacement.
  // An automatic opening may advance a partial tear, but cannot heal it.
  rig.front = tear.manual
    ? tear.progress
    : Math.max(tear.progress, rig.front);

  rig.frontX = -rig.width / 2 + rig.width * rig.front;

  const hold = tear.manual ? 1 : 1 - release;

  if (tear.manual || tear.used) {
    rig.grip = tear.grip * hold;
    rig.load = tear.load * hold;
    rig.targetX = clamp(tear.x * 0.12, -0.08, 0.08) * hold;
    rig.targetY = clamp(tear.y * 0.12, -0.06, 0.1) * hold;
    rig.targetZ = 0.045 * rig.load;
    rig.tipForce = rig.load * (rig.front < 1 ? 1 : 0);
    rig.foldStrength = 0.8 + 0.35 * rig.load;

    if (tear.manual) rig.recoil = 0;
  }

  // Preserve the final hand offset through detachment. The existing
  // flap-root follow-through carries the foil away from this exact pose.
  rig.followX = tear.x;
  rig.followY = tear.y;
  rig.followZ = tear.z;
  rig.grabU = tear.grabU;

  if (reduced) {
    rig.grip *= 0.25;
    rig.targetX *= 0.25;
    rig.targetY *= 0.25;
    rig.targetZ *= 0.25;
    rig.recoil = 0;
    rig.foldStrength *= 0.25;
  }

  updateFlapCenterline(rig);
  deformPiece(rig.body, rig, false);
  deformPiece(rig.flap, rig, true);
  updateNormals(rig.body);
  updateNormals(rig.flap);
  weldAttachedNormals(rig);

  rig.dirty = true;
  return true;
}

export default function FoilPack({
  texture,
  width,
  height,
  openingY,
  frontZ,
  phase,
  timeline,
  reduced,
  tearGesture,
  onTearComplete,
  feedback,
}) {
  const { camera, size, gl, events } = useThree();

  // Scene's existing key={cycle} resets this local lifecycle on replay.
  const [tearHintDismissed, setTearHintDismissed] = useState(false);
  const hintDismissed = useRef(false);
  const hintElapsed = useRef(0);
  const hintElement = useRef(null);
  const showHint = phase === "sealed" && !tearHintDismissed;

  const pack = useRef();
  const bodyMaterial = useRef();
  const hitMesh = useRef();
  const bodyGeometry = useRef();
  const flapGeometry = useRef();
  const flapMesh = useRef();
  const flapMaterial = useRef();
  const flapRoot = useRef();
  const rig = useRef(null);

  const tear = useRef({
    progress: 0,
    manual: true,
    used: false,
    complete: false,
    x: 0,
    y: 0,
    z: 0,
    grip: 0,
    load: 0,
    grabU: 0,
  });

  const scratch = useRef({
    point: new THREE.Vector3(),
    left: new THREE.Vector3(),
    right: new THREE.Vector3(),
  });

  function releaseGesture() {
    const gesture = tearGesture.current;
    if (!gesture) return;

    // Clear ownership first: release can synchronously cause lostcapture.
    tearGesture.current = null;

    try {
      gesture.target.releasePointerCapture(gesture.id);
    } catch {
      // The browser may have already cancelled or released this pointer.
    }

    feedback("idle");
  }

  function dismissTearHint() {
    hintDismissed.current = true;
    // Clear synchronously, before capture or any real gesture state changes.
    if (hintElement.current) hintElement.current.style.visibility = "hidden";
    if (flapMaterial.current) {
      flapMaterial.current.uniforms.uHintPull.value = 0;
      flapMaterial.current.uniforms.uHintShimmer.value = 0;
    }
    setTearHintDismissed(true);
  }

  function beginTear(event) {
    if (phase !== "sealed" || tear.current.complete) return;

    event.stopPropagation();

    if (tearGesture.current || event.button !== 0) return;

    dismissTearHint();

    const node = pack.current;
    const temp = scratch.current;

    node.updateWorldMatrix(true, false);

    const local = node.worldToLocal(event.point.clone());

    // Freeze a plane through the actual point being grabbed. Future
    // pointer rays provide displacement in this pack's local coordinates.
    const normal = new THREE.Vector3(0, 0, 1)
      .transformDirection(node.matrixWorld);

    const plane = new THREE.Plane()
      .setFromNormalAndCoplanarPoint(normal, event.point);

    temp.left.set(-width / 2, height / 2, frontZ);
    temp.right.set(width / 2, height / 2, frontZ);

    node.localToWorld(temp.left).project(camera);
    node.localToWorld(temp.right).project(camera);

    const pixels = Math.hypot(
      (temp.right.x - temp.left.x) * size.width / 2,
      (temp.right.y - temp.left.y) * size.height / 2
    );

    const state = tear.current;

    const gesture = {
      id: event.pointerId,
      target: event.target,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      plane,
      local,
      inverse: node.matrixWorld.clone().invert(),
      required: clamp(
        pixels * 0.9,
        100,
        Math.max(100, size.width * 0.65)
      ),
      progress: state.progress,
      x: state.x,
      y: state.y,
      z: state.z,
      dx: 0,
      dy: 0,
      load: 0,
    };

    try {
      event.target.setPointerCapture(event.pointerId);
    } catch {
      return;
    }

    tearGesture.current = gesture;
    state.used = true;

    // Preserve deformation weights across re-grabs to prevent a pose jump.
    if (state.progress === 0) {
      state.grabU = clamp(event.uv?.x ?? 0, 0, 0.94);
    }

    feedback("drag");
  }

  function updateTear(event) {
    const gesture = tearGesture.current;

    if (
      !gesture ||
      gesture.id !== event.pointerId ||
      phase !== "sealed"
    ) return;

    event.stopPropagation();

    gesture.clientX = event.clientX;
    gesture.clientY = event.clientY;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    // Horizontal displacement dominates. Upward/diagonal pulling is
    // effective too; downward motion contributes a smaller amount.
    const distance = Math.hypot(
      dx,
      Math.max(0, -dy) * 0.72,
      Math.max(0, dy) * 0.3
    );

    const loadingDistance = gesture.required * 0.055;
    gesture.load = clamp(distance / loadingDistance, 0, 1);

    if (event.ray.intersectPlane(gesture.plane, scratch.current.point)) {
      scratch.current.point
        .applyMatrix4(gesture.inverse)
        .sub(gesture.local);

      gesture.dx = scratch.current.point.x;
      gesture.dy = scratch.current.point.y;
    }

    const state = tear.current;

    // Maximum displacement in this grab advances the irreversible tear.
    // Moving backward relaxes the pull, without repairing the seam.
    state.progress = Math.max(
      state.progress,
      clamp(
        gesture.progress +
          Math.max(0, distance - loadingDistance) / gesture.required,
        0,
        1
      )
    );

    // High-frequency physical values remain in refs.
    state.x = gesture.x + gesture.dx;
    state.y = gesture.y + gesture.dy;
    state.z = gesture.z + Math.min(
      Math.hypot(gesture.dx, gesture.dy) * 0.18,
      0.3
    );
    state.load = gesture.load;

    if (state.progress >= 1) {
      state.complete = true;
      state.grip = 1;
      releaseGesture();
      onTearComplete();
    }
  }

  function endTear(event, cancelled = false) {
    if (tearGesture.current?.id !== event.pointerId) return;

    event.stopPropagation();

    if (!cancelled) updateTear(event);

    releaseGesture();
  }

  useEffect(() => {
    // Native fallbacks cover R3F versions that do not forward cancellation
    // or lost capture to intersected objects.
    const source = events.connected || gl.domElement;

    const cancel = (event) => {
      if (tearGesture.current?.id === event.pointerId) {
        releaseGesture();
      }
    };

    const blur = () => releaseGesture();

    source.addEventListener("pointercancel", cancel);
    source.addEventListener("lostpointercapture", cancel);
    window.addEventListener("blur", blur);

    return () => {
      source.removeEventListener("pointercancel", cancel);
      source.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("blur", blur);
      releaseGesture();
    };
  }, [events.connected, gl, tearGesture, feedback]);

  useLayoutEffect(() => {
    if (phase !== "sealed") releaseGesture();
  }, [phase]);

  const [uniforms] = useState(() => ({
    body: makeUniforms(texture),
    flap: makeUniforms(texture),
  }));

  const baseY = openingY - TEAR_EDGE_INSET;
  const geometryKey = `${width}:${height}:${openingY}`;

  useLayoutEffect(() => {
    rig.current = buildRig(
      bodyGeometry.current,
      flapGeometry.current,
      width,
      height,
      openingY
    );

    return () => {
      rig.current = null;
    };
  }, [width, height, openingY]);

  useLayoutEffect(() => {
    uniforms.body.uMap.value = texture;
    uniforms.flap.uMap.value = texture;

    if (flapMaterial.current) {
      flapMaterial.current.uniforms.uMap.value = texture;
      flapMaterial.current.uniformsNeedUpdate = true;
    }
  }, [texture, uniforms]);

  useFrame((_, delta) => {
    const state = rig.current;
    const mesh = flapMesh.current;
    const material = flapMaterial.current;
    const root = flapRoot.current;

    if (!state || !mesh || !material || !root) return;

    const time = phase === "sealed"
      ? 0
      : Math.min(timeline.current, PACK_ANIMATION_END);

    const interaction = tear.current;
    interaction.manual = phase === "sealed";

    // One visual clock drives both the HTML hand and foil shader.
    // Never feed tutorial values into interaction, tearGesture or timeline.
    const hintActive = showHint && !hintDismissed.current &&
      !tearGesture.current && !interaction.used;
    let drag = 0;
    let handOpacity = 0;
    let press = 0;
    let shimmer = 0;
    let sweep = -0.2;

    if (hintActive && !reduced) {
      hintElapsed.current += Math.min(delta, 0.05);
      // 0.4s initial rest, 1.9s demonstration, then 1.8s rest.
      const t = (hintElapsed.current - 0.4) % 3.7;
      if (t >= 0) {
        shimmer = progress(t, 0, 0.12) * (1 - progress(t, 0.42, 0.18));
        sweep = -0.2 + 1.4 * progress(t, 0, 0.6);
        handOpacity = progress(t, 0.35, 0.22) *
          (1 - progress(t, 1.68, 0.22));
        press = progress(t, 0.57, 0.16) *
          (1 - progress(t, 1.35, 0.3));
        const pull = progress(t, 0.73, 0.65);
        const back = clamp((t - 1.38) / 0.36, 0, 1);
        // Damped return with a tiny overshoot, forced exactly home.
        const settle = back === 1 ? 0 :
          Math.exp(-6 * back) * Math.cos(7 * back);
        drag = pull * settle;
      }
    } else {
      hintElapsed.current = 0;
    }

    const hint = hintElement.current;
    if (hint) {
      hint.style.setProperty("--hint-opacity", String(handOpacity));
      hint.style.setProperty("--hint-x", `${drag * 54}px`);
      hint.style.setProperty("--hint-scale", String(0.92 + handOpacity * 0.08 - press * 0.1));
      hint.style.setProperty("--hint-press", String(press));
    }
    // 7.5% of a nominal pack-width * 0.9 pull; zero rupture at all times.
    material.uniforms.uHintPull.value = hintActive && !reduced
      ? width * 0.9 * 0.075 * drag : 0;
    material.uniforms.uHintBase.value = (openingY + height / 2) / height;
    material.uniforms.uHintShimmer.value = shimmer;
    material.uniforms.uHintSweep.value = sweep;

    if (interaction.manual && !interaction.complete) {
      const gesture = tearGesture.current;
      const dt = Math.min(delta, 0.05);

      interaction.grip = THREE.MathUtils.damp(
        interaction.grip,
        gesture ? 1 : 0,
        20,
        dt
      );

      if (!gesture) {
        // Only hand tension relaxes after release. The tear front and its
        // permanent curl/damaged edge remain at the achieved progress.
        interaction.load = THREE.MathUtils.damp(
          interaction.load, 0, 12, dt
        );
        interaction.x = THREE.MathUtils.damp(
          interaction.x, 0, 9, dt
        );
        interaction.y = THREE.MathUtils.damp(
          interaction.y, 0, 9, dt
        );
        interaction.z = THREE.MathUtils.damp(
          interaction.z, 0, 9, dt
        );
      }
    }

    if (updateRig(state, time, reduced, interaction)) {
      // Raycasting must use the current deformed flap bounds so that
      // released foil remains available for subsequent grabs.
      state.flap.geometry.computeBoundingSphere();
      state.flap.geometry.computeBoundingBox();
    }

    if (hitMesh.current) {
      const start = Math.min(
        WIDTH_SEGMENTS,
        Math.ceil(state.front * WIDTH_SEGMENTS)
      );

      hitMesh.current.visible = phase === "sealed" && state.front < 1;
      hitMesh.current.position.x = width * state.front / 2;
      hitMesh.current.scale.x = Math.max(0.001, 1 - state.front);
      hitMesh.current.position.y =
        (state.edge[start] + height / 2) / 2;
    }

    const opacity = 1 - progress(
      time,
      FLAP_FADE_START,
      FLAP_FADE_DURATION
    );

    // Update live materials, including versions that copy uniform objects.
    material.uniforms.uOpacity.value = opacity;
    material.uniforms.uFront.value =
      state.front >= 1 ? 1.025 : state.front;
    material.uniformsNeedUpdate = true;

    const bodyUniforms = bodyMaterial.current?.uniforms ?? uniforms.body;
    bodyUniforms.uFront.value =
      state.front >= 1 ? 1.025 : state.front;

    mesh.visible =
      phase === "sealed" ||
      (phase === "opening" && opacity > 0.001);

    const follow = reduced
      ? 0
      : progress(time, RELEASE_TIME, RELEASE_FOLLOW_THROUGH);

    const flick = reduced
      ? 0
      : impulse(time, RELEASE_TIME, RELEASE_FOLLOW_THROUGH);

    root.position.set(
      FOLLOW_X * follow,
      baseY + FOLLOW_Y * follow + 0.012 * flick,
      frontZ + FOLLOW_Z * follow
    );

    root.rotation.set(
      -0.08 * follow + 0.018 * flick,
      0.1 * follow,
      0.1 * follow + 0.015 * flick
    );
  });

  return (
    <group ref={pack}>
      {showHint && (
        <Html
          position={[-width * 0.22, (openingY + height / 2) / 2, frontZ + 0.06]}
          pointerEvents="none"
          wrapperClass="tear-hint-html"
          zIndexRange={[20, 10]}
          style={{ pointerEvents: "none" }}
        >
          <div
            ref={hintElement}
            className={`tear-hint${reduced ? " tear-hint--static" : ""}`}
            aria-hidden="true"
          >
            <span className="tear-hint__hand">
              <img
                src="/images/stickers/finger-grip.png"
                alt=""
                draggable="false"
                className="tear-hint__hand-image"
              />
            </span>
          </div>
        </Html>
      )}
      {/* Permanent lower opened-pack body. */}
      <mesh
        position={[0, 0, frontZ]}
        renderOrder={1}
        frustumCulled={false}
      >
        <bufferGeometry
          key={geometryKey}
          ref={bodyGeometry}
        />

        <shaderMaterial
          ref={bodyMaterial}
          uniforms={uniforms.body}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          transparent
          depthTest
          depthWrite
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Invisible hit target over the remaining attached top strip. */}
      <mesh
        ref={hitMesh}
        position={[0, (baseY + height / 2) / 2, frontZ + 0.035]}
        onPointerDown={beginTear}
        onPointerMove={updateTear}
        onPointerUp={(event) => endTear(event)}
        onPointerCancel={(event) => endTear(event, true)}
        onLostPointerCapture={(event) => endTear(event, true)}
        onPointerOver={(event) => {
          if (phase !== "sealed" || tearGesture.current) return;
          event.stopPropagation();
          feedback("hover");
        }}
        onPointerOut={() => {
          if (!tearGesture.current) feedback("idle");
        }}
      >
        <planeGeometry args={[width, height / 2 - baseY + 0.06]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* The actual deformed flap remains grabbable after partial tears. */}
      <group
        ref={flapRoot}
        position={[0, baseY, frontZ]}
      >
        <mesh
          ref={flapMesh}
          position={[0, -baseY, 0]}
          renderOrder={2}
          frustumCulled={false}
          onPointerDown={beginTear}
          onPointerMove={updateTear}
          onPointerUp={(event) => endTear(event)}
          onPointerCancel={(event) => endTear(event, true)}
          onLostPointerCapture={(event) => endTear(event, true)}
          onPointerOver={(event) => {
            if (phase !== "sealed" || tearGesture.current) return;
            event.stopPropagation();
            feedback("hover");
          }}
          onPointerOut={() => {
            if (!tearGesture.current) feedback("idle");
          }}
        >
          <bufferGeometry
            key={geometryKey}
            ref={flapGeometry}
          />

          <shaderMaterial
            ref={flapMaterial}
            uniforms={uniforms.flap}
            vertexShader={VERTEX_SHADER}
            fragmentShader={FRAGMENT_SHADER}
            transparent
            blending={THREE.NormalBlending}
            depthTest
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}