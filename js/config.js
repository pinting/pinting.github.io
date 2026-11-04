// World units are the original art's pixels (NES art at 2x): one tile is 32,
// the grass top is y = 0 and "up" is negative y.
export const T = 32;

export const COLORS = {
    sky: "#3cbcfc",

    // Cloud borders (and the text shadow in style.css)
    outline: "#0058f8",

    water: "#0058f8",

    white: "#fcfcfc",

    pale: "#a4e4fc",

    ripple: "#6888fc",
};

export const MARIO = {
    // Sprite frame size
    w: 46, h: 54,

    // His feet, relative to the sprite's x
    boxL: 10, boxR: 36,

    // Centre of the feet
    mid: 23,

    // px travelled per run-cycle frame
    runStep: 17,
};

// Every [a, b] pair is an interval a value is drawn from, so each pass through
// a block comes out a little different. Sizes are in tiles unless noted as px.
export const CFG = {
    // px/s, Mario never stops
    speed: 198,

    // px / s^2; scaled with speed² so arcs keep their shape
    gravity: 1134,

    jump: {
        // Peak = destination height + 5-10%
        overshoot: [0.05, 0.10],

        // px, smallest hop when jumping down or across
        hop: [10, 18],

        // px, peak of a wide jump across water (long, not high)
        glide: [40, 56],

        // px, length of the curved jump up onto a log
        approach: [100, 130],

        // px, how far onto the destination to land
        inset: [36, 52],

        // px, how close to an edge to take off
        edge: [8, 16],

        // px, take off this much sooner than the ideal spot
        early: [4, 7],
    },

    // Width in px
    block: { width: [2900, 3100], separator: [4, 7] },

    // px; neighbours differ by at least `differ`
    palm: { height: [120, 290], differ: 40 },

    plain: { bushes: [2, 3], palms: [3, 5] },

    // Long highland, river abyss in the middle
    medium: {
        lead: [6, 10], height: [3, 4], abyss: [4, 5],
        smallHills: [3, 5], smallWidth: [3, 4], smallHeight: [1, 2], bushes: [2, 4],
    },

    // Three stacked layers, log over a flooded pit
    high: {
        lead: [5, 8], layers: [[2, 3], [2, 2], [2, 2]], step: [8, 12],

        // One palm each side
        abyss: [4, 5], logOverhang: [2, 3], bushes: [1, 2],
    },

    // Pillars rising out of a wide river
    lake: {
        lead: [6, 10], pillars: [4, 6], width: [3, 4], height: [1, 4], gap: [2, 3],
        palms: [2, 3], bushes: [1, 2],
    },

    // A row of hills, a flooded pit or two in between
    rolling: {
        lead: [6, 10], hills: [6, 8], width: [3, 5], height: [2, 5], step: [1, 2],
        pits: [1, 2], pitWidth: [2, 3], bushes: [1, 3],
    },

    // The original page's world
    classic: { lead: [4, 6], bushes: [2, 3] },

    // Water level, as a share of the dirt band
    river: { depth: 0.55 },

    // S; starting pixel size in CSS px
    intro: { duration: 2.0, pixel: 10 },
};
