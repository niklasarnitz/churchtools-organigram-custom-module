import type { SunburstRenderData, SunburstSegmentLayout } from '../types/Sunburst';

const EXPORT_PADDING = 80;

export function createSunburstSvg(renderData: SunburstRenderData): string {
	const diameter = renderData.maxRadius * 2 + EXPORT_PADDING * 2;
	const center = renderData.maxRadius + EXPORT_PADDING;
	const segments = renderData.segments
		.map(
			(segment) =>
				`<g><title>${escapeXml(segment.pathTitles.join(' -> '))}</title><path d="${arcPath(segment, center)}" fill="${segment.fillColor}" stroke="${segment.strokeColor}" stroke-width="2"/></g>`,
		)
		.join('');
	const labels = renderData.labels
		.filter((label) => label.isVisible)
		.map((label) => {
			const segment = renderData.segmentByNodeId[label.nodeId];
			const lines = label.lines
				.map(
					(line, index) =>
						`<tspan x="0" dy="${String(index === 0 ? -((label.lines.length - 1) * label.fontSize * 1.05) / 2 : label.fontSize * 1.05)}">${escapeXml(line)}</tspan>`,
				)
				.join('');
			return `<g transform="translate(${String(center + label.x)} ${String(center + label.y)}) rotate(${String(label.rotation)})"><text text-anchor="middle" dominant-baseline="middle" font-family="Lato, sans-serif" font-size="${String(label.fontSize)}" font-weight="500" fill="${readableTextColor(segment.fillColor)}">${lines}</text></g>`;
		})
		.join('');

	return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${String(diameter)}" height="${String(diameter)}" viewBox="0 0 ${String(diameter)} ${String(diameter)}"><rect width="100%" height="100%" fill="#ffffff"/>${segments}${labels}</svg>`;
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
		ctx.lineWidth = 2 / scale;
		ctx.stroke();
	}

	for (const label of renderData.labels) {
		if (!label.isVisible) continue;
		const segment = renderData.segmentByNodeId[label.nodeId];
		ctx.save();
		traceArc(ctx, segment);
		ctx.clip();
		ctx.translate(label.x, label.y);
		ctx.rotate((label.rotation * Math.PI) / 180);
		ctx.font = `500 ${String(label.fontSize)}px Lato, sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = readableTextColor(segment.fillColor);
		const lineHeight = label.fontSize * 1.05;
		const firstLineY = -((label.lines.length - 1) * lineHeight) / 2;
		for (const [index, line] of label.lines.entries()) {
			ctx.fillText(line, 0, firstLineY + index * lineHeight);
		}
		ctx.restore();
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

function traceArc(ctx: CanvasRenderingContext2D, segment: SunburstSegmentLayout): void {
	ctx.beginPath();
	ctx.arc(0, 0, segment.outerRadius, segment.startAngle - Math.PI / 2, segment.endAngle - Math.PI / 2);
	ctx.arc(0, 0, segment.innerRadius, segment.endAngle - Math.PI / 2, segment.startAngle - Math.PI / 2, true);
	ctx.closePath();
}
