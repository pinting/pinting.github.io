// Draws the world onto the page's canvas, scaled to fit the screen, with the
// camera following Mario.

import { CFG, COLORS, MARIO, T } from "./config.js";
import { Clouds } from "./clouds.js";
import { makeWaterTile } from "./art.js";
import { clamp, easeOut } from "./util.js";

export class Renderer
{
    constructor(canvas, sprites)
    {
        this.canvas = canvas;
        this.screen = canvas.getContext("2d");
        this.g = this.screen; // Where the world is being drawn right now
        this.sprites = sprites;
        this.water = makeWaterTile();
        this.clouds = new Clouds();
        this.camX = 0;
        this.view = null;

        // The intro draws the world off screen, then shows it coarsely pixelated.
        this.scene = document.createElement("canvas");
        this.mosaic = document.createElement("canvas");
    }

    // Fit the world to the canvas; `textBottom` is where the name and links end
    layout(textBottom)
    {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);

        this.canvas.width = this.scene.width = Math.round(w * dpr);
        this.canvas.height = this.scene.height = Math.round(h * dpr);

        // Keep a band of dirt under the grass on every screen; on tall, narrow
        // (portrait) screens lift the ground so the sky isn't mostly empty.
        const dirt = Math.max(64, Math.round(h * 0.22));
        const ground = Math.min(h - dirt, Math.max(460, Math.round(w * 1.15), Math.round(h * 0.6)));

        // Fit ~430 px of sky (tallest climb + the name) and ~420 px of width.
        // Big screens get 1.5x, which keeps every art pixel exactly 3 px wide.
        let s = clamp(Math.min((ground - 10) / 430, w / 420), 0.45, 1);

        if(ground / 1.5 >= 500 && w / 1.5 >= 900)
        {
            s = 1.5;
        }

        const widthChanged = !this.view || Math.abs(w - this.view.w) > 40;

        this.view = {
            w,
            h,
            dpr,
            s,
            ground,
            worldW: w / s,
            skyTop: (textBottom + 12) / s,
            skyH: Math.max(40, (ground - textBottom - 12) * 0.55 / s),
            water: Math.max(40, (h - ground) / s * CFG.river.depth),
        };

        if(widthChanged)
        {
            this.clouds.seed(this.view.worldW);
        }
    }

    follow(mario)
    {
        this.camX = mario.x - this.view.worldW * 0.3;
    }

    get left()
    {
        return this.camX;
    }

    get right()
    {
        return this.camX + this.view.worldW;
    }

    // Draw a frame. `intro` runs 0 -> 1 while the world fades in from the sky
    draw(world, mario, t, intro = 1)
    {
        if(intro >= 1)
        {
            this.g = this.screen;
            this.drawWorld(world, mario, t);

            return;
        }

        this.g = this.scene.getContext("2d");
        this.drawWorld(world, mario, t);
        this.present(intro);
    }

    present(p)
    {
        const { canvas, scene, mosaic, screen } = this;
        const block = Math.max(1, Math.round(CFG.intro.pixel * this.view.dpr * (1 - easeOut(p))));
        const mw = Math.ceil(canvas.width / block);
        const mh = Math.ceil(canvas.height / block);

        if(mosaic.width !== mw || mosaic.height !== mh)
        {
            mosaic.width = mw;
            mosaic.height = mh;
        }

        const m = mosaic.getContext("2d");

        m.imageSmoothingEnabled = true;
        m.drawImage(scene, 0, 0, mw * block, mh * block, 0, 0, mw, mh);

        screen.setTransform(1, 0, 0, 1, 0, 0);
        screen.fillStyle = COLORS.sky;
        screen.fillRect(0, 0, canvas.width, canvas.height);
        screen.globalAlpha = clamp(p / 0.6, 0, 1);
        screen.imageSmoothingEnabled = false;
        screen.drawImage(mosaic, 0, 0, mw, mh, 0, 0, mw * block, mh * block);
        screen.globalAlpha = 1;
    }

    px(v)
    {
        return Math.round(v * this.view.dpr) / this.view.dpr; // Snap to device pixels
    }

    sx(x)
    {
        return this.px((x - this.camX) * this.view.s);
    }

    sy(y)
    {
        return this.px(this.view.ground + y * this.view.s);
    }

    visible(x0, x1)
    {
        return x1 >= this.left - 4 && x0 <= this.right + 4;
    }

    // Draw part of an image to a world-space box (w, h default to the source size)
    blit(image, srcX, srcY, sw, sh, x, y, w = sw, h = sh)
    {
        const X = this.sx(x);
        const Y = this.sy(y);

        this.g.drawImage(image, srcX, srcY, sw, sh, X, Y, this.sx(x + w) - X, this.sy(y + h) - Y);
    }

    drawWorld(world, mario, t)
    {
        const { g, view } = this;

        g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
        g.imageSmoothingEnabled = false;
        g.fillStyle = COLORS.sky;
        g.fillRect(0, 0, view.w, view.h);
        this.drawClouds(t);

        for(const o of world.palms)
        {
            if(this.visible(o.x, o.x + T))
            {
                this.drawPalm(o);
            }
        }

        for(const o of world.hills)
        {
            if(!o.deep && this.visible(o.x, o.x + o.w * T))
            {
                this.drawHill(o);
            }
        }

        for(const o of world.logs)
        {
            if(this.visible(o.x, o.x + o.w))
            {
                this.drawLog(o);
            }
        }

        for(const o of world.bushes)
        {
            if(this.visible(o.x, o.x + T))
            {
                this.blit(this.sprites.bush, 0, 0, T, 16, o.x, o.y);
            }
        }

        this.drawGround();

        for(const o of world.holes)
        {
            if(this.visible(o.x0 - 2, o.x1 + 2))
            {
                this.drawHole(o);
            }
        }

        for(const o of world.hills)
        {
            if(o.deep && this.visible(o.x, o.x + o.w * T))
            {
                this.drawHill(o); // Pillars stand in the water
            }
        }

        for(const o of world.holes)
        {
            if(this.visible(o.x0, o.x1))
            {
                this.drawWater(o, t);
            }
        }

        this.drawMario(mario);
    }

    drawClouds(t)
    {
        const { g, view } = this;
        const s = view.s;

        for(const c of this.clouds.positions(this.camX, t, view.skyTop, view.skyH))
        {
            const X = this.px(c.x * s);
            const Y = this.px(c.y * s);

            g.drawImage(c.img, X, Y, this.px((c.x + c.w) * s) - X, this.px((c.y + c.h) * s) - Y);
        }
    }

    drawHill(o)
    {
        const top = o.base - o.h * T;

        // Pillars ("deep" hills) continue down past the bottom of the screen
        const bottom = o.deep ? (this.view.h - this.view.ground) / this.view.s : o.base;
        const rows = Math.ceil((bottom - top) / T);

        for(let j = 0; j < rows; j++)
        {
            for(let i = 0; i < o.w; i++)
            {
                const col = i === 0 ? 0 : i === o.w - 1 ? 64 : 32;

                this.blit(this.sprites.hill, col, j === 0 ? 0 : 32, T, T, o.x + i * T, top + j * T);
            }
        }
    }

    drawLog(o)
    {
        const n = Math.round(o.w / T);

        for(let i = 0; i < n; i++)
        {
            const col = i === 0 ? 0 : i === n - 1 ? 64 : 32;

            this.blit(this.sprites.log, col, 0, T, T, o.x + i * T, o.top);
        }
    }

    drawPalm(o)
    {
        const top = o.base - o.height;

        this.blit(this.sprites.palm, 0, 0, T, T, o.x, top); // Crown

        // Trunk
        for(let y = top + T; y < o.base; y += T)
        {
            this.blit(this.sprites.palm, 0, 32, T, Math.min(T, o.base - y), o.x, y);
        }
    }

    drawGround()
    {
        const { grass, ground } = this.sprites;

        for(let x = Math.floor(this.left / T) * T; x < this.right + T; x += T)
        {
            this.blit(grass, 0, 0, T, T, x, 0);
        }

        // The page's own ground.png, as dirt that scrolls with the world
        const gw = ground.width;
        const gh = ground.height;

        for(let y = T; this.sy(y) < this.view.h; y += gh)
        {
            for(let x = Math.floor(this.left / gw) * gw; x < this.right + gw; x += gw)
            {
                this.blit(ground, 0, 0, gw, gh, x, y);
            }
        }
    }

    drawHole(o)
    {
        const { g, view } = this;
        const X0 = this.sx(o.x0);
        const X1 = this.sx(o.x1);
        const Y = this.sy(0);

        g.fillStyle = COLORS.sky;
        g.fillRect(X0, Y, X1 - X0, view.h - Y);
        g.fillStyle = "#000"; // The cut dirt walls
        g.fillRect(this.sx(o.x0 - 2), Y, X0 - this.sx(o.x0 - 2), view.h - Y);
        g.fillRect(X1, Y, this.sx(o.x1 + 2) - X1, view.h - Y);
    }

    drawWater(o, t)
    {
        const { g, view } = this;
        const X0 = this.sx(o.x0);
        const X1 = this.sx(o.x1);
        const Y = this.sy(view.water);

        if(Y >= view.h)
        {
            return;
        }

        g.save();
        g.beginPath();
        g.rect(X0, Y - 4, X1 - X0, view.h - Y + 4);
        g.clip();

        const flow = (t * 28) % 64;

        for(let x = Math.floor(o.x0 / 64) * 64 - 64; x < o.x1 + 64; x += 64)
        {
            this.blit(this.water, 0, 0, 64, 12, x + flow, view.water);
        }

        const body = this.sy(view.water + 12);

        g.fillStyle = COLORS.water;
        g.fillRect(X0, body, X1 - X0, view.h - body);
        g.restore();
    }

    drawMario(mario)
    {
        this.blit(this.sprites.mario, mario.frame * MARIO.w, 0, MARIO.w, MARIO.h,
            Math.round(mario.x), Math.round(mario.y) - MARIO.h);
    }
}
