import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import CardStack from "../cards/CardStack";
import BoosterPack from "../pack/BoosterPack";
import usePackTextures from "../../hooks/usePackTextures";
import { CARD_EXIT_Y, CARD_HEIGHT } from "../../constants/cards";
import { HEIGHT } from "../../constants/pack";
import { OPEN_DURATION } from "../../constants/animation";
import { damp, radians } from "../../utils/animation";

// Required for rectangular lights with the Canvas WebGL renderer.
RectAreaLightUniformsLib.init();

const SOFTBOXES = [
  {
    name: "key",
    position: [-3.5, 4.5, 5],
    width: 5,
    height: 6,
    intensity: 4,
    reflectionIntensity: 2.5,
  },
  {
    name: "fill",
    position: [4, -0.5, 4],
    width: 4,
    height: 5,
    intensity: 1.5,
    reflectionIntensity: 0.8,
  },
  {
    name: "top",
    position: [0, 5, 2],
    width: 5,
    height: 1.5,
    intensity: 2,
    reflectionIntensity: 1.5,
  },
];

const LIGHT_TARGET = [0, 0.6, 0.5];

function Softbox({ position, width, height, intensity }) {
  const light = useRef();

  useLayoutEffect(() => {
    light.current.lookAt(...LIGHT_TARGET);
    light.current.updateMatrixWorld();
  }, []);

  return (
    <rectAreaLight
      ref={light}
      position={position}
      width={width}
      height={height}
      intensity={intensity}
      color="#ffffff"
    />
  );
}

function StudioLighting() {
  return (
    <>
      {/* Stay outside stageRoot: the studio does not shrink with the cards. */}
      {SOFTBOXES.map((softbox) => (
        <Softbox key={softbox.name} {...softbox} />
      ))}

      <ambientLight color="#ffffff" intensity={0.12} />

      {/* A static, neutral reflection studio, including the clearcoat layer.
          These panels exist only in the environment capture, not the scene.
          Capture once; reflections still respond to moving card normals. */}
      <Environment frames={1} resolution={128} background={false}>
        <color attach="background" args={["#303030"]} />
        {SOFTBOXES.map((softbox) => (
          <Lightformer
            key={softbox.name}
            form="rect"
            color="#ffffff"
            intensity={softbox.reflectionIntensity}
            position={softbox.position}
            scale={[softbox.width, softbox.height, 1]}
            target={LIGHT_TARGET}
          />
        ))}
      </Environment>
    </>
  );
}

export default function Scene({
  phase,
  timeline,
  open,
  finish,
  feedback,
  onActive,
  onViewed,
  onSpread,
  onSelected,
  selected,
  controls,
  reduced,
  cycle,
  onAssetsChange,
  tearGesture,
}) {
  const { viewport, size, gl } = useThree();
  const { textures, error } = usePackTextures();
  const openingStarted = useRef(false);

  useEffect(() => {
    onAssetsChange(error ? "error" : textures ? "ready" : "loading");
  }, [textures, error, onAssetsChange]);

  const packRoot = useRef();
  const stageRoot = useRef();
  const heightFraction = 0.52;
  const sceneScale = 1;

  useFrame(({ pointer, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const sealed = phase === "sealed";

    // The cards rise above the foil before settling. Fit that complete motion,
    // not just the sealed pack, and ease back to the original resting size.
    if (stageRoot.current) {
      const target = phase === "opening" ? Math.min(sceneScale,
        viewport.height * 0.44 / (CARD_EXIT_Y + CARD_HEIGHT / 2 + 0.2)) : sceneScale;

      stageRoot.current.scale.setScalar(
        reduced ? target : damp(stageRoot.current.scale.x, target, 20, dt)
      );
    }

    // Keep the drag plane stable while a pointer owns the flap.
    if (packRoot.current && !tearGesture.current) {
      const idleY = sealed && !reduced
        ? Math.sin(clock.elapsedTime * 1.5) * 0.03
        : 0;

      packRoot.current.position.y = damp(
        packRoot.current.position.y,
        idleY,
        10,
        dt
      );

      packRoot.current.rotation.x = damp(
        packRoot.current.rotation.x,
        sealed && !reduced ? -pointer.y * radians(3) : 0,
        10,
        dt
      );

      packRoot.current.rotation.y = damp(
        packRoot.current.rotation.y,
        sealed && !reduced ? pointer.x * radians(5) : 0,
        10,
        dt
      );

      packRoot.current.rotation.z = damp(
        packRoot.current.rotation.z,
        sealed && !reduced ? pointer.x * radians(0.5) : 0,
        10,
        dt
      );
    }

    if (phase !== "opening") {
      openingStarted.current = false;
      return;
    }

    if (!openingStarted.current) {
      openingStarted.current = true;
      return;
    }

    timeline.current = Math.min(
      OPEN_DURATION,
      timeline.current + dt
    );

    if (timeline.current >= OPEN_DURATION) finish();
  });

  return (
    <>
      <StudioLighting />

      {textures && (
        <group key={cycle} ref={stageRoot} scale={sceneScale}>
          <group ref={packRoot}>
            {phase !== "sealed" && (
              <CardStack
                phase={phase}
                timeline={timeline}
                sceneScale={sceneScale}
                feedback={feedback}
                onActive={onActive}
                onViewed={onViewed}
                onSpread={onSpread}
                onSelected={onSelected}
                selected={selected}
                controls={controls}
                reduced={reduced}
              />
            )}

            <BoosterPack
              phase={phase}
              timeline={timeline}
              open={open}
              feedback={feedback}
              reduced={reduced}
              textures={textures}
              tearGesture={tearGesture}
            />
          </group>
        </group>
      )}
    </>
  );
}