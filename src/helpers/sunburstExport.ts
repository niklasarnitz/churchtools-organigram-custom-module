/* eslint-disable perfectionist/sort-modules */

import type { SunburstRenderData, SunburstSegmentLayout } from '../types/Sunburst';

const EXPORT_PADDING = 80;

export function createSunburstSvg(renderData: SunburstRenderData): string {
	const diameter = renderData.maxRadius * 2 + EXPORT_PADDING * 2;
	const center = renderData.maxRadius + EXPORT_PADDING;
	const segments = renderData.segments
		.map(
			(segment) =>
				`<g><title>${escapeXml(segment.pathTitles.join(' -> '))}</title><path d="${arcPath(segment, center)}" fill="${segment.fillColor}" stroke="${segment.strokeColor}" stroke-width="1"/></g>`,
		)
		.join('');
	const labels = renderData.labels
		.filter((label) => label.isVisible)
		.map((label) => {
			const segment = renderData.segmentByNodeId[label.nodeId];
			if (label.orientation === 'tangential') {
				const lineHeight = label.fontSize * 1.05;
				const textRadiusBase = (segment.innerRadius + segment.outerRadius) / 2;
				const textPaths = label.lines
					.map((line, index) => {
						const lineOffset = (index - (label.lines.length - 1) / 2) * lineHeight;
						const textRadius = textRadiusBase + lineOffset;
						const pathId = `sunburst-label-${String(label.nodeId)}-${String(index)}`;
						const pathData = textArcPath(segment, center, textRadius);
						return `<path id="${pathId}" d="${pathData}" fill="none"/><text font-family="Lato, sans-serif" font-size="${String(label.fontSize)}" font-weight="500" fill="${readableTextColor(segment.fillColor)}"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escapeXml(line)}</textPath></text>`;
					})
					.join('');
				return `<g>${textPaths}</g>`;
			}

			const lines = label.lines
				.map(
					(line, index) =>
						`<tspan x="0" dy="${String(index === 0 ? -((label.lines.length - 1) * label.fontSize * 1.05) / 2 : label.fontSize * 1.05)}">${escapeXml(line)}</tspan>`,
				)
				.join('');
			return `<g transform="translate(${String(center + label.x)} ${String(center + label.y)}) rotate(${String(label.rotation)})"><text text-anchor="middle" dominant-baseline="middle" font-family="Lato, sans-serif" font-size="${String(label.fontSize)}" font-weight="500" fill="${readableTextColor(segment.fillColor)}">${lines}</text></g>`;
		})
		.join('');
	const centerLabel = renderData.centerLabel ? createCenterLabelSvg(renderData.centerLabel, center) : '';

	return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${String(diameter)}" height="${String(diameter)}" viewBox="0 0 ${String(diameter)} ${String(diameter)}"><rect width="100%" height="100%" fill="#ffffff"/>${segments}${centerLabel}${labels}</svg>`;
}

export function renderSunburstToCanvas(
	ctx: CanvasRenderingContext2D,
	renderData: SunburstRenderData,
	size: number,
): void {
	const scale = (size - EXPORT_PADDING * 2) / (renderData.maxRadius * 2);
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, size, size);
	ctx.save();
	ctx.translate(size / 2, size / 2);
	ctx.scale(scale, scale);

	for (const segment of renderData.segments) {
		traceArc(ctx, segment);
		ctx.fillStyle = segment.fillColor;
		ctx.fill();
		ctx.strokeStyle = segment.strokeColor;
		ctx.lineWidth = 1 / scale;
		ctx.stroke();
	}

	for (const label of renderData.labels) {
		if (!label.isVisible) continue;
		const segment = renderData.segmentByNodeId[label.nodeId];
		ctx.save();
		traceArc(ctx, segment);
		ctx.clip();
		ctx.fillStyle = readableTextColor(segment.fillColor);
		ctx.font = `500 ${String(label.fontSize)}px Lato, sans-serif`;

		if (label.orientation === 'tangential') {
			const lineHeight = label.fontSize * 1.05;
			const textRadiusBase = (segment.innerRadius + segment.outerRadius) / 2;
			for (const [index, line] of label.lines.entries()) {
				const lineOffset = (index - (label.lines.length - 1) / 2) * lineHeight;
				drawTextOnArc(ctx, line, textRadiusBase + lineOffset, segment);
			}
		} else {
			ctx.translate(label.x, label.y);
			ctx.rotate((label.rotation * Math.PI) / 180);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const lineHeight = label.fontSize * 1.05;
			const firstLineY = -((label.lines.length - 1) * lineHeight) / 2;
			for (const [index, line] of label.lines.entries()) {
				ctx.fillText(line, 0, firstLineY + index * lineHeight);
			}
		}
		ctx.restore();
	}

	if (renderData.centerLabel) {
		drawCenterLabel(ctx, renderData.centerLabel);
	}
	ctx.restore();
}

function arcPath(segment: SunburstSegmentLayout, center: number): string {
	const start = segment.startAngle - Math.PI / 2;
	const end = segment.endAngle - Math.PI / 2;
	const largeArc = segment.endAngle - segment.startAngle > Math.PI ? 1 : 0;
	const outerStart = pointAt(segment.outerRadius, start, center);
	const outerEnd = pointAt(segment.outerRadius, end, center);
	const innerEnd = pointAt(segment.innerRadius, end, center);
	const innerStart = pointAt(segment.innerRadius, start, center);
	return `M ${String(outerStart.x)} ${String(outerStart.y)} A ${String(segment.outerRadius)} ${String(segment.outerRadius)} 0 ${String(largeArc)} 1 ${String(outerEnd.x)} ${String(outerEnd.y)} L ${String(innerEnd.x)} ${String(innerEnd.y)} A ${String(segment.innerRadius)} ${String(segment.innerRadius)} 0 ${String(largeArc)} 0 ${String(innerStart.x)} ${String(innerStart.y)} Z`;
}

function createCenterLabelSvg(centerLabel: NonNullable<SunburstRenderData['centerLabel']>, center: number): string {
	const lineHeight = centerLabel.fontSize * 1.05;
	const lines = centerLabel.lines
		.map(
			(line, index) =>
				`<tspan x="${String(center)}" dy="${String(index === 0 ? -((centerLabel.lines.length - 1) * lineHeight) / 2 : lineHeight)}">${escapeXml(line)}</tspan>`,
		)
		.join('');
	return `<circle cx="${String(center)}" cy="${String(center)}" r="${String(centerLabel.radius)}" fill="${centerLabel.fillColor}" stroke="${centerLabel.strokeColor}" stroke-width="2"/><text x="${String(center)}" y="${String(center)}" text-anchor="middle" dominant-baseline="middle" font-family="Lato, sans-serif" font-size="${String(centerLabel.fontSize)}" font-weight="500" fill="${readableTextColor(centerLabel.fillColor)}">${lines}</text>`;
}

function drawTextOnArc(
	ctx: CanvasRenderingContext2D,
	text: string,
	radius: number,
	segment: SunburstSegmentLayout,
): void {
	if (!text) return;

	const glyphWidths = Array.from(text, (character) => ctx.measureText(character).width);
	const totalWidth = glyphWidths.reduce((sum, width) => sum + width, 0);
	if (totalWidth <= 0 || radius <= 0) return;

	const centerAngle = segment.midAngle - Math.PI / 2;
	const useReversedDirection = Math.sin(centerAngle) > 0;
	const direction = useReversedDirection ? -1 : 1;
	let currentAngle = centerAngle - direction * (totalWidth / (2 * radius));

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const characters = Array.from(text);
	for (const [index, character] of characters.entries()) {
		const glyphWidth = glyphWidths[index] ?? 0;
		const glyphAngle = glyphWidth / radius;
		const angle = currentAngle + direction * (glyphAngle / 2);
		const point = pointAt(radius, angle, 0);
		let tangentAngle = angle + Math.PI / 2;
		if (useReversedDirection) tangentAngle += Math.PI;

		ctx.save();
		ctx.translate(point.x, point.y);
		ctx.rotate(tangentAngle);
		ctx.fillText(character, 0, 0);
		ctx.restore();

		currentAngle += direction * glyphAngle;
	}
}

function drawCenterLabel(
	ctx: CanvasRenderingContext2D,
	centerLabel: NonNullable<SunburstRenderData['centerLabel']>,
): void {
	ctx.save();
	ctx.fillStyle = centerLabel.fillColor;
	ctx.beginPath();
	ctx.arc(0, 0, centerLabel.radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = centerLabel.strokeColor;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.fillStyle = readableTextColor(centerLabel.fillColor);
	ctx.font = `500 ${String(centerLabel.fontSize)}px Lato, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	const lineHeight = centerLabel.fontSize * 1.05;
	const firstLineY = -((centerLabel.lines.length - 1) * lineHeight) / 2;
	for (const [index, line] of centerLabel.lines.entries()) {
		ctx.fillText(line, 0, firstLineY + index * lineHeight);
	}
	ctx.restore();
}

function escapeXml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pointAt(radius: number, angle: number, center: number): { x: number; y: number } {
	return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}

function readableTextColor(hex: string): string {
	const value = Number.parseInt(hex.replace('#', ''), 16);
	const red = (value >> 16) & 0xff;
	const green = (value >> 8) & 0xff;
	const blue = value & 0xff;
	return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#0f172a' : '#ffffff';
}

function textArcPath(segment: SunburstSegmentLayout, center: number, radius: number): string {
	const useReversedDirection = Math.sin(segment.midAngle - Math.PI / 2) > 0;
	const start = useReversedDirection ? segment.endAngle - Math.PI / 2 : segment.startAngle - Math.PI / 2;
	const end = useReversedDirection ? segment.startAngle - Math.PI / 2 : segment.endAngle - Math.PI / 2;
	const largeArc = Math.abs(segment.endAngle - segment.startAngle) > Math.PI ? 1 : 0;
	const sweepFlag = useReversedDirection ? 0 : 1;
	const startPoint = pointAt(radius, start, center);
	const endPoint = pointAt(radius, end, center);
	return `M ${String(startPoint.x)} ${String(startPoint.y)} A ${String(radius)} ${String(radius)} 0 ${String(largeArc)} ${String(sweepFlag)} ${String(endPoint.x)} ${String(endPoint.y)}`;
}

function traceArc(ctx: CanvasRenderingContext2D, segment: SunburstSegmentLayout): void {
	ctx.beginPath();
	ctx.arc(0, 0, segment.outerRadius, segment.startAngle - Math.PI / 2, segment.endAngle - Math.PI / 2);
	ctx.arc(0, 0, segment.innerRadius, segment.endAngle - Math.PI / 2, segment.startAngle - Math.PI / 2, true);
	ctx.closePath();
}
