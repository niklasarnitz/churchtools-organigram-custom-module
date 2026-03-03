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

export const getColorForGroupType = (id: number) => {
	return getColorForId(id, masterDataColorSeeds.groupTypes);
};
