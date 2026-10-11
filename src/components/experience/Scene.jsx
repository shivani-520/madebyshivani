import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import BoosterPack from "../pack/BoosterPack";
import CardStack from "../cards/CardStack";
import usePackTextures from "../../hooks/usePackTextures";
import { OPEN_DURATION } from "../../constants/animation";
import { HEIGHT, WIDTH } from "../../constants/pack";
import { damp, progress } from "../../utils/animation";
import ReflectiveFloor from "../../materials/ReflectiveFloor";
import StarsBackground from "../scene/Stars";
import TwinklingStars from "../scene/TwinklingStars";

function CameraSetup() {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, -0.5, 0);
  }, [camera]);

  return null;
}

export default function Scene({
  phase,
  timeline,
  open,
  finish,
  feedback,
  reduced,
  cycle,
  onAssetsChange,
  tearGesture,
  active,
  flipped,
  onNavigate,
  onFlip,
}) {
  const { viewport, gl } = useThree();
  const { textures } = usePackTextures();
  const root = useRef();
  const pack = useRef();
  useEffect(() => {
    onAssetsChange(textures ? "ready" : "loading");
  }, [textures, onAssetsChange]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event) => {
      event.preventDefault();
      onAssetsChange("unavailable");
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onAssetsChange]);
  useFrame(({ pointer, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (phase === "opening") {
      timeline.current = Math.min(
        OPEN_DURATION,
        timeline.current + dt * (reduced ? 3 : 1),
      );
      if (timeline.current >= OPEN_DURATION) finish();
    }
    if (!root.current) return;
    // Keep the full extraction arc inside the stage on narrow/short displays.
    const opening = phase === "opening";
    const scale =
      phase === "cards"
        ? Math.min(
            (viewport.height * 0.55) / 2.13,
            (viewport.width * 0.55) / 1.52,
            1.45,
          )
        : Math.min(
            (viewport.height * 0.7) / (opening ? 5.6 : HEIGHT),
            (viewport.width * 0.7) / WIDTH,
            1.25,
          );
    root.current.scale.setScalar(
      reduced ? scale : damp(root.current.scale.x, scale, 9, dt),
    );
    root.current.position.y = damp(
      root.current.position.y,
      opening ? -0.38 : 0,
      9,
      dt,
    );
    if (pack.current) {
      const drop = progress(timeline.current, 1.29, 0.7);
      pack.current.position.y = -5 * drop;
      pack.current.position.x = 0.7 * drop;
      pack.current.rotation.z = -0.25 * drop;
      const sealed = phase === "sealed" && !reduced && !tearGesture.current;
      pack.current.rotation.x = damp(
        pack.current.rotation.x,
        sealed ? -pointer.y * 0.065 : 0.08 * drop,
        9,
        dt,
      );
      pack.current.rotation.y = damp(
        pack.current.rotation.y,
        sealed
          ? pointer.x * 0.12 + Math.sin(clock.elapsedTime * 0.5) * 0.04
          : 0,
        9,
        dt,
      );
      if (sealed)
        pack.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.025;
    }
  });
  return (
    <>
      <color attach="background" args={["#9dc6e2"]} />

      {/* <StarsBackground /> */}

      <TwinklingStars count={180} />

      <fog attach="fog" args={["#9dc6e2", 8, 22]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[-3, 5, 6]} intensity={2} color="#dfefff" />
      <directionalLight position={[4, -1, 3]} intensity={1.5} color="#b5a0d9" />

      <ReflectiveFloor />

      {textures && (
        <group key={cycle} ref={root}>
          {phase !== "sealed" && (
            <CardStack
              {...{
                phase,
                timeline,
                reduced,
                active,
                flipped,
                onNavigate,
                onFlip,
                feedback,
              }}
            />
          )}
          {phase !== "cards" && (
            <group ref={pack}>
              <BoosterPack
                {...{
                  phase,
                  timeline,
                  open,
                  feedback,
                  reduced,
                  textures,
                  tearGesture,
                }}
              />
            </group>
          )}
        </group>
      )}
    </>
  );
}
