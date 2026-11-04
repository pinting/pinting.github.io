// Endless runner backdrop: wires the world, Mario and the renderer together.
// Debugging: index.html#debug=10 fast-forwards 10x and exposes counters on
// window.__world; #debug=1,high repeats a single block type.

import { CFG, T } from "./config.js";
import { World } from "./world.js";
import { Mario } from "./mario.js";
import { Renderer } from "./renderer.js";
import { loadImage } from "./util.js";

const SPRITES = ["hill", "log", "palm", "bush", "grass", "mario", "ground"];

function readDebug()
{
    if(!location.hash.startsWith("#debug"))
    {
        return { on: false, speed: 1, only: null };
    }

    const [speed, only] = (location.hash.split("=")[1] || "").split(",");

    return { on: true, speed: Math.max(1, parseInt(speed, 10) || 1), only: only || null };
}

async function main()
{
    const canvas = document.getElementById("world");
    const about = document.querySelector(".about");
    const debug = readDebug();

    const images = await Promise.all(SPRITES.map(n => loadImage(`sprites/${n}.png`)));
    const sprites = Object.fromEntries(SPRITES.map((n, i) => [n, images[i]]));

    const world = new World(debug.only);
    const mario = new Mario(world);
    const renderer = new Renderer(canvas, sprites);

    const layout = () => renderer.layout(about.getBoundingClientRect().bottom);

    layout();

    window.addEventListener("resize", layout);
    window.visualViewport?.addEventListener("resize", layout);

    // Start mid-run on a plain wide enough for the first screens, so the
    // world is already moving when it fades in.
    const worldW = renderer.view.worldW;

    world.start(-Math.ceil(worldW / T) * T - 8 * T, Math.round((worldW * 2 + 1600) / T) * T);
    renderer.follow(mario);

    const stats = { stuck: 0 };

    if(debug.on)
    {
        window.__world = { world, mario, stats, debug };
    }

    let last = null;
    let introStart = null;

    function frame(now)
    {
        const t = now / 1000;
        const dt = last === null ? 0 : Math.min(0.05, t - last);

        last = t;

        if(introStart === null)
        {
            introStart = t;
        }

        for(let i = 0; i < debug.speed; i++)
        {
            mario.update(dt);

            if(debug.on && isStuck(world, mario))
            {
                stats.stuck++;
            }
        }

        renderer.follow(mario);
        world.generate(renderer.right + 16 * T);
        world.prune(renderer.left - 8 * T);
        renderer.draw(world, mario, t, (t - introStart) / CFG.intro.duration);

        requestAnimationFrame(frame);
    }

    document.body.classList.add("ready");

    requestAnimationFrame(frame);
}

// Running along the ground in front of a solid hill means a jump went wrong
function isStuck(world, mario)
{
    const c = mario.centre;

    return !mario.air && mario.y === 0 &&
        world.hills.some(o => o.solid && !o.base && c > o.x + 8 && c < o.x + o.w * T - 16);
}

main();
