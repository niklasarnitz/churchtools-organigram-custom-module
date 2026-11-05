export interface PosterLayout {
	columns: number;
	cut: number;
	height: number;
	margin: number;
	pageHeight: number;
	pageWidth: number;
	rows: number;
	scale: number;
	tab: number;
	tileHeight: number;
	tiles: {
		column: number;
		height: number;
		id: string;
		row: number;
		width: number;
		x: number;
		y: number;
	}[];
	tileWidth: number;
	width: number;
}

export interface PosterOptions {
	marginMm: number;
	orientation: 'landscape' | 'portrait';
	paper: 'a3' | 'a4';
	sizeAxis: 'height' | 'width';
	sizeCm: number;
	tabMm: number;
}

/** All layout dimensions are millimetres; scale converts source SVG units to millimetres. */
export function calculatePosterLayout(source: { height: number; width: number }, options: PosterOptions): PosterLayout {
	if (!isPositiveFinite(source.width) || !isPositiveFinite(source.height)) {
		throw new Error('Die Breite und Höhe der Vorlage müssen endlich und größer als 0 sein.');
	}
	if (!isPositiveFinite(options.sizeCm)) {
		throw new Error('Die Postergröße muss endlich und größer als 0 cm sein.');
	}
	if (!Number.isFinite(options.marginMm) || options.marginMm < 0) {
		throw new Error('Der Seitenrand muss endlich und mindestens 0 mm sein.');
	}
	if (!Number.isFinite(options.tabMm) || options.tabMm - options.marginMm < 4) {
		throw new Error('Die Klebelasche muss mindestens 4 mm über den Seitenrand hinausragen.');
	}
	if (
		!['a3', 'a4'].includes(options.paper) ||
		!['landscape', 'portrait'].includes(options.orientation) ||
		!['height', 'width'].includes(options.sizeAxis)
	) {
		throw new Error('Papierformat, Ausrichtung oder Größenachse ist ungültig.');
	}

	const shortSide = options.paper === 'a4' ? 210 : 297;
	const longSide = options.paper === 'a4' ? 297 : 420;
	const pageWidth = options.orientation === 'portrait' ? shortSide : longSide;
	const pageHeight = options.orientation === 'portrait' ? longSide : shortSide;
	const margin = options.marginMm === 0 ? 0 : options.marginMm;
	const tab = options.tabMm;
	const cut = margin + 5;
	const tileWidth = pageWidth - cut - tab;
	const tileHeight = pageHeight - cut - tab;
	if (!isPositiveFinite(tileWidth) || !isPositiveFinite(tileHeight)) {
		throw new Error('Seitenrand und Klebelasche lassen keine nutzbare Druckfläche übrig.');
	}

	const targetSize = options.sizeCm * 10;
	const scale = targetSize / source[options.sizeAxis];
	const width = options.sizeAxis === 'width' ? targetSize : source.width * scale;
	const height = options.sizeAxis === 'height' ? targetSize : source.height * scale;
	if (!isPositiveFinite(width) || !isPositiveFinite(height) || !isPositiveFinite(scale)) {
		throw new Error('Die berechneten Postermaße und der Maßstab müssen endlich und größer als 0 sein.');
	}

	const columns = tileCount(width, tileWidth);
	const rows = tileCount(height, tileHeight);
	// Check before allocating or iterating: very large dimensions must remain cheap to reject.
	if (!Number.isFinite(columns * rows) || columns * rows > 400) {
		throw new Error('Das Poster darf höchstens 400 Kacheln umfassen. Bitte die Postergröße reduzieren.');
	}

	const tiles: PosterLayout['tiles'] = [];
	for (let row = 0; row < rows; row++) {
		let rowLabel = '';
		for (let index = row + 1; index > 0; index = Math.floor((index - 1) / 26)) {
			rowLabel = String.fromCharCode(65 + ((index - 1) % 26)) + rowLabel;
		}
		for (let column = 0; column < columns; column++) {
			const x = column * tileWidth;
			const y = row * tileHeight;
			tiles.push({
				column,
				height: Math.min(tileHeight, height - y),
				id: `${rowLabel}${String(column + 1)}`,
				row,
				width: Math.min(tileWidth, width - x),
				x,
				y,
			});
		}
	}

	return {
		columns,
		cut,
		height,
		margin,
		pageHeight,
		pageWidth,
		rows,
		scale,
		tab,
		tileHeight,
		tiles,
		tileWidth,
		width,
	};
}

function isPositiveFinite(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}

function tileCount(size: number, pitch: number): number {
	const ratio = size / pitch;
	const nearest = Math.round(ratio);
	// Only absorb arithmetic roundoff (a few ULPs), not physically meaningful overshoots.
	if (nearest >= 1 && Math.abs(ratio - nearest) <= 8 * Number.EPSILON * Math.max(1, ratio)) {
		return nearest;
	}
	return Math.max(1, Math.ceil(ratio));
}
