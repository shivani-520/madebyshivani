import { useCallback, useRef, useState } from "react";
import { Canvas, events } from "@react-three/fiber";
import * as THREE from "three";
import { FOIL_RELEASE_TIME } from "../FoilPack";
import Scene from "./Scene";
import CollageBackdrop from "../ui/CollageBackdrop";
import MusicPlayer from "../ui/MusicPlayer";
import useReducedMotion from "../../hooks/useReducedMotion";
import { CARD_COUNT } from "../../data/projects";
import { clamp } from "../../utils/animation";

import useDevicePixelRatio from "../../hooks/useDevicePixelRatio";

export default function PortfolioExperience() {
  const pixelRatio = useDevicePixelRatio();
  const [phase, setPhase] = useState("sealed");
  const [assetStatus, setAssetStatus] = useState("loading");
  const assetsReady = useRef(false);

  const onAssetsChange = useCallback((status) => {
    assetsReady.current = status === "ready";
    setAssetStatus(status);
  }, []);

  const [cursor, setCursor] = useState("idle");
  const [active, setActive] = useState(0);
  const [viewed, setViewed] = useState(0);
  const [selected, setSelected] = useState(null);
  const [cycle, setCycle] = useState(0);
  const phaseRef = useRef("sealed");
  const timeline = useRef(0);
  const tearGesture = useRef(null);
  const controls = useRef(null);
  const sceneElement = useRef(null);
  const reduced = useReducedMotion();

  const open = useCallback((manual = false) => {
    if (phaseRef.current !== "sealed" || !assetsReady.current) return;

    phaseRef.current = "opening";

    // Manual tearing already reached the release pose. Keyboard opening
    // starts the procedural automatic tear from the existing partial state.
    timeline.current = manual === true ? FOIL_RELEASE_TIME : 0;

    setCursor("idle");
    setPhase("opening");
  }, []);

  const finish = useCallback(() => {
    if (phaseRef.current !== "opening") return;
    phaseRef.current = "cards";
    setPhase("cards");
  }, []);

  const expand = useCallback(() => {
    if (phaseRef.current !== "cards") return;
    phaseRef.current = "spread";
    setCursor("idle");
    setPhase("spread");
  }, []);

  const replay = useCallback(() => {
    phaseRef.current = "sealed";
    timeline.current = 0;
    controls.current = null;
    setCursor("idle");
    setActive(0);
    setViewed(0);
    setSelected(null);

    // Remount foil and cards. Foil cleanup releases any captured pointer;
    // its fresh refs, geometry, uniforms and transforms restore the seal.
    setCycle((value) => value + 1);
    setPhase("sealed");
  }, []);

  function onKeyDown(event) {
    if (event.target !== event.currentTarget) return;

    if (
      phaseRef.current === "sealed" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      open();
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;

      if (phaseRef.current === "cards" ||
          (phaseRef.current === "spread" && sceneElement.current?.clientWidth < 1000)) {
        event.preventDefault();
        controls.current?.(direction);
      } else if (phaseRef.current === "spread") {
        event.preventDefault();
        setSelected((value) => (
          value === null
            ? direction === 1 ? 0 : CARD_COUNT - 1
            : clamp(value + direction, 0, CARD_COUNT - 1)
        ));
      }
    }
  }

  const label = assetStatus !== "ready"
    ? assetStatus === "error"
      ? "Pack artwork could not load. Check the image files and reload the page."
      : "Loading pack artwork."
    : phase === "sealed"
      ? "Card pack. Grab the top foil strip and drag to tear it open. Release and grab again to continue a partial tear. Press Enter or Space to open automatically."
      : phase === "opening"
        ? "The pack is opening and the project cards are being revealed."
        : phase === "cards"
          ? `Card ${active + 1} of ${CARD_COUNT}. Flick or use arrow keys. ${viewed} cards viewed.`
          : `${CARD_COUNT} project cards. Select a card or use arrow keys.`;

  return (
    <>
      <div className="backdrop" aria-hidden="true"
        style={{ "--grid-line": `${Math.max(1, Math.round(pixelRatio)) / pixelRatio}px`,
          "--grid-step": `${Math.round(40 * pixelRatio) / pixelRatio}px` }} />
      <main className={`experience cursor-${cursor}`} data-phase={phase}>
      {/* <CollageBackdrop /> */}

      {/* <MusicPlayer /> */}

      <div
        ref={sceneElement}
        className="scene"
        tabIndex={0}
        role="region"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        <Canvas
          eventSource={sceneElement}
          events={(state) => ({
            ...events(state),
            compute(event, current) {
              const bounds = sceneElement.current?.getBoundingClientRect();

              if (!bounds?.width || !bounds.height) return;

              current.pointer.set(
                ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
                -((event.clientY - bounds.top) / bounds.height) * 2 + 1
              );

              current.raycaster.setFromCamera(
                current.pointer,
                current.camera
              );
            },
          })}
          camera={{
            position: [0, 0, 7],
            fov: 45,
          }}
          resize={{ debounce: 0 }}
        >
          <Scene
            phase={phase}
            timeline={timeline}
            open={open}
            finish={finish}
            feedback={setCursor}
            onActive={setActive}
            onViewed={setViewed}
            onSpread={expand}
            onSelected={setSelected}
            selected={selected}
            controls={controls}
            reduced={reduced}
            cycle={cycle}
            onAssetsChange={onAssetsChange}
            tearGesture={tearGesture}
          />
        </Canvas>

        <div className="scene-ui">
          Made By Shivani 3
        </div>
      </div>

      {assetStatus === "error" && (
        <p className="asset-error" role="alert">Pack artwork could not load. Please reload once the original image files are available.</p>
      )}
      <div className="interface">
        <button
          className="replay-button"
          onClick={replay}
          disabled={phase !== "cards" && phase !== "spread"}
          tabIndex={phase === "cards" || phase === "spread" ? 0 : -1}
        >
          Open another pack
        </button>
      </div>
    </main>
    </>
  );
}