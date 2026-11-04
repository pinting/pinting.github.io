// Mario's jumps are scripted, not decided on the fly. A block lists the
// surfaces he should touch, in order, and the planner works out where to take
// off and how hard to jump to land on each next one.

import { CFG, MARIO } from "./config.js";
import { rand } from "./util.js";

const G = CFG.gravity;
const VX = CFG.speed;

// Time in the air for a jump peaking H above take-off and landing `rise` higher
export const airTime = (H, rise, g = G) => Math.sqrt(2 * H / g) + Math.sqrt(2 * Math.max(0, H - rise) / g);

// Horizontal distance covered by that jump
export const reach = (H, rise, g = G) => VX * airTime(H, rise, g);

// The gravity that stretches a jump peaking at H to cover `dist` px
const gravityFor = (H, rise, dist) => (VX * (Math.sqrt(2 * H) + Math.sqrt(2 * Math.max(0, H - rise))) / dist) ** 2;

// Turn a path of surfaces ({x0, x1, top}) into jumps ({x, v, g}) appended to `jumps`.
//   Up     - peak at the destination height + 5-10%, land just past its edge
//   Down   - a small hop (5-10% of the drop) right at the edge
//   Across - a low, long glide over the gap, landing a bit past it
export function plan(path, jumps)
{
    const J = CFG.jump;

    path = path.slice();

    let landed = -Infinity;

    for(let i = 0; i + 1 < path.length; i++)
    {
        const cur = path[i];
        const next = path[i + 1];
        const rise = cur.top - next.top;

        if(rise === 0 && next.x0 - cur.x1 < 24)
        {
            continue; // Just keep running
        }

        let H = rise > 0 ? rise * (1 + rand(J.overshoot)) : Math.max(rand(J.hop), -rise * rand(J.overshoot));

        // Hopping down, he must be past the edge by the time the hop brings him
        // back to his own level, or he'd land where he started.
        const offEdge = rise < 0
            ? cur.x1 + (MARIO.boxR - MARIO.mid) + 2 - VX * 2 * Math.sqrt(2 * H / G)
            : -Infinity;

        // A step down too narrow to land on even from the earliest such take-off:
        // hop straight past it to the surface after.
        if(rise < 0 && i + 2 < path.length &&
            Math.max(cur.x0 + 14, landed + 4, offEdge) + reach(H, rise) > next.x1 + 6)
        {
            path.splice(i + 1, 1);
            i--;

            continue;
        }

        // Going up, land far enough in that the feet clear the corner on the way.
        const clearance = rise > 0 ? MARIO.boxR - MARIO.mid + 4 + VX * 2 * Math.sqrt(2 * (H - rise) / G) : 0;
        const b0 = next.x0 + Math.min((next.x1 - next.x0) / 2, Math.max(rand(J.inset), clearance));
        const b1 = Math.max(b0, next.x1 - 16);
        const a0 = Math.max(cur.x0 + 14, landed + 4, offEdge);
        const a1 = Math.max(a0, cur.x1 - rand(J.edge));

        if(rise > 0 && next.approach)
        {
            // Onto a log: start sooner, rise a hop above it and come down in a
            // curve, like the hop back off it.
            H = Math.max(H, rise + rand(J.hop));

            const take = Math.min(a1, Math.max(a0, b0 - next.approach));
            const g = gravityFor(H, rise, b0 - take);

            jumps.push({ x: take, v: Math.sqrt(2 * g * H), g });
            landed = b0;

            continue;
        }

        let D = reach(H, rise);
        let take = rise > 0 ? b0 - D : Math.min(a1, b1 - D);

        take = Math.min(a1, Math.max(a0, take));
        take = Math.max(a0, take - rand(J.early));

        // Would sail clean over a narrow step: aim for the surface after it.
        // (Landing on its very edge is fine; he's still on it until x1 + 13.)
        if(take + D > next.x1 + 6 && i + 2 < path.length)
        {
            path.splice(i + 1, 1);
            i--;

            continue;
        }

        let g = G;

        if(take + D < b0)
        {
            // A gap (water): rather than jumping higher, keep the peak low and
            // float further - a long, wide jump.
            H = Math.max(H, Math.max(rise, 0) + rand(J.glide));
            D = b0 - take;
            g = gravityFor(H, rise, D); // Exactly as floaty as this gap needs
        }

        jumps.push({ x: take, v: Math.sqrt(2 * g * H), g });
        landed = take + D;
    }
}

// The walkable outline of a set of overlapping surfaces between x0 and x1:
// for every stretch, the highest surface that covers it (the ground otherwise).
// Slivers narrower than Mario's feet are folded into the previous stretch,
// and dips too narrow to land in and take off again are jumped across.
export function skyline(surfaces, x0, x1, minDip = 160)
{
    const cuts = [...new Set([x0, x1, ...surfaces.flatMap(s => [s.x0, s.x1])])]
        .filter(v => v >= x0 && v <= x1)
        .sort((a, b) => a - b);

    const out = [];

    for(let i = 0; i + 1 < cuts.length; i++)
    {
        const a = cuts[i];
        const b = cuts[i + 1];

        let top = 0;

        for(const s of surfaces)
        {
            if(s.x0 <= a && s.x1 >= b && s.top < top)
            {
                top = s.top;
            }
        }

        const last = out[out.length - 1];

        if(last && (last.top === top || b - a < 24))
        {
            last.x1 = b;
        }
        else
        {
            out.push({ x0: a, x1: b, top });
        }
    }

    return out.filter((s, i) =>
    {
        const prev = out[i - 1];
        const next = out[i + 1];

        return !(prev && next && s.x1 - s.x0 < minDip && s.top > prev.top && s.top > next.top);
    });
}
