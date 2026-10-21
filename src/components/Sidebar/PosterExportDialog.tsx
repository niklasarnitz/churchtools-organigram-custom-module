import { Download } from 'lucide-react';
import { useState } from 'react';

import type { PosterSettings } from '../../helpers/posterLayout';

import { calculatePosterLayout } from '../../helpers/posterLayout';
import { renderPosterPdf } from '../../helpers/posterPdf';
import { useAppStore } from '../../state/useAppStore';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

const controlClass = 'w-full rounded border border-slate-300 bg-transparent p-2 dark:border-slate-600';

export function PosterExportDialog({
	fileName,
	prepareSource,
}: {
	fileName: string;
	prepareSource: () => { element: Element; height: number; width: number };
}) {
	const [source, setSource] = useState<null | ReturnType<typeof prepareSource>>(null);
	const [open, setOpen] = useState(false);
	const [error, setError] = useState('');
	const [settings, setSettings] = useState<PosterSettings>({
		dimension: 'width',
		glue: 10,
		margin: 5,
		orientation: 'portrait',
		paper: 'a4',
		sizeCm: 60,
	});
	const isExporting = useAppStore((s) => s.isExporting);
	const setIsExporting = useAppStore((s) => s.setIsExporting);
	let layout: ReturnType<typeof calculatePosterLayout> | undefined;
	let validationError = '';
	try {
		if (source) layout = calculatePosterLayout(source.width, source.height, settings);
	} catch (cause) {
		validationError = cause instanceof Error ? cause.message : 'Ungültige Einstellungen.';
	}
	const update = <K extends keyof PosterSettings>(key: K, value: PosterSettings[K]) => {
		setSettings((previous) => ({ ...previous, [key]: value }));
		setError('');
	};
	const exportPoster = async () => {
		if (!source || !layout) return;
		setIsExporting(true);
		setError('');
		try {
			const { default: PDF } = await import('jspdf');
			await import('svg2pdf.js');
			const doc = new PDF({
				compress: true,
				format: settings.paper,
				orientation: settings.orientation,
				unit: 'mm',
			});
			await renderPosterPdf(doc, layout, async (placement) => {
				await doc.svg(source.element, placement);
			});
			doc.save(fileName);
			setOpen(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Der PDF-Export ist fehlgeschlagen.');
		} finally {
			setIsExporting(false);
		}
	};
	const preview = source
		? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(source.element))}`
		: '';
	return (
		<Dialog
			onOpenChange={(value) => {
				if (isExporting) return;
				setOpen(value);
				if (value) {
					setError('');
					setSource(null);
					try {
						setSource(prepareSource());
					} catch (cause) {
						setError(cause instanceof Error ? cause.message : 'Keine Exportgrafik verfügbar.');
					}
				}
			}}
			open={open}
		>
			<DialogTrigger asChild>
				<Button className="w-full" disabled={isExporting} variant="outline">
					<Download className="size-4" />
					PDF-Poster drucken
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>PDF-Poster drucken</DialogTitle>
					<DialogDescription>
						Papier und Gesamtgröße wählen. Alle Kacheln erhalten dieselben zwei Stapelschnitte.
					</DialogDescription>
				</DialogHeader>
				<fieldset className="grid grid-cols-2 gap-3 text-sm" disabled={isExporting}>
					<label>
						Papierformat
						<select
							className={controlClass}
							onChange={(e) => {
								update('paper', e.target.value as PosterSettings['paper']);
							}}
							value={settings.paper}
						>
							<option value="a4">A4 (210 × 297 mm)</option>
							<option value="a3">A3 (297 × 420 mm)</option>
						</select>
					</label>
					<label>
						Ausrichtung
						<select
							className={controlClass}
							onChange={(e) => {
								update('orientation', e.target.value as PosterSettings['orientation']);
							}}
							value={settings.orientation}
						>
							<option value="portrait">Hochformat</option>
							<option value="landscape">Querformat</option>
						</select>
					</label>
					<label>
						Zielmaß
						<select
							className={controlClass}
							onChange={(e) => {
								update('dimension', e.target.value as PosterSettings['dimension']);
							}}
							value={settings.dimension}
						>
							<option value="width">Posterbreite</option>
							<option value="height">Posterhöhe</option>
						</select>
					</label>
					<label>
						Größe (cm)
						<input
							className={controlClass}
							min="1"
							onChange={(e) => {
								update('sizeCm', e.target.valueAsNumber);
							}}
							step="0.1"
							type="number"
							value={Number.isNaN(settings.sizeCm) ? '' : settings.sizeCm}
						/>
					</label>
					<label>
						Druckrand (mm)
						<input
							className={controlClass}
							max="30"
							min="3"
							onChange={(e) => {
								update('margin', e.target.valueAsNumber);
							}}
							type="number"
							value={Number.isNaN(settings.margin) ? '' : settings.margin}
						/>
					</label>
					<label>
						Bedruckbare Klebelasche (mm)
						<input
							className={controlClass}
							max="30"
							min="8"
							onChange={(e) => {
								update('glue', e.target.valueAsNumber);
							}}
							type="number"
							value={Number.isNaN(settings.glue) ? '' : settings.glue}
						/>
					</label>
				</fieldset>
				{layout && (
					<>
						<p aria-live="polite" className="text-sm">
							{(layout.width / 10).toFixed(1)} × {(layout.height / 10).toFixed(1)} cm · {layout.columns}{' '}
							Spalten × {layout.rows} Reihen · {layout.tiles.length} Kachelblätter + 1 Übersichtsblatt
						</p>
						<svg
							aria-label="Kachelvorschau: Zeilen zuerst zu Streifen verbinden"
							className="h-56 w-full bg-white"
							role="img"
							viewBox={`0 0 ${String(layout.columns * layout.tileWidth)} ${String(layout.rows * layout.tileHeight)}`}
						>
							<image height={layout.height} href={preview} width={layout.width} />
							{layout.tiles.map((tile) => (
								<g key={tile.label}>
									<rect
										fill="none"
										height={layout.tileHeight}
										stroke="#475569"
										strokeWidth="1"
										width={layout.tileWidth}
										x={tile.x}
										y={tile.y}
									/>
									<rect fill="white" height="16" width="30" x={tile.x + 2} y={tile.y + 2} />
									<text fill="black" fontSize="12" x={tile.x + 4} y={tile.y + 14}>
										{tile.label}
									</text>
								</g>
							))}
							<rect
								fill="none"
								height={layout.height}
								stroke="#005aaa"
								strokeWidth="2"
								width={layout.width}
							/>
						</svg>
						<p className="text-sm">
							Blau: fertige Postergröße. Oben und links je {layout.cut} mm abschneiden. Rechts und unten
							bleiben je {settings.glue + settings.margin} mm Lasche einschließlich Druckrand.
						</p>
					</>
				)}
				<p className="text-sm">
					Das Bild läuft rechts und unten in die bedruckbare Lasche weiter. Dreiecksspitzen auf den
					Klebelaschen zeigen die Anlegekante und werden beim Kleben verdeckt. Einseitig mit{' '}
					<strong>100 % / Tatsächliche Größe</strong> drucken. Druckrand an den Drucker anpassen. Das letzte
					Blatt vor dem Schneiden herausnehmen. Zuerst waagerechte Streifen, dann die Streifen untereinander
					kleben. Anleitung mit Fixogum und endgültiger Befestigung liegt bei.
				</p>
				{(error || validationError) && (
					<p className="text-sm text-red-600" role="alert">
						{error || validationError}
					</p>
				)}
				<Button
					disabled={isExporting || !layout}
					onClick={() => {
						void exportPoster();
					}}
				>
					{isExporting ? 'PDF wird erstellt …' : 'Poster-PDF herunterladen'}
				</Button>
			</DialogContent>
		</Dialog>
	);
}
