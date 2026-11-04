// The predefined blocks the world is glued together from. Each builder lays
// out its terrain starting at x, roughly W px wide, scripts Mario's way
// through it and returns where it ends. Blocks start and end on the ground.

import { CFG, T } from "./config.js";
import { randInt as I, chance, pick, shuffle } from "./util.js";
import { skyline } from "./planner.js";

const flat = (x0, x1) => ({ x0, x1, top: 0 });

// The original page's world, x in px from
// the block start; hills are [x, width, height] in tiles, plus whether Mario
// may stand on them (the step before the log, the top of the tall stack and
// the lone spike are just scenery he jumps or runs past). Bush and log tops are in px.
const CLASSIC = {
    width: 3360,
    hills: [
        [736, 6, 7], [1536, 3, 5], [1600, 3, 7, false], [1600, 4, 3], [1984, 3, 7], [2464, 3, 7],
        [2496, 4, 2], [2688, 4, 9, false], [2688, 6, 6], [2688, 7, 3], [3072, 2, 4, false],
    ],
    log: [1664, 416, -256],
    palms: [266, 330, 1250, 2147],
    hillBushes: [[806, -224], [1570, -160], [1718, -256], [1990, -256], [2498, -224], [2722, -288]],
    open: [[32, 704], [960, 1504], [2112, 2432], [3168, 3328]], // Flat ground between hills
};

export const BLOCKS = {
    // Just grass, a couple of brown grass patches and tall palms
    plain(world, x, W)
    {
        const c = CFG.plain;

        world.addPalms(x + 2 * T, x + W - 2 * T, 0, I(c.palms));
        world.addBushes(x + T, x + W - T, 0, I(c.bushes));

        return x + W;
    },

    // A long highland with little hills on it and a river abyss in the middle
    medium(world, x, W)
    {
        const c = CFG.medium;
        const lead = I(c.lead);
        const tail = I(c.lead);
        const h = I(c.height);
        const gap = I(c.abyss);
        const len = W / T - lead - tail;
        const left = Math.floor((len - gap) / 2);
        const right = len - gap - left;
        const x0 = x + lead * T;
        const g0 = x0 + left * T;
        const g1 = g0 + gap * T;
        const x1 = g1 + right * T;
        const top = -h * T;

        // The small hills are scenery Mario runs past, drawn first so they sit behind.
        const k = I(c.smallHills);
        const kLeft = Math.ceil(k / 2);

        for(const [a, b, n] of [[x0 + 2 * T, g0 - 2 * T, kLeft], [g1 + 2 * T, x1 - 3 * T, k - kLeft]])
        {
            world.scatter(a, b, n, 3 * T, sx =>
                world.addHill(Math.round(sx / T) * T, I(c.smallWidth), I(c.smallHeight), { base: top, solid: false }));
        }

        const L = world.addHill(x0, left, h);
        const R = world.addHill(g1, right, h);

        world.addHole(g0, g1);

        const nb = I(c.bushes);

        world.addBushes(x0 + T, g0 - 2 * T, top, Math.ceil(nb / 2));
        world.addBushes(g1 + T, x1 - 2 * T, top, Math.floor(nb / 2));

        world.plan([flat(x, x0), L, R, flat(x1, x + W)]);

        return x + W;
    },

    // Three long layers stacked as a pyramid, a log across a flooded pit on top
    high(world, x, W)
    {
        const c = CFG.high;
        const lead = I(c.lead);
        const tail = I(c.lead);
        const total = W / T - lead - tail;
        const heights = c.layers.map(I);
        const tops = [heights[0], heights[0] + heights[1], heights[0] + heights[1] + heights[2]];
        const s1 = I(c.step);
        const s2 = I(c.step);
        const px = x + lead * T;
        const spans = [[0, total], [s1, total - s1], [s1 + s2, total - s1 - s2]]
            .map(([a, b]) => [px + a * T, px + b * T]);
        const gap = I(c.abyss);
        const g0 = px + Math.floor((total - gap) / 2) * T;
        const g1 = g0 + gap * T;

        // [Left, right] piece of each layer; tallest first so lower steps are in front
        const pieces = [];

        for(let l = 2; l >= 0; l--)
        {
            const [a, b] = spans[l];

            pieces[l] = [world.addHill(a, (g0 - a) / T, tops[l]), world.addHill(g1, (b - g1) / T, tops[l])];
        }

        world.addHole(g0, g1);

        const lx0 = g0 - I(c.logOverhang) * T;
        const lx1 = g1 + I(c.logOverhang) * T;
        const log = world.addLog(lx0, lx1 - lx0, -(tops[2] + 1) * T);

        // The visible top strip of each layer, both sides of the pit: [a, b, layer]
        const strips = [
            [spans[0][0] + T, spans[1][0] - T, 0], [spans[1][1] + T, spans[0][1] - 2 * T, 0],
            [spans[1][0] + T, spans[2][0] - T, 1], [spans[2][1] + T, spans[1][1] - 2 * T, 1],
            [spans[2][0] + T, lx0 - T, 2], [lx1 + T, spans[2][1] - 2 * T, 2],
        ];

        // One palm on each side of the pit, on layer 1 or 2
        for(const side of [0, 1])
        {
            const [a, b, l] = strips[side + (chance(0.5) ? 0 : 2)];

            world.addPalms(a, b, -tops[l] * T, 1);
        }

        for(let l = 0; l < 3; l++)
        {
            for(let i = I(c.bushes); i > 0; i--)
            {
                const [a, b] = strips[l * 2 + (chance(0.5) ? 0 : 1)];

                world.addBushes(a, b, -tops[l] * T, 1);
            }
        }

        world.plan([flat(x, px), pieces[0][0], pieces[1][0], pieces[2][0], log,
            pieces[2][1], pieces[1][1], pieces[0][1], flat(px + total * T, x + W)]);

        return x + W;
    },

    // Pillars of different heights rising out of a wide river
    lake(world, x, W)
    {
        const c = CFG.lake;
        const lake0 = x + I(c.lead) * T;
        const path = [flat(x, lake0)];

        let cur = lake0 + I(c.gap) * T;
        let prev = 0;

        for(let i = I(c.pillars); i > 0; i--)
        {
            let h = I(c.height);

            if(h === prev)
            {
                h = h > 1 ? h - 1 : h + 1;
            }

            const w = I(c.width);

            path.push(world.addHill(cur, w, h, { deep: true }));
            cur += (w + I(c.gap)) * T;
            prev = h;
        }

        const lake1 = cur;

        world.addHole(lake0, lake1);

        const end = Math.max(x + W, lake1 + 8 * T);

        world.addPalms(lake1 + 3 * T, end - 2 * T, 0, I(c.palms));
        world.addBushes(lake1 + 2 * T, end - T, 0, I(c.bushes));

        path.push(flat(lake1, end));
        world.plan(path);

        return end;
    },

    // A row of touching hills going up and down, with a flooded pit or two
    rolling(world, x, W)
    {
        const c = CFG.rolling;
        const [lo, hi] = c.height;
        const m = I(c.hills);
        const pitBefore = new Set();

        for(let i = I(c.pits); i > 0; i--)
        {
            pitBefore.add(1 + Math.floor(Math.random() * (m - 1)));
        }

        let cur = x + I(c.lead) * T;
        let h = I(c.height);

        const path = [flat(x, cur)];
        const tops = [];

        for(let i = 0; i < m; i++)
        {
            if(pitBefore.has(i))
            {
                const pw = I(c.pitWidth) * T;

                world.addHole(cur, cur + pw);
                cur += pw;
            }

            const w = I(c.width);
            const top = world.addHill(cur, w, h);

            path.push(top);
            tops.push(top);
            cur += w * T;

            const dir = h >= hi ? -1 : h <= lo ? 1 : (chance(0.5) ? 1 : -1);

            h = Math.min(hi, Math.max(lo, h + dir * I(c.step)));
        }

        for(let i = I(c.bushes); i > 0; i--)
        {
            const p = pick(tops);

            world.addBushes(p.x0 + 2, p.x1 - 8, p.top, 1);
        }

        const end = Math.max(x + W, cur + 8 * T);

        path.push(flat(cur, end));
        world.plan(path);

        return end;
    },

    // The hills of the original page, dressed like the other blocks
    classic(world, x, W)
    {
        const c = CFG.classic;
        const o = x + I(c.lead) * T;
        const end = Math.max(x + W, o + CLASSIC.width);

        // Tallest first, so the lower hills are drawn in front of them
        const hills = CLASSIC.hills.slice().sort((a, b) => b[2] - a[2]);
        const surfaces = hills
            .map(([hx, w, h, solid = true]) => world.addHill(o + hx, w, h, { solid }))
            .filter(Boolean);

        const [lx, lw, ltop] = CLASSIC.log;

        surfaces.push(world.addLog(o + lx, lw, ltop));

        for(const px of CLASSIC.palms)
        {
            world.addPalm(o + px, 0);
        }

        for(const [bx, top] of CLASSIC.hillBushes)
        {
            world.addBush(o + bx, top);
        }

        for(const [a, b] of shuffle(CLASSIC.open.slice()).slice(0, I(c.bushes)))
        {
            world.addBushes(o + a, o + b, 0, 1);
        }

        world.plan(skyline(surfaces, x, end));

        return end;
    },
};

// Order rules: the world starts on a plain (see World.start), the same block
// never comes twice in a row, every other block shows up once per round, and
// a plain follows every two of them.
export class BlockOrder
{
    constructor(only = null)
    {
        this.only = only in BLOCKS ? only : null;
        this.bag = [];
        this.last = null;
        this.sincePlain = 0;
    }

    next()
    {
        if(this.only)
        {
            return this.only;
        }

        if(this.sincePlain >= 2)
        {
            this.sincePlain = 0;

            return "plain";
        }

        if(!this.bag.length)
        {
            this.bag = shuffle(Object.keys(BLOCKS).filter(b => b !== "plain"));

            if(this.bag[0] === this.last)
            {
                this.bag.push(this.bag.shift());
            }
        }

        this.sincePlain++;

        return (this.last = this.bag.shift());
    }
}
