import FoilPack from "../FoilPack";
import { WIDTH, HEIGHT, PACK_OPENING_Y, FRONT_Z } from "../../constants/pack";

export default function BoosterPack({
  phase,
  timeline,
  open,
  feedback,
  reduced,
  textures,
  tearGesture,
}) {
  return (
    <FoilPack
      texture={textures.front}
      width={WIDTH}
      height={HEIGHT}
      openingY={PACK_OPENING_Y}
      frontZ={FRONT_Z}
      phase={phase}
      timeline={timeline}
      reduced={reduced}
      tearGesture={tearGesture}
      onTearComplete={() => open(true)}
      feedback={feedback}
    />
  );
}