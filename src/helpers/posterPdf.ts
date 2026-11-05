import type jsPDF from 'jspdf';

import type { PosterLayout } from './posterLayout';

export interface PosterImagePlacement {
	height: number;
	width: number;
	x: number;
	y: number;
}

// The renderer is injected so geometry and actual PDF pages can be tested without a browser or server.
export async function renderPosterPdf(
	doc: jsPDF,
	layout: PosterLayout,
	drawImage: (placement: PosterImagePlacement) => Promise<void>,
): Promise<void> {
	const { cut, height, pageHeight, pageWidth, settings, tileHeight, tileWidth, width } = layout;
	doc.viewerPreferences({ Duplex: 'Simplex', PrintScaling: 'None' });
	for (const [index, tile] of layout.tiles.entries()) {
		if (index > 0) doc.addPage([pageWidth, pageHeight], settings.orientation);
		doc.saveGraphicsState();
		doc.rect(
			cut,
			cut,
			Math.min(tileWidth + settings.glue, width - tile.x),
			Math.min(tileHeight + settings.glue, height - tile.y),
			null,
		);
		doc.clip();
		doc.discardPath();
		await drawImage({ height, width, x: cut - tile.x, y: cut - tile.y });
		doc.restoreGraphicsState();

		// Triangle tips sit exactly on the seam; their bodies stay wholly on the glue tab.
		// Fill only (no stroke) avoids drawing outside the seam into the visible image.
		const markHalfWidth = settings.glue / Math.sqrt(3);
		const markInset = Math.max(10, markHalfWidth + 2);
		const labelOffset = markInset + markHalfWidth + 4;
		const marks: [number, number, boolean][] = [];
		if (tile.column < layout.columns - 1) {
			for (const y of [cut + markInset, cut + tileHeight - markInset]) marks.push([cut + tileWidth, y, true]);
		}
		if (tile.row < layout.rows - 1) {
			for (const x of [cut + markInset, cut + tileWidth - markInset]) marks.push([x, cut + tileHeight, false]);
		}
		for (const [x, y, right] of marks) {
			for (const [length, halfWidth, color] of [
				[settings.glue, markHalfWidth, 255],
				[settings.glue - 0.4, (settings.glue - 0.4) / Math.sqrt(3), 0],
			]) {
				doc.setFillColor(color, color, color);
				if (right) doc.triangle(x, y, x + length, y - halfWidth, x + length, y + halfWidth, 'F');
				else doc.triangle(x, y, x - halfWidth, y + length, x + halfWidth, y + length, 'F');
			}
		}

		// Marks end at the cut, entirely within the discarded top/left strips.
		doc.setDrawColor(60);
		doc.setLineWidth(0.15);
		for (const y of [settings.margin, pageHeight - settings.margin])
			doc.line(cut, y, cut, y + (y === settings.margin ? 4 : -4));
		for (const x of [settings.margin, pageWidth - settings.margin])
			doc.line(x, cut, x + (x === settings.margin ? 4 : -4), cut);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(80);
		doc.text(`${tile.label}  |  oben / links schneiden  |  100 %`, cut + 4, cut - 1.5);
		// Only the right and bottom tabs carry tile IDs; the next sheet covers them.
		doc.setFillColor(255, 255, 255);
		const labelWidth = doc.getTextWidth(tile.label) + 1;
		doc.rect(cut + tileWidth + settings.glue / 2 - labelWidth / 2, cut + labelOffset - 2.8, labelWidth, 3.5, 'F');
		doc.text(tile.label, cut + tileWidth + settings.glue / 2, cut + labelOffset, { align: 'center' });
		doc.setFillColor(255, 255, 255);
		doc.rect(
			cut + labelOffset - 0.5,
			cut + tileHeight + settings.glue / 2 - 2.8,
			doc.getTextWidth(`${tile.label} - Klebelasche unten`) + 1,
			3.5,
			'F',
		);
		doc.text(`${tile.label} - Klebelasche unten`, cut + labelOffset, cut + tileHeight + settings.glue / 2);
	}

	doc.addPage([pageWidth, pageHeight], settings.orientation);
	const margin = Math.max(10, settings.margin);
	doc.setTextColor(20);
	doc.setFontSize(15);
	doc.text('Poster: Übersicht und Montage', margin, margin + 5);
	doc.setFontSize(9);
	doc.text(
		`${settings.paper.toUpperCase()} | ${settings.orientation === 'portrait' ? 'Hochformat' : 'Querformat'} | Poster ${(width / 10).toFixed(1)} x ${(height / 10).toFixed(1)} cm | ${String(layout.columns)} Spalten x ${String(layout.rows)} Reihen`,
		margin,
		margin + 12,
	);
	doc.text('Dieses letzte Blatt NICHT mit dem Kachelstapel schneiden.', margin, margin + 18);

	const gridWidth = layout.columns * tileWidth;
	const gridHeight = layout.rows * tileHeight;
	const availableHeight = pageHeight - 2 * margin - 112;
	const scale = Math.min((pageWidth - 2 * margin) / gridWidth, availableHeight / gridHeight);
	const x = (pageWidth - gridWidth * scale) / 2;
	const y = margin + 24;
	await drawImage({ height: height * scale, width: width * scale, x, y });
	for (const tile of layout.tiles) {
		const tx = x + tile.x * scale;
		const ty = y + tile.y * scale;
		doc.setDrawColor(80);
		doc.setLineWidth(0.2);
		doc.rect(tx, ty, tileWidth * scale, tileHeight * scale);
		const fontSize = Math.min(9, tileWidth * scale * 1.2, tileHeight * scale * 1.2);
		doc.setFontSize(fontSize);
		const labelWidth = doc.getTextWidth(tile.label) + 2;
		doc.setFillColor(255, 255, 255);
		doc.rect(tx + 0.5, ty + 0.5, labelWidth, fontSize * 0.4 + 1, 'F');
		doc.setTextColor(0);
		doc.text(tile.label, tx + 1.5, ty + fontSize * 0.4);
	}
	doc.setDrawColor(0, 90, 170);
	doc.setLineWidth(0.5);
	doc.rect(x, y, width * scale, height * scale);

	let textY = y + gridHeight * scale + 6;
	doc.setFontSize(9);
	doc.setTextColor(20);
	const instructions = [
		'Blauer Rahmen: fertige Postergröße. Raster: Kacheln, zeilenweise von links nach rechts.',
		`1. Diese Übersicht beiseitelegen. Einseitig mit Tatsächliche Größe / 100 % drucken, keine Seitenanpassung. Druckrand mindestens ${String(settings.margin)} mm.`,
		`2. Kacheln deckungsgleich stapeln. Oben und links jeweils ${String(cut)} mm abschneiden (zwei gerade Stapelschnitte). Rechts und unten wird das Bild auf der Lasche wiederholt; der Druckrand bleibt frei.`,
		'3. Zuerst jede waagerechte Reihe separat kleben: A1, A2, ... als Streifen A; danach B1, B2, ... als Streifen B. Das nächste Blatt überdeckt die rechte Lasche. Beschnittene Kante an den Dreiecksspitzen auf der Klebelasche ausrichten. Die Dreiecke liegen unter dem nächsten Blatt.',
		'4. Kleine Punkte Fixogum nur zur vorläufigen Fixierung verwenden. Ablösbarkeit zuerst mit Papier und Probedruck testen. Den ganzen Streifen ausrichten, bei Bedarf vorsichtig lösen und korrigieren.',
		'5. Erst den fertigen Streifen dauerhaft sichern, z. B. mit Klebeband auf der Rückseite.',
		'6. Ganze Streifen von oben nach unten verbinden: B unter A, C unter B. Der nächste Streifen überdeckt die unteren Laschen. Über die gesamte Breite ausrichten, dann dauerhaft fixieren.',
		'7. Außenränder erst am fertigen Poster auf die angegebene Gesamtgröße beschneiden.',
	];
	for (const instruction of instructions) {
		const lines = doc.splitTextToSize(instruction, pageWidth - 2 * margin) as string[];
		doc.text(lines, margin, textY);
		textY += lines.length * 3.7 + 1.5;
	}
	if (textY > pageHeight - margin + 2)
		throw new Error(
			'Die Montageanleitung passt nicht auf das Übersichtsblatt. Bitte einen kleineren Druckrand wählen.',
		);
}
