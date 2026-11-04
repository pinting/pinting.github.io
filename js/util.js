// Random float in the interval [a, b]
export const rand = ([a, b]) => a + Math.random() * (b - a);

// Random integer in the interval [a, b], both ends included
export const randInt = ([a, b]) => Math.floor(a + Math.random() * (b - a + 1));

export const chance = p => Math.random() < p;

export const pick = list => list[Math.floor(Math.random() * list.length)];

// Round to the 2px art-pixel grid
export const snap2 = v => Math.round(v / 2) * 2;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const easeOut = p => 1 - (1 - p) ** 3;

export function shuffle(list)
{
    for(let i = list.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));

        [list[i], list[j]] = [list[j], list[i]];
    }

    return list;
}

export function loadImage(src)
{
    return new Promise((resolve, reject) =>
    {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`could not load ${src}`));
        img.src = src;
    });
}

// Keep only the items whose right edge is at or past `before`, in place
export function dropBehind(list, before, right)
{
    let j = 0;

    for(const item of list)
    {
        if(right(item) >= before)
        {
            list[j++] = item;
        }
    }

    list.length = j;
}
