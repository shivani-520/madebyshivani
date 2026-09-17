import * as THREE from "three";
import { FRONT_Z, PACK_OPENING_Y } from "./pack";

export const COLORS = [
    "#4f8edc", // water blue
    "#e85a4f", // fire red
    "#f4c542", // electric yellow
    "#69ad58", // grass green
    "#9b72cf", // psychic purple
    "#d88745", // fighting orange
];

export const getCardColor = (index) => COLORS[index % COLORS.length];
export const STACK_ANGLES = [0, -0.8, 0.5, -0.4, 0.7];

export const CARD_FRONT_Z = 0.65;

export const CARD_WIDTH = 1.52;
export const CARD_HEIGHT = 2.13;

// HTML pixels per Three.js world unit
export const CARD_PX_PER_UNIT = 200;

export const CARD_STACK_DEPTH = 0.04;
export const CARD_INITIAL_SCALE = 0.96;

export const CARD_INSIDE_Y = -0.22;
export const CARD_INSIDE_Z = -0.08;

export const CARD_OPENING_CLEARANCE = 0.06;

export const CARD_MAX_HALF_HEIGHT = Math.max(
    ...STACK_ANGLES.map((degrees) => {
        const angle = THREE.MathUtils.degToRad(degrees);
        return (
            Math.abs(Math.cos(angle)) * CARD_HEIGHT / 2 +
            Math.abs(Math.sin(angle)) * CARD_WIDTH / 2
        );
    })
);

export const CARD_EXIT_Y =
    PACK_OPENING_Y + CARD_MAX_HALF_HEIGHT + CARD_OPENING_CLEARANCE;
export const CARD_RISE_DISTANCE = CARD_EXIT_Y - CARD_INSIDE_Y;
export const CARD_RETURN_Z = FRONT_Z + 0.08;

export const CARD_HTML_DISTANCE_FACTOR = 2;
export const CARD_PRELIFT_DISTANCE = 0.06;