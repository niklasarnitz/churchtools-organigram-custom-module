/** Arial and PDF's built-in Helvetica have compatible Latin metrics, without network fonts. */
export const EXPORT_FONT_FAMILY = 'Arial, Helvetica, sans-serif';

export function fitExportText(
	ctx: CanvasRenderingContext2D,
	text: string,
	width: number,
	fontSize: number,
	bold = false,
	spacing = 0,
): string {
	ctx.font = `${bold ? 'bold ' : ''}${String(fontSize)}px ${EXPORT_FONT_FAMILY}`;
	ctx.letterSpacing = '0px';
	// SVG includes the trailing letter-spacing in its text advance as well.
	const measure = (value: string) => ctx.measureText(value).width + Array.from(value).length * spacing;
	if (measure(text) <= width) return text;
	const chars = Array.from(text);
	let low = 0;
	let high = chars.length;
	while (low < high) {
		const mid = Math.ceil((low + high) / 2);
		if (measure(`${chars.slice(0, mid).join('')}…`) <= width) low = mid;
		else high = mid - 1;
	}
	return `${chars.slice(0, low).join('').trimEnd()}…`;
}

/** Two readable lines in the existing header, without changing graph/edge geometry. */
export function wrapExportTitle(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
	if (fitExportText(ctx, text, width, 14, true) === text) return [text];
	const words = text.trim().split(/\s+/u);
	let first = '';
	while (words.length > 1) {
		const candidate = first ? `${first} ${words[0]}` : words[0];
		if (fitExportText(ctx, candidate, width, 14, true) !== candidate) break;
		first = candidate;
		words.shift();
	}
	return first
		? [first, fitExportText(ctx, words.join(' '), width, 14, true)]
		: [fitExportText(ctx, text, width, 14, true)];
}
