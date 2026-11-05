import type jsPDF from 'jspdf';

import type { PosterLayout } from './pdfPosterLayout';

const ASSEMBLY_STEPS = [
	'Übersichtsblatt vor den Stapelschnitten herausnehmen und als unbeschnittene Montagevorlage bereitlegen.',
	'Alle Kachelblätter deckungsgleich stapeln. Oben und links an den gemeinsamen Schnittmarken beschneiden; rechts und unten bleiben Klebelaschen.',
	'Zuerst jede waagerechte Reihe separat von links nach rechts zusammensetzen (A1, A2, …; danach B1, B2, …). Das nächste Blatt auf die rechte Lasche legen. Auf einer ebenen Fläche obere Kanten und Bildübergänge ausrichten.',
	'Kleine Punkte Fixogum nur zur vorläufigen Fixierung verwenden. Ablösbarkeit vorher mit dem verwendeten Papier und einem Probedruck testen; bei Bedarf vorsichtig lösen und korrigieren.',
	'Erst den vollständig ausgerichteten Streifen dauerhaft sichern, zum Beispiel mit Klebeband auf der Rückseite.',
	'Danach die fertigen Streifen von oben nach unten verbinden: Streifen B unter A, dann C unter B. Den nächsten Streifen auf die unteren Laschen legen und über die ganze Breite ausrichten, bevor die Verbindung dauerhaft fixiert wird.',
	'Zum Schluss die überstehenden Außenränder am zusammengesetzten Poster auf die angegebene Gesamtgröße abschneiden.',
];

/** Render every tile at one physical scale; only the visible image rectangle is clipped. */
export async function createPosterPDF(svg: Element, layout: PosterLayout, PDF: typeof jsPDF): Promise<jsPDF> {
	const orientation = layout.pageWidth > layout.pageHeight ? 'landscape' : 'portrait';
	const format = [layout.pageWidth, layout.pageHeight];
	const doc = new PDF({ compress: true, format, orientation, unit: 'mm' });
	doc.setProperties({ title: 'Organigramm – PDF-Poster' });
	for (const [index, tile] of layout.tiles.entries()) {
		if (index > 0) doc.addPage(format, orientation);
		// Keep the dialog and live view responsive between potentially expensive SVG renders.
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		doc.saveGraphicsState();
		try {
			doc.rect(layout.cut, layout.cut, tile.width, tile.height, null);
			doc.clip();
			doc.discardPath();
			await doc.svg(svg, {
				height: layout.height,
				width: layout.width,
				x: layout.cut - tile.x,
				y: layout.cut - tile.y,
			});
		} finally {
			doc.restoreGraphicsState();
		}
		doc.setDrawColor(50);
		doc.setLineWidth(0.2);
		// These two marks are entirely in the discarded top/left strips.
		doc.line(layout.margin, layout.cut, layout.cut - 0.5, layout.cut);
		doc.line(layout.cut, layout.margin, layout.cut, layout.cut - 0.5);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7);
		doc.setTextColor(70);
		doc.text(`Oben / links: ${String(layout.cut)} mm abschneiden`, layout.cut + 2, layout.margin + 3);
		// Labels sit inside the printable part of each total tab (not its outer printer margin).
		const right = layout.pageWidth - layout.tab + 3;
		const bottom = layout.pageHeight - layout.tab + 3;
		doc.text(tile.id, right, layout.cut + 2 + doc.getTextWidth(tile.id), { angle: 90 });
		doc.text(tile.id, layout.cut + 2, bottom);
	}
	doc.addPage(format, orientation);
	await drawAssemblyPage(doc, svg, layout);
	return doc;
}

/** SVG extent, including export padding; independent of camera and viewBox origin. */
export function getSvgSize(svg: Element): { height: number; width: number } {
	const viewBox = svg
		.getAttribute('viewBox')
		?.trim()
		.split(/[\s,]+/)
		.map(Number);
	const width = viewBox ? viewBox[2] : Number.parseFloat(svg.getAttribute('width') ?? '');
	const height = viewBox ? viewBox[3] : Number.parseFloat(svg.getAttribute('height') ?? '');
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error('Das Organigramm hat keine gültige Exportgröße.');
	}
	return { height, width };
}

async function drawAssemblyPage(doc: jsPDF, svg: Element, layout: PosterLayout): Promise<void> {
	const margin = Math.max(10, layout.margin);
	const availableWidth = layout.pageWidth - margin * 2;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	const lineHeight = (9 / doc.internal.scaleFactor) * doc.getLineHeightFactor();
	const steps = ASSEMBLY_STEPS.map((text, index) => wrap(doc, `${String(index + 1)}. ${text}`, availableWidth));
	const stepsHeight = steps.reduce((sum, lines) => sum + lines.length * lineHeight + 2, 0);
	const instructionsY = layout.pageHeight - margin - stepsHeight + lineHeight;
	const imageY = margin + 32;
	const imageSpace = instructionsY - lineHeight - imageY - 7;
	if (imageSpace < 20 || availableWidth < 40) {
		throw new Error('Der Druckrand lässt zu wenig Platz für eine lesbare Montageübersicht. Bitte verkleinern.');
	}
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(15);
	doc.text('Montageübersicht – nicht mitschneiden', margin, margin + 5);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.text(
		`${(layout.width / 10).toFixed(1)} × ${(layout.height / 10).toFixed(1)} cm · ${String(layout.columns)} Spalten × ${String(layout.rows)} Reihen · ${String(layout.tiles.length)} Kachelblätter + diese Übersicht`,
		margin,
		margin + 12,
		{ maxWidth: availableWidth },
	);
	doc.setFont('helvetica', 'bold');
	doc.text('Einseitig drucken: Tatsächliche Größe / 100 %, keine Seitenanpassung.', margin, margin + 23, {
		maxWidth: availableWidth,
	});
	const scale = Math.min(availableWidth / layout.width, imageSpace / layout.height);
	const imageWidth = layout.width * scale;
	const imageHeight = layout.height * scale;
	const imageX = margin + (availableWidth - imageWidth) / 2;
	await doc.svg(svg, { height: imageHeight, width: imageWidth, x: imageX, y: imageY });
	doc.setDrawColor(40);
	doc.setLineWidth(0.2);
	for (const tile of layout.tiles) {
		const x = imageX + tile.x * scale;
		const y = imageY + tile.y * scale;
		const width = tile.width * scale;
		const height = tile.height * scale;
		doc.rect(x, y, width, height);
		doc.setFont('helvetica', 'bold');
		const fontSize = Math.min(8, (width * doc.internal.scaleFactor) / (tile.id.length * 0.8), height);
		doc.setFontSize(fontSize);
		const labelWidth = doc.getTextWidth(tile.id) + 1;
		doc.setFillColor(255, 255, 255);
		doc.rect(x + 0.5, y + 0.5, labelWidth, fontSize / doc.internal.scaleFactor + 1, 'F');
		doc.setTextColor(30);
		// Corner badges avoid masking the central card titles in the assembly reference.
		doc.text(tile.id, x + 1, y + 0.5 + fontSize / doc.internal.scaleFactor);
	}
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	doc.setTextColor(30);
	let y = instructionsY;
	for (const lines of steps) {
		doc.text(lines, margin, y);
		y += lines.length * lineHeight + 2;
	}
}

function wrap(doc: jsPDF, text: string, width: number): string[] {
	const lines: unknown = doc.splitTextToSize(text, width);
	return Array.isArray(lines) ? lines.filter((line): line is string => typeof line === 'string') : [text];
}
