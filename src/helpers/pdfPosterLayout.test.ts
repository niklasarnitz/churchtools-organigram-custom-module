import { test } from 'bun:test';
import assert from 'node:assert/strict';

import type { PosterOptions } from './pdfPosterLayout';

import { calculatePosterLayout } from './pdfPosterLayout';

const options: PosterOptions = {
	marginMm: 5,
	orientation: 'portrait',
	paper: 'a4',
	sizeAxis: 'width',
	sizeCm: 37,
	tabMm: 15,
};

test('A4 contract: four uniform tiles at original scale (plus an external overview page)', () => {
	const layout = calculatePosterLayout({ height: 544, width: 370 }, options);
	assert.deepEqual(layout, {
		columns: 2,
		cut: 10,
		height: 544,
		margin: 5,
		pageHeight: 297,
		pageWidth: 210,
		rows: 2,
		scale: 1,
		tab: 15,
		tileHeight: 272,
		tiles: [
			{ column: 0, height: 272, id: 'A1', row: 0, width: 185, x: 0, y: 0 },
			{ column: 1, height: 272, id: 'A2', row: 0, width: 185, x: 185, y: 0 },
			{ column: 0, height: 272, id: 'B1', row: 1, width: 185, x: 0, y: 272 },
			{ column: 1, height: 272, id: 'B2', row: 1, width: 185, x: 185, y: 272 },
		],
		tileWidth: 185,
		width: 370,
	});
	assert.equal(layout.tiles.length + 1, 5);
});

test('exact multiples and floating-point roundoff do not create extra pages', () => {
	for (const factor of [1, 1 + Number.EPSILON, 1 - Number.EPSILON]) {
		const layout = calculatePosterLayout({ height: 544, width: 370 }, { ...options, sizeCm: 37 * factor });
		assert.equal(layout.columns, 2);
		assert.equal(layout.rows, 2);
	}
});

test('meaningful overshoots produce partial edge tiles without changing pitches or cut', () => {
	const layout = calculatePosterLayout(
		{ height: 544.000001, width: 370.000001 },
		{
			...options,
			sizeCm: 37.0000001,
		},
	);
	assert.equal(layout.columns, 3);
	assert.equal(layout.rows, 3);
	assert.equal(layout.cut, 10);
	assert.equal(layout.tileWidth, 185);
	assert.equal(layout.tileHeight, 272);
	assert.deepEqual(layout.tiles.at(-1), {
		column: 2,
		height: layout.height - 544,
		id: 'C3',
		row: 2,
		width: layout.width - 370,
		x: 370,
		y: 544,
	});
	assert(layout.tiles.every((tile) => tile.width > 0 && tile.height > 0));
});

test('partial last tiles intersect the poster while retaining uniform offsets', () => {
	const layout = calculatePosterLayout({ height: 300, width: 200 }, { ...options, sizeCm: 20 });
	assert.deepEqual(layout.tiles.at(-1), {
		column: 1,
		height: 28,
		id: 'B2',
		row: 1,
		width: 15,
		x: 185,
		y: 272,
	});
});

test('selected width and height axes preserve aspect and scale', () => {
	const widthLayout = calculatePosterLayout({ height: 400, width: 200 }, { ...options, sizeCm: 10 });
	assert.equal(widthLayout.width, 100);
	assert.equal(widthLayout.height, 200);
	assert.equal(widthLayout.scale, 0.5);
	const heightLayout = calculatePosterLayout(
		{ height: 400, width: 200 },
		{
			...options,
			sizeAxis: 'height',
			sizeCm: 10,
		},
	);
	assert.equal(heightLayout.width, 50);
	assert.equal(heightLayout.height, 100);
	assert.equal(heightLayout.scale, 0.25);
});

test('all paper formats and orientations use their physical dimensions', () => {
	const cases: [PosterOptions['paper'], PosterOptions['orientation'], number, number][] = [
		['a4', 'portrait', 210, 297],
		['a4', 'landscape', 297, 210],
		['a3', 'portrait', 297, 420],
		['a3', 'landscape', 420, 297],
	];
	for (const [paper, orientation, width, height] of cases) {
		const layout = calculatePosterLayout({ height: 1, width: 1 }, { ...options, orientation, paper });
		assert.equal(layout.pageWidth, width);
		assert.equal(layout.pageHeight, height);
		assert.equal(layout.tileWidth, width - 25);
		assert.equal(layout.tileHeight, height - 25);
	}
});

test('supports one-column and one-row posters and spreadsheet-style row labels', () => {
	const vertical = calculatePosterLayout({ height: 272 * 28, width: 100 }, { ...options, sizeCm: 10 });
	assert.equal(vertical.columns, 1);
	assert.equal(vertical.rows, 28);
	assert.equal(vertical.tiles[25].id, 'Z1');
	assert.equal(vertical.tiles[26].id, 'AA1');
	assert.equal(vertical.tiles[27].id, 'AB1');
	const horizontal = calculatePosterLayout({ height: 100, width: 185 * 4 }, { ...options, sizeCm: 74 });
	assert.equal(horizontal.columns, 4);
	assert.equal(horizontal.rows, 1);
	assert.deepEqual(
		horizontal.tiles.map((tile) => tile.id),
		['A1', 'A2', 'A3', 'A4'],
	);
});

test('zero margin and exactly 4 mm identifier room are allowed; negative zero is normalized', () => {
	const layout = calculatePosterLayout({ height: 1, width: 1 }, { ...options, marginMm: -0, tabMm: 4 });
	assert.equal(layout.margin, 0);
	assert.equal(layout.tab, 4);
	assert.equal(layout.cut, 5);
	assert.equal(layout.tileWidth, 201);
	assert.equal(layout.tileHeight, 288);
});

test('rejects nonpositive or nonfinite source extents and target sizes with German errors', () => {
	for (const value of [0, -1, NaN, Infinity, -Infinity]) {
		assert.throws(() => calculatePosterLayout({ height: 1, width: value }, options), /Vorlage/);
		assert.throws(() => calculatePosterLayout({ height: value, width: 1 }, options), /Vorlage/);
		assert.throws(
			() => calculatePosterLayout({ height: 1, width: 1 }, { ...options, sizeCm: value }),
			/Postergröße/,
		);
	}
});

test('rejects invalid margins, tabs, and exhausted tile area', () => {
	for (const marginMm of [-1, NaN, Infinity, -Infinity]) {
		assert.throws(() => calculatePosterLayout({ height: 1, width: 1 }, { ...options, marginMm }), /Seitenrand/);
	}
	for (const tabMm of [-1, 0, 8.999, NaN, Infinity, -Infinity]) {
		assert.throws(() => calculatePosterLayout({ height: 1, width: 1 }, { ...options, tabMm }), /Klebelasche/);
	}
	for (const tabMm of [200, 201]) {
		assert.throws(() => calculatePosterLayout({ height: 1, width: 1 }, { ...options, tabMm }), /Druckfläche/);
	}
	assert.throws(
		() =>
			calculatePosterLayout(
				{ height: 1, width: 1 },
				{
					...options,
					orientation: 'landscape',
					tabMm: 200,
				},
			),
		/Druckfläche/,
	);
});

test('rejects overflowing and underflowing computed dimensions or scale', () => {
	for (const source of [
		{ height: Number.MAX_VALUE, width: Number.MIN_VALUE },
		{ height: Number.MIN_VALUE, width: Number.MAX_VALUE },
	]) {
		assert.throws(() => calculatePosterLayout(source, options), /Postermaße/);
	}
	assert.throws(
		() =>
			calculatePosterLayout(
				{ height: 1, width: 1 },
				{
					...options,
					sizeCm: Number.MAX_VALUE,
				},
			),
		/Postermaße/,
	);
});

test('allows 400 tiles but rejects 401 and enormous finite dimensions before tile allocation', () => {
	const source = { height: 272 * 20, width: 185 * 20 };
	assert.equal(calculatePosterLayout(source, { ...options, sizeCm: 370 }).tiles.length, 400);
	assert.throws(
		() =>
			calculatePosterLayout(
				{ height: 272 * 401, width: 100 },
				{
					...options,
					sizeCm: 10,
				},
			),
		/höchstens 400 Kacheln/,
	);
	assert.throws(
		() =>
			calculatePosterLayout(
				{ height: 1, width: 1 },
				{
					...options,
					sizeCm: 1e300,
				},
			),
		/höchstens 400 Kacheln/,
	);
});
