import * as THREE from "three";
import { FRONT_Z, PACK_OPENING_Y } from "./pack";

export const COLORS = [
    "#ad91e8",
    "#729fe6",
    "#e99697",
    "#83bea6",
    "#dec184",
    "#b9a3d8",
];

export const getCardColor = (index) => COLORS[index % COLORS.length];
export const STACK_ANGLES = [0, -0.8, 0.5, -0.4, 0.7];

export const CARD_FRONT_Z = 0.65;

export const CARD_WIDTH = 1.52;
export const CARD_HEIGHT = 2.13;
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

export const CARD_HTML_DISTANCE_FACTOR = 2 * 0.96;
export const CARD_PRELIFT_DISTANCE = 0.06;