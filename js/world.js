// Everything that exists in the world, generated block by block ahead of the
// camera and dropped once it is behind it.

import { CFG, T } from "./config.js";
import { BLOCKS, BlockOrder } from "./blocks.js";
import { plan } from "./planner.js";
import { rand, randInt, snap2, dropBehind } from "./util.js";

export class World
{
    constructor(onlyBlock = null)
    {
        this.hills = [];      // {x, w, h, base, deep, solid}  In draw order (back to front)
        this.logs = [];       // {x, w, top}
        this.palms = [];      // {x, base, height}
        this.bushes = [];     // {x, y}
        this.holes = [];      // {x0, x1}                      Flooded gaps in the ground
        this.platforms = [];  // {x0, x1, top}                 Walkable, one-way surfaces
        this.jumps = [];      // {x, v}                        Mario's script, ordered by x

        this.ground = { x0: -Infinity, x1: Infinity, top: 0 };
        this.platforms.push(this.ground);
        this.order = new BlockOrder(onlyBlock);
        this.cursor = 0;
    }

    // A hill w tiles wide and h tall standing on `base`; returns its top surface
    addHill(x, w, h, { base = 0, deep = false, solid = true } = {})
    {
        this.hills.push({ x, w, h, base, deep, solid });

        if(!solid)
        {
            return null;
        }

        return this.addPlatform(x + 2, x + w * T - 10, base - h * T); // Minus the drop shadow
    }

    addLog(x, w, top)
    {
        this.logs.push({ x, w, top });

        const p = this.addPlatform(x + 2, x + w - 2, top);

        p.approach = rand(CFG.jump.approach); // Jump onto logs in a long curve

        return p;
    }

    addPlatform(x0, x1, top)
    {
        const p = { x0, x1, top };

        this.platforms.push(p);

        return p;
    }

    // Cut the ground between x0 and x1; it fills with water, call in x order
    addHole(x0, x1)
    {
        this.holes.push({ x0, x1 });
        this.ground.x1 = x0;
        this.ground = this.addPlatform(x1, Infinity, 0);
    }

    // A palm whose height clearly differs from any palm close by (even across blocks)
    addPalm(x, base)
    {
        const near = this.palms.filter(p => Math.abs(p.x - x) < 400).map(p => p.height);

        let height;

        for(let tries = 0; tries < 20; tries++)
        {
            height = snap2(rand(CFG.palm.height));

            if(near.every(h => Math.abs(h - height) >= CFG.palm.differ))
            {
                break;
            }
        }

        this.palms.push({ x, base, height });
    }

    addBush(x, top)
    {
        this.bushes.push({ x, y: top - 16 });
    }

    // n things spread over [a, b): one per equal slot, at a random spot in it
    scatter(a, b, n, width, place)
    {
        if(n <= 0 || b - a < width)
        {
            return;
        }

        const slot = (b - a) / n;

        for(let i = 0; i < n; i++)
        {
            place(snap2(a + i * slot + Math.random() * Math.max(0, slot - width)));
        }
    }

    addBushes(a, b, top, n)
    {
        this.scatter(a, b, n, T, x => this.addBush(x, top));
    }

    addPalms(a, b, base, n)
    {
        this.scatter(a, b, n, T + 16, x => this.addPalm(x, base));
    }

    plan(path)
    {
        plan(path, this.jumps);
    }

    // Begin with a plain wide enough to cover the screen and the run-up
    start(x, width)
    {
        this.cursor = BLOCKS.plain(this, x, width);
        this.separate();
    }

    separate()
    {
        this.cursor += randInt(CFG.block.separator) * T; // Clean strip of grass between blocks
    }

    generate(until)
    {
        while(this.cursor < until)
        {
            const width = Math.round(rand(CFG.block.width) / T) * T;

            this.cursor = BLOCKS[this.order.next()](this, this.cursor, width);
            this.separate();
        }
    }

    prune(before)
    {
        dropBehind(this.hills, before, o => o.x + o.w * T);
        dropBehind(this.logs, before, o => o.x + o.w);
        dropBehind(this.palms, before, o => o.x + T);
        dropBehind(this.bushes, before, o => o.x + T);
        dropBehind(this.holes, before, o => o.x1);
        dropBehind(this.platforms, before, o => o.x1);
    }
}
