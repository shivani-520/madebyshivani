import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import CardStack from "../cards/CardStack";
import BoosterPack from "../pack/BoosterPack";
import usePackTextures from "../../hooks/usePackTextures";
import { CARD_EXIT_Y, CARD_HEIGHT } from "../../constants/cards";
import { HEIGHT } from "../../constants/pack";
import { OPEN_DURATION } from "../../constants/animation";
import { damp, radians } from "../../utils/animation";

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
  const { viewport, size } = useThree();
  const { textures, error } = usePackTextures();
  const openingStarted = useRef(false);

  useEffect(() => {
    onAssetsChange(error ? "error" : textures ? "ready" : "loading");
  }, [textures, error, onAssetsChange]);

  const packRoot = useRef();
  const stageRoot = useRef();
  const heightFraction = 0.52;
  const sceneScale = Math.min(
    viewport.height * heightFraction / HEIGHT,
    viewport.width / 3.65,
    // Bound the pack on very tall/4K displays without stretching its artwork.
    viewport.height * 620 / Math.max(size.height, 1) / HEIGHT
  );

  useFrame(({ pointer, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const sealed = phase === "sealed";
    // The cards rise above the foil before settling. Fit that complete motion,
    // not just the sealed pack, and ease back to the original resting size.
    if (stageRoot.current) {
      const target = phase === "opening" ? Math.min(sceneScale,
        viewport.height * 0.44 / (CARD_EXIT_Y + CARD_HEIGHT / 2 + 0.2)) : sceneScale;
      stageRoot.current.scale.setScalar(reduced ? target : damp(stageRoot.current.scale.x, target, 20, dt));
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
      <ambientLight intensity={1.05} />
      <directionalLight position={[-3, 5, 6]} color="#f4ecff" intensity={2.8} />
      <directionalLight position={[4, 1, 5]} color="#becde3" intensity={1.25} />
      <directionalLight position={[0, -4, 3]} color="#d0abd1" intensity={0.55} />

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