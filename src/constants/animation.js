import { FOIL_RELEASE_TIME } from "../components/FoilPack";

// Shift extraction as a unit so cards do not rise before foil detachment.
export const OPEN_DURATION = 1.9 + (FOIL_RELEASE_TIME - 0.72);

export const CARD_REVEAL_START = FOIL_RELEASE_TIME;
export const CARD_PRELIFT_DURATION = 0.08;

export const CARD_RISE_START = CARD_REVEAL_START + CARD_PRELIFT_DURATION;
export const CARD_RISE_DURATION = 0.48;

export const CARD_PUSH_FORWARD_START = 1.26 + (FOIL_RELEASE_TIME - 0.72);
export const CARD_PUSH_FORWARD_DURATION = 0.24;

export const CARD_SETTLE_START =
    CARD_PUSH_FORWARD_START + CARD_PUSH_FORWARD_DURATION;
export const CARD_SETTLE_DURATION = 0.38;

export const CARD_REDUCED_REVEAL_START = 1.12;
export const CARD_REDUCED_REVEAL_DURATION = 0.38;