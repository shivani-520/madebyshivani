import * as THREE from "three";
import {
    CARD_FRONT_Z,
    CARD_INITIAL_SCALE,
    CARD_INSIDE_Y,
    CARD_INSIDE_Z,
    CARD_PRELIFT_DISTANCE,
    CARD_RISE_DISTANCE,
} from "../constants/cards";
import {
    CARD_REDUCED_REVEAL_START,
    CARD_REDUCED_REVEAL_DURATION,
    CARD_REVEAL_START,
    CARD_PRELIFT_DURATION,
    CARD_RISE_START,
    CARD_RISE_DURATION,
    CARD_PUSH_FORWARD_START,
    CARD_PUSH_FORWARD_DURATION,
    CARD_SETTLE_START,
    CARD_SETTLE_DURATION,
} from "../constants/animation";
import { progress } from "./animation";

export function getCardRevealPose(time, reduced) {
    if (reduced) {
        const reveal = progress(
            time,
            CARD_REDUCED_REVEAL_START,
            CARD_REDUCED_REVEAL_DURATION
        );

        return {
            y: 0,
            z: THREE.MathUtils.lerp(CARD_INSIDE_Z, CARD_FRONT_Z, reveal),
            scale: THREE.MathUtils.lerp(CARD_INITIAL_SCALE, 1, reveal),
        };
    }

    const prelift = progress(
        time,
        CARD_REVEAL_START,
        CARD_PRELIFT_DURATION
    );
    const rise = progress(time, CARD_RISE_START, CARD_RISE_DURATION);
    const forward = progress(
        time,
        CARD_PUSH_FORWARD_START,
        CARD_PUSH_FORWARD_DURATION
    );
    const settle = progress(
        time,
        CARD_SETTLE_START,
        CARD_SETTLE_DURATION
    );

    const liftedY =
        CARD_INSIDE_Y +
        CARD_PRELIFT_DISTANCE * prelift +
        (CARD_RISE_DISTANCE - CARD_PRELIFT_DISTANCE) * rise;

    return {
        y: liftedY * (1 - settle),
        z: THREE.MathUtils.lerp(CARD_INSIDE_Z, CARD_FRONT_Z, forward),
        scale: THREE.MathUtils.lerp(CARD_INITIAL_SCALE, 1, forward),
    };
}