"use strict";

export function round(number, ndigits) {
    const p = Math.pow(10, ndigits);
    return Math.round(number * p) / p;
}

export const PI = Math.PI;

/**PI/2*/
export const PI_2 = PI * 0.5;

/**PI/4*/
export const PI_4 = PI * 0.25;

export const deg2radian = PI / 180;

export const radian2deg = 180 / PI;
