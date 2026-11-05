import { describe, expect, spyOn, test } from 'bun:test';
import jsPDF from 'jspdf';

import type { PosterSettings } from './posterLayout';

import { calculatePosterLayout, rowLabel } from './posterLayout';
import { renderPosterPdf } from './posterPdf';

const settings: PosterSettings = {
	dimension: 'width',
	glue: 10,
	margin: 5,
	orientation: 'portrait',
	paper: 'a4',
	sizeCm: 60,
};

describe('poster geometry', () => {
	test('covers the exact poster without gaps, duplications or scaling distortion', () => {
		const layout = calculatePosterLayout(1200, 800, settings);
		expect([layout.width, layout.height, layout.columns, layout.rows]).toEqual([600, 400, 4, 2]);
		expect(layout.tiles.map((tile) => tile.label)).toEqual(['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4']);
		let area = 0;
		for (const tile of layout.tiles) {
			const width = Math.min(layout.tileWidth, layout.width - tile.x);
			const height = Math.min(layout.tileHeight, layout.height - tile.y);
			area += width * height;
			if (tile.column > 0)
				expect(tile.x).toBe(layout.tiles[tile.row * layout.columns + tile.column - 1].x + layout.tileWidth);
			if (tile.row > 0)
				expect(tile.y).toBe(layout.tiles[(tile.row - 1) * layout.columns + tile.column].y + layout.tileHeight);
		}
		expect(area).toBe(600 * 400);
	});

	test('both seams hide the full unprintable margin and glue tab after the same two cuts', () => {
		for (const paper of ['a4', 'a3'] as const)
			for (const orientation of ['portrait', 'landscape'] as const) {
				const p = calculatePosterLayout(3, 2, { ...settings, orientation, paper });
				expect(p.cut).toBe(10);
				expect(p.pageWidth - p.cut - p.tileWidth).toBe(settings.margin + settings.glue);
				expect(p.pageHeight - p.cut - p.tileHeight).toBe(settings.margin + settings.glue);
				expect(p.cut + p.tileWidth).toBeLessThan(p.pageWidth - settings.margin);
				expect(p.cut + p.tileHeight).toBeLessThan(p.pageHeight - settings.margin);
			}
	});

	test('height selection preserves aspect and exact multiples do not create extra sheets', () => {
		const p = calculatePosterLayout(185, 272, { ...settings, dimension: 'height', sizeCm: 54.4 });
		expect(p.width).toBeCloseTo(370);
		expect([p.columns, p.rows]).toEqual([2, 2]);
	});

	test('rejects empty, nonfinite, impossible and excessive input', () => {
		for (const sizeCm of [0, -1, NaN, Infinity, 10000])
			expect(() => calculatePosterLayout(1, 1, { ...settings, sizeCm })).toThrow();
		expect(() => calculatePosterLayout(0, 1, settings)).toThrow();
		expect(() => calculatePosterLayout(1, 1, { ...settings, margin: 2 })).toThrow();
		expect(() => calculatePosterLayout(1, 1, { ...settings, glue: 0 })).toThrow();
		expect(rowLabel(26)).toBe('AA');
	});
});

describe('poster PDF', () => {
	test('renders every tile at the same scale and adds exactly one final overview', async () => {
		const p = calculatePosterLayout(3, 2, settings);
		const doc = new jsPDF({ format: 'a4', unit: 'mm' });
		const placements: { height: number; width: number; x: number; y: number }[] = [];
		await renderPosterPdf(doc, p, (placement) => {
			placements.push(placement);
			return Promise.resolve();
		});
		expect(doc.getNumberOfPages()).toBe(p.tiles.length + 1);
		for (const [i, tile] of p.tiles.entries())
			expect(placements[i]).toEqual({ height: 400, width: 600, x: p.cut - tile.x, y: p.cut - tile.y });
		expect(placements.at(-1)?.width).toBeLessThan(200);
		const pdf = doc.output();
		expect(pdf).toContain('Fixogum');
		expect(pdf).toContain('NICHT');
		expect(pdf).toContain('/PrintScaling /None');
		expect(pdf).toContain('/Duplex /Simplex');
	});

	test('overview fits all supported papers, orientations and margin extremes', async () => {
		for (const paper of ['a4', 'a3'] as const)
			for (const orientation of ['portrait', 'landscape'] as const)
				for (const margin of [3, 30]) {
					const p = calculatePosterLayout(2, 3, { ...settings, margin, orientation, paper });
					const doc = new jsPDF({ format: paper, orientation, unit: 'mm' });
					await renderPosterPdf(doc, p, () => Promise.resolve());
					expect(doc.getNumberOfPages()).toBe(p.tiles.length + 1);
					expect(doc.internal.pageSize.getWidth()).toBeCloseTo(p.pageWidth, 1);
				}
	});
});

test('prints matching overlap into both tabs and their corner, but never into printer margins', async () => {
	const layout = calculatePosterLayout(1, 1, { ...settings, sizeCm: 100 });
	const doc = new jsPDF({ format: 'a4', unit: 'mm' });
	const rectangles = spyOn(doc, 'rect');
	const triangles = spyOn(doc, 'triangle');
	await renderPosterPdf(doc, layout, () => Promise.resolve());
	const clips = rectangles.mock.calls.filter((args) => args[4] === null);
	expect(clips).toHaveLength(layout.tiles.length);
	for (const [i, tile] of layout.tiles.entries()) {
		const [x, y, width, height] = clips[i];
		expect(x + width).toBeLessThanOrEqual(layout.pageWidth - settings.margin);
		expect(y + height).toBeLessThanOrEqual(layout.pageHeight - settings.margin);
		expect(tile.x + width).toBeLessThanOrEqual(layout.width);
		expect(tile.y + height).toBeLessThanOrEqual(layout.height);
		if (tile.column < layout.columns - 1) expect(tile.x + width - layout.tiles[i + 1].x).toBeCloseTo(settings.glue);
		if (tile.row < layout.rows - 1)
			expect(tile.y + height - layout.tiles[i + layout.columns].y).toBeCloseTo(settings.glue);
	}
	expect(clips[0]).toEqual([
		layout.cut,
		layout.cut,
		layout.tileWidth + settings.glue,
		layout.tileHeight + settings.glue,
		null,
	]);
	const seamX = layout.cut + layout.tileWidth;
	const seamY = layout.cut + layout.tileHeight;
	expect(triangles.mock.calls).toContainEqual([
		seamX,
		layout.cut + 10,
		seamX + settings.glue,
		layout.cut + 10 - settings.glue / Math.sqrt(3),
		seamX + settings.glue,
		layout.cut + 10 + settings.glue / Math.sqrt(3),
		'F',
	]);
	expect(triangles.mock.calls).toContainEqual([
		layout.cut + 10,
		seamY,
		layout.cut + 10 - settings.glue / Math.sqrt(3),
		seamY + settings.glue,
		layout.cut + 10 + settings.glue / Math.sqrt(3),
		seamY + settings.glue,
		'F',
	]);
	// Two triangles (contrast backing + black body) at each end of each internal seam.
	expect(triangles.mock.calls).toHaveLength(
		4 * ((layout.columns - 1) * layout.rows + (layout.rows - 1) * layout.columns),
	);
	for (const [x1, y1, x2, y2, x3, y3] of triangles.mock.calls) {
		const onRightTab = x1 === seamX && x2 >= seamX && x3 >= seamX;
		const onBottomTab = y1 === seamY && y2 >= seamY && y3 >= seamY;
		expect(onRightTab || onBottomTab).toBe(true);
		const side = Math.hypot(x2 - x1, y2 - y1);
		expect(Math.hypot(x3 - x1, y3 - y1)).toBeCloseTo(side);
		expect(Math.hypot(x3 - x2, y3 - y2)).toBeCloseTo(side);
		expect(Math.max(x1, x2, x3)).toBeLessThanOrEqual(layout.pageWidth - settings.margin);
		expect(Math.max(y1, y2, y3)).toBeLessThanOrEqual(layout.pageHeight - settings.margin);
	}
	rectangles.mockRestore();
	triangles.mockRestore();
});
