// Mario runs right at a constant speed and follows the world's jump script.

import { CFG, MARIO } from "./config.js";

const G = CFG.gravity;
const VX = CFG.speed;

export class Mario
{
    constructor(world)
    {
        this.world = world;
        this.x = -MARIO.mid; // Sprite's left edge; his feet are centred on x + MARIO.mid
        this.y = 0;          // Feet
        this.air = null;     // {x, y, v, g}: Where a jump started, launch speed, gravity
        this.distance = 0;
        this.frame = 0;
        this.stats = { jumps: 0, walkOffs: 0, falls: 0 };
    }

    get centre()
    {
        return this.x + MARIO.mid;
    }

    standsOn(p)
    {
        return this.x + MARIO.boxR > p.x0 && this.x + MARIO.boxL < p.x1;
    }

    update(dt)
    {
        this.x += VX * dt;

        if(this.air)
        {
            this.fly();
        }
        else
        {
            this.run();
        }

        if(this.y > 2000)
        {
            this.rescue();
        }

        this.distance += VX * dt;
        this.frame = this.air ? 1 : Math.floor(this.distance / MARIO.runStep) % 4;
    }

    // The arc is a function of x, so jumps land exactly where they were planned
    // whatever the frame rate.
    fly()
    {
        const a = this.air;
        const t = (this.centre - a.x) / VX;
        const y = a.y - a.v * t + a.g * t * t / 2;

        if(y > this.y)
        {
            let land = null;

            for(const p of this.world.platforms)
            {
                if(this.y <= p.top + 0.5 && y >= p.top && this.standsOn(p) && (land === null || p.top < land))
                {
                    land = p.top;
                }
            }

            if(land !== null)
            {
                this.y = land;
                this.air = null;

                return;
            }
        }

        this.y = y;
    }

    run()
    {
        const supported = this.world.platforms.some(p => Math.abs(p.top - this.y) < 0.5 && this.standsOn(p));

        if(!supported)
        {
            this.air = { x: this.centre, y: this.y, v: 0, g: G };
            this.stats.walkOffs++;

            return;
        }

        const jumps = this.world.jumps;
        const cx = this.centre;

        while(jumps.length && jumps[0].x < cx - 150)
        {
            jumps.shift(); // Missed, stale
        }

        if(jumps.length && cx >= jumps[0].x)
        {
            const { v, g } = jumps.shift();

            this.air = { x: cx, y: this.y, v, g };
            this.stats.jumps++;
        }
    }

    // Safety net only; the script shouldn't ever drop him into the water.
    rescue()
    {
        this.stats.falls++;

        const cx = this.centre;
        const p = this.world.platforms.filter(p => p.x1 > cx + 40).sort((a, b) => a.x0 - b.x0)[0];

        if(!p)
        {
            return;
        }

        this.x = Math.max(p.x0 + 20, cx) - MARIO.mid;
        this.y = p.top;
        this.air = null;
    }
}
