import { Download, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { PosterOptions } from '../../helpers/pdfPosterLayout';

import { getSvgSize } from '../../helpers/pdfPosterExport';
import { calculatePosterLayout } from '../../helpers/pdfPosterLayout';
import { useGenerateReflowData } from '../../selectors/useGenerateReflowData';
import { useGenerateSVGData } from '../../selectors/useGenerateSVGData';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function PdfPosterExportDialog({
	disabled,
	onExport,
}: {
	disabled: boolean;
	onExport: (options: PosterOptions) => Promise<void>;
}) {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [options, setOptions] = useState<PosterOptions>({
		marginMm: 5,
		orientation: 'portrait',
		paper: 'a4',
		sizeAxis: 'width',
		sizeCm: 80,
		tabMm: 15,
	});
	const data = useGenerateReflowData();
	const generateSVG = useGenerateSVGData();
	const source = useMemo(() => {
		if (!open || data.isCalculating || !data.nodes.length) return undefined;
		try {
			const markup = generateSVG('pdf');
			return {
				markup,
				size: getSvgSize(new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement),
			};
		} catch {
			return undefined;
		}
	}, [open, data, generateSVG]);
	const preview = useMemo(() => {
		if (data.isCalculating) return { message: 'Das Layout wird noch berechnet. Bitte kurz warten.' };
		if (!source) return { message: 'Keine exportierbare Darstellung. Bitte die Gruppenfilter prüfen.' };
		try {
			return { layout: calculatePosterLayout(source.size, options), message: '' };
		} catch (cause) {
			return { message: cause instanceof Error ? cause.message : 'Bitte die Druckeinstellungen prüfen.' };
		}
	}, [data.isCalculating, options, source]);
	const { layout } = preview;
	const change = (next: Partial<PosterOptions>) => {
		setOptions((previous) => ({ ...previous, ...next }));
		setError('');
	};
	return (
		<Dialog
			onOpenChange={(value) => {
				if (!busy) {
					setOpen(value);
					setError('');
				}
			}}
			open={open}
		>
			<DialogTrigger asChild>
				<Button className="w-full" disabled={disabled} variant="outline">
					<Download className="size-4" />
					PDF-Poster drucken
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] overflow-y-auto text-slate-900 sm:max-w-xl dark:text-slate-100">
				<DialogHeader>
					<DialogTitle>PDF-Poster drucken</DialogTitle>
					<DialogDescription>
						Das aktuelle Organigramm auf mehrere Blätter verteilen, ausschneiden und zusammenkleben.
					</DialogDescription>
				</DialogHeader>
				<form
					className="min-w-0 space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!layout || busy || disabled) return;
						setBusy(true);
						setError('');
						void onExport(options)
							.then(() => {
								setOpen(false);
							})
							.catch((cause: unknown) => {
								setError(
									cause instanceof Error
										? cause.message
										: 'Der PDF-Export ist fehlgeschlagen. Bitte erneut versuchen.',
								);
							})
							.finally(() => {
								setBusy(false);
							});
					}}
				>
					<fieldset className="min-w-0 space-y-4 disabled:opacity-60" disabled={busy}>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1 text-sm">
								<label htmlFor="poster-paper">Papierformat</label>
								<Select
									onValueChange={(value) => {
										change({ paper: value === 'a3' ? 'a3' : 'a4' });
									}}
									value={options.paper}
								>
									<SelectTrigger id="poster-paper">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="a4">A4</SelectItem>
										<SelectItem value="a3">A3</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1 text-sm">
								<label htmlFor="poster-orientation">Ausrichtung</label>
								<Select
									onValueChange={(value) => {
										change({ orientation: value === 'landscape' ? 'landscape' : 'portrait' });
									}}
									value={options.orientation}
								>
									<SelectTrigger id="poster-orientation">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="portrait">Hochformat</SelectItem>
										<SelectItem value="landscape">Querformat</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1 text-sm">
								<label htmlFor="poster-axis">Zielgröße festlegen</label>
								<Select
									onValueChange={(value) => {
										change({ sizeAxis: value === 'height' ? 'height' : 'width' });
									}}
									value={options.sizeAxis}
								>
									<SelectTrigger id="poster-axis">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="width">Posterbreite</SelectItem>
										<SelectItem value="height">Posterhöhe</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<NumberField
								label={`${options.sizeAxis === 'width' ? 'Breite' : 'Höhe'} (cm)`}
								min={0.1}
								onChange={(sizeCm) => {
									change({ sizeCm });
								}}
								value={options.sizeCm}
							/>
							<NumberField
								label="Druckrand (mm)"
								min={0}
								onChange={(marginMm) => {
									change({ marginMm });
								}}
								value={options.marginMm}
							/>
							<NumberField
								label="Klebelasche gesamt (mm)"
								min={0}
								onChange={(tabMm) => {
									change({ tabMm });
								}}
								value={options.tabMm}
							/>
						</div>
						<p className="text-xs text-slate-600 dark:text-slate-400">
							Die Lasche enthält den unbedruckbaren Druckrand. Zusätzlich müssen mindestens 4 mm für die
							Blattkennung bleiben. Oben und links werden jeweils Druckrand + 5 mm abgeschnitten.
						</p>
					</fieldset>
					<div aria-live="polite" className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
						{layout && source ? (
							<>
								<p className="text-sm font-semibold">
									{(layout.width / 10).toFixed(1)} × {(layout.height / 10).toFixed(1)} cm
								</p>
								<p className="mt-1 text-sm">
									{layout.columns} Spalten × {layout.rows} Reihen = {layout.tiles.length}{' '}
									Kachelblätter + 1 Montageübersicht
								</p>
								<svg
									aria-label="Kachelaufteilung des Posters"
									className="mt-3 h-36 w-full bg-white"
									role="img"
									viewBox={`0 0 ${String(layout.width)} ${String(layout.height)}`}
								>
									<image
										height={layout.height}
										href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(source.markup)}`}
										width={layout.width}
									/>
									{layout.tiles.map((tile) => (
										<g key={tile.id}>
											<rect
												fill="none"
												height={tile.height}
												stroke="#475569"
												vectorEffect="non-scaling-stroke"
												width={tile.width}
												x={tile.x}
												y={tile.y}
											/>
											<text
												dominantBaseline="middle"
												fill="#0f172a"
												fontSize={Math.min(
													tile.width / 4,
													tile.height / 4,
													Math.max(layout.width, layout.height) / 30,
												)}
												paintOrder="stroke"
												stroke="white"
												strokeWidth={2}
												textAnchor="middle"
												x={tile.x + tile.width / 2}
												y={tile.y + tile.height / 2}
											>
												{tile.id}
											</text>
										</g>
									))}
								</svg>
							</>
						) : (
							<p className="text-sm text-amber-700 dark:text-amber-300">{preview.message}</p>
						)}
					</div>
					<p className="text-sm">
						Einseitig mit <strong>Tatsächliche Größe / 100 %</strong> drucken, ohne Seitenanpassung. Das
						letzte Blatt enthält Raster und Montageanleitung; vor den Stapelschnitten herausnehmen.
					</p>
					{error && (
						<p className="text-sm text-red-700 dark:text-red-300" role="alert">
							{error}
						</p>
					)}
					<div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
						<Button
							disabled={busy}
							onClick={() => {
								setOpen(false);
							}}
							type="button"
							variant="outline"
						>
							Abbrechen
						</Button>
						<Button disabled={!layout || busy || disabled} type="submit">
							{busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
							{busy ? 'PDF wird erstellt …' : 'Poster-PDF herunterladen'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function NumberField({
	label,
	min,
	onChange,
	value,
}: {
	label: string;
	min: number;
	onChange: (value: number) => void;
	value: number;
}) {
	return (
		<label className="block min-w-0 space-y-1 text-sm">
			<span>{label}</span>
			<input
				className="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-transparent px-3 focus-visible:outline-2 focus-visible:outline-slate-500 dark:border-slate-700"
				min={min}
				onChange={(event) => {
					onChange(event.currentTarget.valueAsNumber);
				}}
				required
				step="any"
				type="number"
				value={Number.isFinite(value) ? value : ''}
			/>
		</label>
	);
}
