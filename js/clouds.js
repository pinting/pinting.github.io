// Two layers of generated clouds. They move with the camera at a fraction of
// its speed (parallax), drift with the wind, sway and bob a little.

import { makeCloud } from "./art.js";
import { rand, randInt } from "./util.js";

const LAYERS = [
    { parallax: 0.12, drift: 5,  count: 3, size: [32, 44], band: [0.0, 0.55] }, // Far
    { parallax: 0.35, drift: 11, count: 3, size: [46, 70], band: [0.1, 0.85] }, // Near
];

export class Clouds
{
    constructor()
    {
        this.layers = [];
        this.width = 0;
    }

    // (Re)create the clouds for a view `worldW` world px wide
    seed(worldW)
    {
        this.width = worldW;

        this.layers = LAYERS.map(spec =>
        {
            const span = worldW + 400;
            const count = Math.max(2, Math.round(spec.count * worldW / 900));
            const clouds = Array.from({ length: count }, (_, i) => ({
                img: makeCloud(randInt(spec.size)),
                x: (i + rand([0.1, 0.9])) * span / count,
                y: rand(spec.band),
                speed: spec.drift * rand([0.7, 1.4]),
                phase: rand([0, Math.PI * 2]),
                bob: rand([0.6, 1.1]),
            }));

            return { ...spec, span, clouds };
        });
    }

    // Each cloud's world-px box at time t. `top`/`height` is the band of sky
    // they float in (below the name, above the hills).
    *positions(camX, t, top, height)
    {
        for(const layer of this.layers)
        {
            for(const c of layer.clouds)
            {
                const w = c.img.width;
                const h = c.img.height;

                const along = c.x - camX * layer.parallax - t * c.speed + Math.sin(t * 0.45 * c.bob + c.phase) * 6;
                const span = layer.span + w;

                const x = ((along % span) + span) % span - w; // Wrap around the view
                const y = top + c.y * height + Math.round(Math.sin(t * 1.3 * c.bob + c.phase) * 2) * 2;

                yield { img: c.img, x, y, w, h };
            }
        }
    }
}
