import tailwindColors from 'tailwindcss/colors';

// This code is blatantly stolen from ChurchTools Web!
// As soon as churchtools-utils is published, we can use that instead!

const colors = {
    amber: tailwindColors.amber,
    blue: tailwindColors.blue,
    cyan: tailwindColors.cyan,
    emerald: tailwindColors.emerald,
    fuchsia: tailwindColors.fuchsia,
    gray: tailwindColors.slate,
    green: tailwindColors.green,
    indigo: tailwindColors.indigo,
    lime: tailwindColors.lime,
    orange: tailwindColors.orange,
    pink: tailwindColors.pink,
    purple: tailwindColors.purple,
    red: tailwindColors.red,
    rose: tailwindColors.rose,
    sky: tailwindColors.sky,
    teal: tailwindColors.teal,
    violet: tailwindColors.violet,
    yellow: tailwindColors.yellow,
};

export const masterDataColorSeeds = {
    ageGroups: 40,
    campus: 10,
    groupCategories: 20,
    groupTypes: 30,
    targetGroups: 50,
};

// https://github.com/bryc/code/blob/master/jshash/PRNGs.md --> mulberry32
export const mulberry32 = (a: number) => {
    return () => {
        a = Math.trunc(a);
        a = Math.trunc(a + 0x6d_2b_79_f5);
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
};

const ctColors = (Object.keys(colors) as (keyof typeof colors)[]).map((name) => {
    const group = colors[name];
    return { key: name, shades: group };
});

const getColorForId = (id: number, seed: number) => {
    const randomColorIndex = Math.floor(mulberry32(id * seed)() * ctColors.length);
    return ctColors[randomColorIndex];
};

export function oklchToHex(input: string): string {
    const match = input
        .trim()
        .match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/i);

    if (!match) {
        throw new Error("Invalid OKLCH format. Expected: oklch(L% C H)");
    }

    const L = parseFloat(match[1]) / 100;
    const C = parseFloat(match[2]);
    const H = parseFloat(match[3]) * (Math.PI / 180);

    // OKLCH → OKLab
    const a = C * Math.cos(H);
    const b = C * Math.sin(H);

    // OKLab → linear sRGB
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;

    let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let b2 = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    // linear → sRGB
    const toSRGB = (x: number) =>
        x <= 0.0031308
            ? 12.92 * x
            : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

    r = toSRGB(r);
    g = toSRGB(g);
    b2 = toSRGB(b2);

    // Clamp to 0–1
    r = Math.min(Math.max(0, r), 1);
    g = Math.min(Math.max(0, g), 1);
    b2 = Math.min(Math.max(0, b2), 1);

    // Convert to HEX
    const toHex = (x: number) =>
        Math.round(x * 255)
            .toString(16)
            .padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b2)}`;
}


export const getColorForGroupType = (id: number) => {
    return getColorForId(id, masterDataColorSeeds.groupTypes);
};
