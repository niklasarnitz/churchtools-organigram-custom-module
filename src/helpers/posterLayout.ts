export interface PosterLayout {
	columns: number;
	cut: number;
	height: number;
	pageHeight: number;
	pageWidth: number;
	rows: number;
	settings: PosterSettings;
	tileHeight: number;
	tiles: PosterTile[];
	tileWidth: number;
	width: number;
}

export interface PosterSettings {
	dimension: 'height' | 'width';
	glue: number;
	margin: number;
	orientation: 'landscape' | 'portrait';
	paper: 'a3' | 'a4';
	sizeCm: number;
}

export interface PosterTile {
	column: number;
	label: string;
	row: number;
	x: number;
	y: number;
}

export function calculatePosterLayout(
	sourceWidth: number,
	sourceHeight: number,
	settings: PosterSettings,
): PosterLayout {
	const { dimension, glue, margin, orientation, paper, sizeCm } = settings;
	if (
		![sourceWidth, sourceHeight, sizeCm, margin, glue].every(Number.isFinite) ||
		sourceWidth <= 0 ||
		sourceHeight <= 0 ||
		sizeCm <= 0
	) {
		throw new Error('Bitte eine positive, endliche Postergröße angeben.');
	}
	if (margin < 3 || margin > 30 || glue < 8 || glue > 30) {
		throw new Error('Druckrand: 3 bis 30 mm; bedruckbare Klebelasche: 8 bis 30 mm.');
	}
	const [short, long] = paper === 'a3' ? [297, 420] : [210, 297];
	const [pageWidth, pageHeight] = orientation === 'portrait' ? [short, long] : [long, short];
	// Five extra millimetres keep both cut marks inside the printable, discarded strips.
	const cut = margin + 5;
	const tileWidth = pageWidth - cut - margin - glue;
	const tileHeight = pageHeight - cut - margin - glue;
	const width = dimension === 'width' ? sizeCm * 10 : (sizeCm * 10 * sourceWidth) / sourceHeight;
	const height = dimension === 'height' ? sizeCm * 10 : (sizeCm * 10 * sourceHeight) / sourceWidth;
	const columns = Math.ceil(width / tileWidth - 1e-10);
	const rows = Math.ceil(height / tileHeight - 1e-10);
	if (columns < 1 || rows < 1 || columns * rows > 100) {
		throw new Error('Bitte eine Postergröße mit höchstens 100 Kachelblättern wählen.');
	}
	const tiles = Array.from({ length: columns * rows }, (_, index) => {
		const row = Math.floor(index / columns);
		const column = index % columns;
		return {
			column,
			label: `${rowLabel(row)}${String(column + 1)}`,
			row,
			x: column * tileWidth,
			y: row * tileHeight,
		};
	});
	return {
		columns,
		cut,
		height,
		pageHeight,
		pageWidth,
		rows,
		settings: { ...settings },
		tileHeight,
		tiles,
		tileWidth,
		width,
	};
}

export function rowLabel(row: number): string {
	let label = '';
	for (let n = row + 1; n > 0; n = Math.floor((n - 1) / 26)) {
		label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
	}
	return label;
}
