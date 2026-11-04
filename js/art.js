// Pixel art generated at start-up: clouds and the river surface.
// Everything is drawn on a 2px art grid in the NES sky palette.

import { COLORS } from "./config.js";
import { rand } from "./util.js";

function pixelCanvas(cellsW, cellsH, paint)
{
    const canvas = document.createElement("canvas");

    canvas.width = cellsW * 2;
    canvas.height = cellsH * 2;

    const g = canvas.getContext("2d");

    for(let y = 0; y < cellsH; y++)
    {
        for(let x = 0; x < cellsW; x++)
        {
            const color = paint(x, y);

            if(!color)
            {
                continue;
            }

            g.fillStyle = color;
            g.fillRect(x * 2, y * 2, 2, 2);
        }
    }

    return canvas;
}

// A cloud `cells` art pixels wide: overlapping puffs on a flat base
export function makeCloud(cells)
{
    const n = Math.max(3, Math.round(cells / 9));
    const step = (cells - 4) / (n + 1);
    const puffs = [];

    for(let i = 1; i <= n; i++)
    {
        const middleness = 1 - Math.abs(i / (n + 1) - 0.5) * 2;

        puffs.push({
            x: 2 + i * step + (Math.random() - 0.5) * 0.3 * step,
            r: step * rand([0.8, 0.95]) * (1 + middleness * rand([0.3, 0.6])),
        });
    }

    // Size the sprite to the puffs so no dome gets clipped flat
    const h = Math.ceil(Math.max(...puffs.map(p => p.r * 1.5))) + 3;
    const base = h - 2;

    for(const p of puffs)
    {
        p.y = base - p.r * 0.5;
    }

    const slab = Math.max(2, Math.round(h * 0.3)); // Flat bottom ties the puffs together
    const first = puffs[0];
    const last = puffs[n - 1];
    const left = Math.max(1, first.x - first.r * 0.8);
    const right = Math.min(cells - 1, last.x + last.r * 0.8);

    const inside = (x, y) => y >= 1 && y <= base && x >= 1 && x < cells - 1 && (
        (y > base - slab && x >= left && x < right) ||
        puffs.some(p => (x + 0.5 - p.x) ** 2 + (y + 0.5 - p.y) ** 2 <= p.r * p.r));

    return pixelCanvas(cells, h, (x, y) =>
    {
        if(!inside(x, y))
        {
            return null;
        }

        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const shade = !inside(x, y + 2) || !inside(x + 2, y + 1);

        return edge ? COLORS.outline : shade ? COLORS.pale : COLORS.white;
    });
}

// A 64x12 px tile of rippling water surface; below it is plain water colour
export function makeWaterTile()
{
    return pixelCanvas(32, 6, (x, y) =>
    {
        const crest = Math.round(1 + Math.sin(x / 32 * Math.PI * 2));

        if(y < crest)
        {
            return null;
        }

        if(y === crest)
        {
            return COLORS.white;
        }

        if(y === crest + 1)
        {
            return COLORS.pale;
        }

        if(y === 5 && (x + 6) % 16 < 5)
        {
            return COLORS.ripple;
        }

        return COLORS.water;
    });
}
