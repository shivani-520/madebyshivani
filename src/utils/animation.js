import * as THREE from "three";

export const clamp = THREE.MathUtils.clamp;
export const damp = THREE.MathUtils.damp;
export const radians = THREE.MathUtils.degToRad;

export function smooth(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
}

export function progress(time, start, duration) {
    return smooth((time - start) / duration);
}

export function springEase(value) {
    const t = clamp(value, 0, 1);
    if (t === 1) return 1;
    return 1 - Math.exp(-7 * t) * Math.cos(8 * t);
}