import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export const LIQUIFY = {
    distortionRadius: 60,
    distortionStrength: 0.8,
    velocityMultiplier: 0.72,
    trailDecay: 4.2,
    trailLength: 0.18,
    rgbSeparation: 0.35,
    flowDissipation: 1.2,
    flowSmoothing: 0.12,
    velocitySmoothing: 0.025,
    maxVelocity: 2600,
    maxDisplacement: 230,
    flowResolution: 384,
    maxDpr: 2,
};

const MAX_SAMPLES = 24;

/* ============================================================
   FULLSCREEN VERTEX
============================================================ */

const FULLSCREEN_VERTEX = `
out vec2 vUv;

void main() {
  vUv = uv;

  gl_Position = vec4(
    position.xy,
    0.0,
    1.0
  );
}
`;

/* ============================================================
   FLOW SAMPLING

   RG = displacement
   BA = residual velocity
============================================================ */

const FLOW_READ = `
uniform sampler2D uFlow;
uniform vec2 uFlowSize;

vec4 flowAt(vec2 p) {

  vec2 q =
    clamp(
      p,
      vec2(0.0),
      vec2(1.0)
    )
    * uFlowSize
    - 0.5;

  ivec2 i = ivec2(floor(q));

  ivec2 hi =
    ivec2(uFlowSize) - 1;

  vec2 f = fract(q);

  return mix(

    mix(
      texelFetch(
        uFlow,
        clamp(
          i,
          ivec2(0),
          hi
        ),
        0
      ),

      texelFetch(
        uFlow,
        clamp(
          i + ivec2(1, 0),
          ivec2(0),
          hi
        ),
        0
      ),

      f.x
    ),

    mix(
      texelFetch(
        uFlow,
        clamp(
          i + ivec2(0, 1),
          ivec2(0),
          hi
        ),
        0
      ),

      texelFetch(
        uFlow,
        clamp(
          i + ivec2(1, 1),
          ivec2(0),
          hi
        ),
        0
      ),

      f.x
    ),

    f.y
  );
}
`;

/* ============================================================
   FLOW SIMULATION
============================================================ */

const FLOW_FRAGMENT = `
precision highp float;

in vec2 vUv;

out vec4 outFlow;

${FLOW_READ}

uniform vec2 uSize;

uniform float uDt;
uniform float uRadius;
uniform float uStrength;
uniform float uDecay;
uniform float uTrail;
uniform float uDissipation;
uniform float uSmoothing;
uniform float uMaxDisplacement;

uniform int uCount;

uniform vec4 uSegments[${MAX_SAMPLES}];
uniform vec4 uMotion[${MAX_SAMPLES}];

vec2 limitLength(
  vec2 v,
  float maximum
) {

  return v * min(
    1.0,
    maximum /
    max(
      length(v),
      0.0001
    )
  );
}

void main() {

  vec4 old = flowAt(vUv);

  vec2 back =
    vUv
    - old.ba
    * uDt
    * 0.32
    / uSize;

  vec4 f = flowAt(back);

  vec2 t =
    1.0 / uFlowSize;

  vec4 neighbors = (

    flowAt(
      back + vec2(t.x, 0.0)
    )

    +

    flowAt(
      back - vec2(t.x, 0.0)
    )

    +

    flowAt(
      back + vec2(0.0, t.y)
    )

    +

    flowAt(
      back - vec2(0.0, t.y)
    )

  ) * 0.25;

  f = mix(
    f,
    neighbors,

    1.0 -
    exp(
      -uSmoothing
      * 60.0
      * uDt
    )
  );

  f.ba *= exp(
    -(
      1.0 / uTrail
      + uDissipation
    )
    * uDt
  );

  f.rg =
    (
      f.rg
      + f.ba * uDt
    )
    *
    exp(
      -uDecay * uDt
    );

  vec2 p =
    vUv * uSize;

  for (
    int i = 0;
    i < ${MAX_SAMPLES};
    ++i
  ) {

    if (i >= uCount) {
      break;
    }

    vec2 a =
      uSegments[i].xy;

    vec2 b =
      uSegments[i].zw;

    vec2 segment =
      b - a;

    float along = clamp(

      dot(
        p - a,
        segment
      )

      /

      max(
        dot(
          segment,
          segment
        ),
        0.001
      ),

      0.0,
      1.0
    );

    float speed =
      length(
        uMotion[i].xy
      );

    float fast =
      smoothstep(
        60.0,
        2200.0,
        speed
      );

    float radius =
      uRadius
      *
      mix(
        0.82,
        1.35,
        fast
      );

    float distanceToPath =
      length(
        p
        - mix(
            a,
            b,
            along
          )
      );

    float brush =
      1.0
      -
      smoothstep(
        0.0,
        radius,
        distanceToPath
      );

    brush *= brush;

    vec2 drag =
      uMotion[i].xy
      * uMotion[i].w;

    float gain =
      uStrength
      *
      mix(
        0.3,
        1.5,
        fast
      );

    f.rg +=
      drag
      * gain
      * brush;

    f.ba +=
      drag
      * gain
      * brush
      * 3.0;
  }

  f.rg =
    limitLength(
      f.rg,
      uMaxDisplacement
    );

  f.ba =
    limitLength(
      f.ba,
      1500.0
    );

  outFlow = f;
}
`;

/* ============================================================
   FINAL SCREEN DISPLAY
============================================================ */

const DISPLAY_FRAGMENT = `
precision highp float;

in vec2 vUv;

out vec4 outColor;

${FLOW_READ}

uniform sampler2D uContent;

uniform vec2 uSize;

uniform float uRgb;

vec4 contentAt(vec2 p) {

  return texture(
    uContent,

    clamp(
      p,
      vec2(0.0),
      vec2(1.0)
    )
  );
}

vec3 linearToSrgb(vec3 c) {

  return mix(

    12.92 * c,

    1.055
    * pow(
        max(
          c,
          vec3(0.0)
        ),
        vec3(
          1.0 / 2.4
        )
      )
    - 0.055,

    step(
      vec3(0.0031308),
      c
    )
  );
}

void main() {

  vec2 displacement =
    flowAt(vUv).rg;

  float separation =
    uRgb
    *
    smoothstep(
      2.0,
      65.0,
      length(displacement)
    );

  vec2 d =
    displacement / uSize;

  vec4 r =
    contentAt(
      vUv - d
    );

  vec4 g =
    contentAt(

      vUv

      -

      d
      * (
          1.0
          -
          separation
          * (0.15 / 0.35)
        )
    );

  vec4 b =
    contentAt(

      vUv

      -

      d
      * (
          1.0
          - separation
        )
    );

  vec3 rgb = vec3(
    r.r,
    g.g,
    b.b
  );

  outColor = vec4(
    linearToSrgb(rgb),
    1.0
  );
}
`;

/* ============================================================
   SCREEN LIQUIFY
============================================================ */

export function ScreenLiquify({
    container,
}) {

    const { gl } =
        useThree();

    const pipeline =
        useRef(null);

    useEffect(() => {

        if (
            !gl.extensions.has(
                "EXT_color_buffer_float"
            )
            &&
            !gl.extensions.has(
                "EXT_color_buffer_half_float"
            )
        ) {
            return;
        }

        const element =
            container.current;

        if (!element) {
            return;
        }

        const reduced =
            matchMedia(
                "(prefers-reduced-motion: reduce)"
            );

        const coarse =
            matchMedia(
                "(pointer: coarse)"
            );

        const flowTargets =
            [0, 1].map(
                () =>
                    new THREE.WebGLRenderTarget(
                        2,
                        2,
                        {
                            type:
                                THREE.HalfFloatType,

                            minFilter:
                                THREE.NearestFilter,

                            magFilter:
                                THREE.NearestFilter,

                            depthBuffer:
                                false,

                            stencilBuffer:
                                false,
                        }
                    )
            );

        const content =
            new THREE.WebGLRenderTarget(
                1,
                1,
                {
                    depthBuffer: true,
                    stencilBuffer: false,
                }
            );

        const uniforms = {

            uFlow: {
                value: null,
            },

            uFlowSize: {
                value:
                    new THREE.Vector2(
                        2,
                        2
                    ),
            },

            uSize: {
                value:
                    new THREE.Vector2(
                        1,
                        1
                    ),
            },

            uDt: {
                value: 1 / 60,
            },

            uRadius: {
                value:
                    Math.max(
                        1,
                        LIQUIFY.distortionRadius
                    ),
            },

            uStrength: {
                value:
                    LIQUIFY.distortionStrength,
            },

            uDecay: {
                value:
                    Math.max(
                        0.1,
                        LIQUIFY.trailDecay
                    ),
            },

            uTrail: {
                value:
                    Math.max(
                        0.01,
                        LIQUIFY.trailLength
                    ),
            },

            uDissipation: {
                value:
                    Math.max(
                        0,
                        LIQUIFY.flowDissipation
                    ),
            },

            uSmoothing: {
                value:
                    Math.max(
                        0,
                        LIQUIFY.flowSmoothing
                    ),
            },

            uMaxDisplacement: {
                value:
                    LIQUIFY.maxDisplacement,
            },

            uCount: {
                value: 0,
            },

            uSegments: {
                value:
                    Array.from(
                        {
                            length: MAX_SAMPLES,
                        },
                        () =>
                            new THREE.Vector4()
                    ),
            },

            uMotion: {
                value:
                    Array.from(
                        {
                            length: MAX_SAMPLES,
                        },
                        () =>
                            new THREE.Vector4()
                    ),
            },
        };

        const makeMaterial = (
            fragmentShader,
            values
        ) =>
            new THREE.ShaderMaterial({

                vertexShader:
                    FULLSCREEN_VERTEX,

                fragmentShader,

                uniforms:
                    values,

                glslVersion:
                    THREE.GLSL3,

                depthTest:
                    false,

                depthWrite:
                    false,

                blending:
                    THREE.NoBlending,

                toneMapped:
                    false,
            });

        const flowMaterial =
            makeMaterial(
                FLOW_FRAGMENT,
                uniforms
            );

        const displayMaterial =
            makeMaterial(

                DISPLAY_FRAGMENT,

                {
                    uFlow: {
                        value: null,
                    },

                    uFlowSize:
                        uniforms.uFlowSize,

                    uSize:
                        uniforms.uSize,

                    uContent: {
                        value:
                            content.texture,
                    },

                    uRgb: {
                        value:
                            THREE.MathUtils.clamp(
                                LIQUIFY.rgbSeparation,
                                0,
                                0.9
                            ),
                    },
                }
            );

        const geometry =
            new THREE.PlaneGeometry(
                2,
                2
            );

        const quad =
            new THREE.Mesh(
                geometry,
                flowMaterial
            );

        quad.frustumCulled =
            false;

        const passScene =
            new THREE.Scene();

        passScene.add(
            quad
        );

        const passCamera =
            new THREE.Camera();

        const state = {

            content,

            flowTargets,

            flowMaterial,

            displayMaterial,

            uniforms,

            scene:
                passScene,

            quad,

            passCamera,

            front:
                0,

            width:
                0,

            height:
                0,

            dpr:
                0,

            enabled:
                true,

            reset:
                true,

            queue:
                [],
        };

        pipeline.current =
            state;

        let previous =
            null;

        let vx =
            0;

        let vy =
            0;

        const resetPointer = () => {

            previous =
                null;

            vx =
                0;

            vy =
                0;
        };

        const policy = () => {

            state.enabled =
                !reduced.matches
                &&
                !coarse.matches
                &&
                !document.hidden;

            state.reset =
                true;

            state.queue.length =
                0;

            resetPointer();
        };

        const move = (event) => {

            if (
                !state.enabled
                ||
                event.pointerType === "touch"
                ||
                !event.isPrimary
            ) {
                return;
            }

            const rect =
                element.getBoundingClientRect();

            const samples =
                event.getCoalescedEvents?.();

            for (
                const e of
                samples?.length
                    ? samples
                    : [event]
            ) {

                const x =
                    e.clientX
                    - rect.left;

                const y =
                    rect.height
                    -
                    (
                        e.clientY
                        - rect.top
                    );

                const time =
                    e.timeStamp;

                if (
                    previous
                    &&
                    time > previous.time
                    &&
                    time - previous.time < 120
                ) {

                    const dt =
                        Math.max(

                            (
                                time
                                - previous.time
                            )
                            / 1000,

                            0.001
                        );

                    let dx =
                        (
                            x - previous.x
                        )
                        / dt;

                    let dy =
                        (
                            y - previous.y
                        )
                        / dt;

                    const clamp =
                        Math.min(

                            1,

                            LIQUIFY.maxVelocity

                            /

                            Math.max(
                                1,
                                Math.hypot(
                                    dx,
                                    dy
                                )
                            )
                        );

                    dx *= clamp;
                    dy *= clamp;

                    const blend =
                        1
                        -
                        Math.exp(
                            -dt
                            /
                            Math.max(
                                0.001,
                                LIQUIFY.velocitySmoothing
                            )
                        );

                    vx +=
                        (dx - vx)
                        * blend;

                    vy +=
                        (dy - vy)
                        * blend;

                    if (
                        Math.hypot(
                            x - previous.x,
                            y - previous.y
                        ) > 0.01
                    ) {

                        state.queue.push({

                            segment: [
                                previous.x,
                                previous.y,
                                x,
                                y,
                            ],

                            motion: [
                                vx
                                * LIQUIFY.velocityMultiplier,

                                vy
                                * LIQUIFY.velocityMultiplier,

                                0,

                                dt,
                            ],
                        });

                        if (
                            state.queue.length
                            >
                            MAX_SAMPLES
                        ) {

                            const first =
                                state.queue.shift();

                            const next =
                                state.queue[0];

                            const total =
                                first.motion[3]
                                +
                                next.motion[3];

                            next.segment[0] =
                                first.segment[0];

                            next.segment[1] =
                                first.segment[1];

                            for (
                                let axis = 0;
                                axis < 2;
                                axis++
                            ) {

                                next.motion[axis] =
                                    (
                                        first.motion[axis]
                                        * first.motion[3]

                                        +

                                        next.motion[axis]
                                        * next.motion[3]
                                    )
                                    /
                                    total;
                            }

                            next.motion[3] =
                                total;
                        }
                    }
                }

                previous = {
                    x,
                    y,
                    time,
                };
            }
        };

        const listeners = [

            [
                element,
                "pointermove",
                move,
            ],

            [
                element,
                "pointerleave",
                resetPointer,
            ],

            [
                element,
                "pointercancel",
                resetPointer,
            ],

            [
                window,
                "blur",
                resetPointer,
            ],

            [
                window,
                "resize",
                policy,
            ],

            [
                document,
                "visibilitychange",
                policy,
            ],

            [
                reduced,
                "change",
                policy,
            ],

            [
                coarse,
                "change",
                policy,
            ],

            [
                gl.domElement,
                "webglcontextrestored",
                policy,
            ],
        ];

        listeners.forEach(
            ([
                target,
                type,
                fn,
            ]) => {

                target.addEventListener(
                    type,
                    fn,
                    {
                        passive: true,
                    }
                );
            }
        );

        policy();

        return () => {

            pipeline.current =
                null;

            listeners.forEach(
                ([
                    target,
                    type,
                    fn,
                ]) => {

                    target.removeEventListener(
                        type,
                        fn
                    );
                }
            );

            flowTargets.forEach(
                (target) =>
                    target.dispose()
            );

            content.dispose();

            geometry.dispose();

            flowMaterial.dispose();

            displayMaterial.dispose();
        };

    }, [gl, container]);

    useFrame(
        (
            {
                gl,
                scene,
                camera,
                size,
            },
            delta
        ) => {

            const p =
                pipeline.current;

            /*
             * If liquify cannot run, render the R3F scene normally.
             */
            if (
                !p
                ||
                !p.enabled
            ) {

                gl.setRenderTarget(
                    null
                );

                gl.render(
                    scene,
                    camera
                );

                return;
            }

            const oldTarget =
                gl.getRenderTarget();

            const oldAlpha =
                gl.getClearAlpha();

            const oldColor =
                gl.getClearColor(
                    new THREE.Color()
                );

            try {

                const dpr =
                    gl.getPixelRatio();

                const w =
                    Math.max(
                        1,
                        size.width
                    );

                const h =
                    Math.max(
                        1,
                        size.height
                    );

                if (
                    p.width !== w
                    ||
                    p.height !== h
                    ||
                    p.dpr !== dpr
                ) {

                    p.width =
                        w;

                    p.height =
                        h;

                    p.dpr =
                        dpr;

                    p.content.setSize(

                        Math.max(
                            1,
                            Math.round(
                                w * dpr
                            )
                        ),

                        Math.max(
                            1,
                            Math.round(
                                h * dpr
                            )
                        )
                    );

                    const fw =
                        Math.max(

                            2,

                            Math.round(

                                LIQUIFY.flowResolution

                                *

                                w

                                /

                                Math.max(
                                    w,
                                    h
                                )
                            )
                        );

                    const fh =
                        Math.max(

                            2,

                            Math.round(

                                LIQUIFY.flowResolution

                                *

                                h

                                /

                                Math.max(
                                    w,
                                    h
                                )
                            )
                        );

                    p.flowTargets.forEach(
                        (target) => {

                            target.setSize(
                                fw,
                                fh
                            );
                        }
                    );

                    p.uniforms
                        .uSize
                        .value
                        .set(
                            w,
                            h
                        );

                    p.uniforms
                        .uFlowSize
                        .value
                        .set(
                            fw,
                            fh
                        );

                    p.reset =
                        true;
                }

                /*
                 * Clear both flow targets whenever the simulation
                 * needs a complete reset.
                 */
                if (p.reset) {

                    p.flowTargets.forEach(
                        (target) => {

                            gl.setRenderTarget(
                                target
                            );

                            gl.setClearColor(
                                0x000000,
                                0
                            );

                            gl.clear();
                        }
                    );

                    p.queue.length =
                        0;

                    p.reset =
                        false;
                }

                const u =
                    p.uniforms;

                u.uDt.value =
                    Math.min(

                        Math.max(
                            delta,
                            1 / 240
                        ),

                        1 / 30
                    );

                u.uCount.value =
                    p.queue.length;

                p.queue.forEach(
                    (sample, i) => {

                        u.uSegments
                            .value[i]
                            .fromArray(
                                sample.segment
                            );

                        u.uMotion
                            .value[i]
                            .fromArray(
                                sample.motion
                            );
                    }
                );

                p.queue.length =
                    0;

                /*
                 * PASS 1:
                 * Advance the liquid flow simulation.
                 */
                u.uFlow.value =
                    p.flowTargets[
                        p.front
                    ].texture;

                p.quad.material =
                    p.flowMaterial;

                gl.setRenderTarget(
                    p.flowTargets[
                    1 - p.front
                    ]
                );

                gl.setClearColor(
                    0x000000,
                    0
                );

                gl.render(
                    p.scene,
                    p.passCamera
                );

                p.front =
                    1 - p.front;

                /*
                 * PASS 2:
                 * Render the entire original R3F scene to one texture.
                 */
                gl.setRenderTarget(
                    p.content
                );

                gl.render(
                    scene,
                    camera
                );

                /*
                 * PASS 3:
                 * Apply the liquid distortion to the completed image.
                 */
                p.displayMaterial
                    .uniforms
                    .uFlow
                    .value =
                    p.flowTargets[
                        p.front
                    ].texture;

                p.quad.material =
                    p.displayMaterial;

                gl.setRenderTarget(
                    null
                );

                gl.render(
                    p.scene,
                    p.passCamera
                );

            } finally {

                gl.setRenderTarget(
                    oldTarget
                );

                gl.setClearColor(
                    oldColor,
                    oldAlpha
                );
            }

        },
        1
    );

    return null;
}