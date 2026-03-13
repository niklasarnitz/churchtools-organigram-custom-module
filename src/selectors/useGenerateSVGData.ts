import { useCallback } from 'react';

import type { PreviewGraphNodeData } from '../types/GraphNode';
import type { Edge, Node } from '../types/GraphTypes';

import { measureNodeCard } from '../components/WebGLRenderer/engine/drawNodeCard2D';
import { oklchToHex } from '../globals/Colors';
import { useAppStore } from '../state/useAppStore';
import { useGenerateReflowData } from './useGenerateReflowData';

const NODE_PADDING = 16;
const HEADER_PADDING_Y = 12;
const TITLE_FONT_SIZE = 14;
const GROUP_TYPE_FONT_SIZE = 10;
const ROLE_FONT_SIZE = 10;
const MEMBER_FONT_SIZE = 12;
const BADGE_PADDING_X = 8;
const BADGE_PADDING_Y = 4;
const BADGE_HEIGHT = MEMBER_FONT_SIZE + BADGE_PADDING_Y * 2;
const BADGE_GAP = 4;
const ROLE_GAP = 8;
const BORDER_RADIUS = 12;
const BORDER_WIDTH = 2;
const SVG_PADDING = 40;

export const useGenerateSVGData = () => {
	const data = useGenerateReflowData();
	const committedFilters = useAppStore((s) => s.committedFilters);
	const showGroupTypes = committedFilters?.showGroupTypes ?? true;

	return useCallback(() => {
		const nodes = data.nodes as Node<PreviewGraphNodeData>[];
		const edges = data.edges;

		// We need a measurement canvas for badge wrapping
		const measureCanvas = document.createElement('canvas');
		measureCanvas.width = 1;
		measureCanvas.height = 1;
		const measureCtx = measureCanvas.getContext('2d');
		if (!measureCtx) return '';

		// Compute metrics for each node
		const metricsMap = new Map<string, ReturnType<typeof measureNodeCard>>();
		for (const node of nodes) {
			metricsMap.set(node.id, measureNodeCard(measureCtx, node.data, showGroupTypes));
		}

		// Compute SVG viewBox bounds
		let maxX = -Infinity,
			maxY = -Infinity,
			minX = Infinity,
			minY = Infinity;
		for (const node of nodes) {
			const m = metricsMap.get(node.id);
			if (!m) continue;
			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + m.width);
			maxY = Math.max(maxY, node.position.y + m.height);
		}
		for (const edge of edges) {
			if (!edge.sections) continue;
			for (const section of edge.sections) {
				const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
				for (const p of points) {
					minX = Math.min(minX, p.x);
					minY = Math.min(minY, p.y);
					maxX = Math.max(maxX, p.x);
					maxY = Math.max(maxY, p.y);
				}
			}
		}

		const vbX = minX - SVG_PADDING;
		const vbY = minY - SVG_PADDING;
		const vbW = maxX - minX + SVG_PADDING * 2;
		const vbH = maxY - minY + SVG_PADDING * 2;

		let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${String(vbX)} ${String(vbY)} ${String(vbW)} ${String(vbH)}" width="${String(vbW)}" height="${String(vbH)}">
<defs>
  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
    <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
  </marker>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&amp;display=swap');
    text { font-family: 'Lato', sans-serif; }
  </style>
</defs>
`;

		// Draw edges
		for (const edge of edges) {
			svg += renderEdgeSVG(edge);
		}

		// Draw nodes
		for (const node of nodes) {
			const m = metricsMap.get(node.id);
			if (m) {
				svg += renderNodeSVG(node, m, showGroupTypes, measureCtx);
			}
		}

		svg += '</svg>';
		return svg;
	}, [data, showGroupTypes]);
};

function esc(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function renderEdgeSVG(edge: Edge): string {
	if (!edge.sections) return '';
	let result = '';

	for (const section of edge.sections) {
		const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
		const pointsStr = points.map((p) => `${String(p.x)},${String(p.y)}`).join(' ');

		result += `  <polyline points="${pointsStr}" fill="none" stroke="#64748b" stroke-width="2" stroke-linejoin="round" marker-end="url(#arrowhead)"/>\n`;
	}

	return result;
}

function renderNodeSVG(
	node: Node<PreviewGraphNodeData>,
	metrics: ReturnType<typeof measureNodeCard>,
	showGroupTypes: boolean,
	measureCtx: CanvasRenderingContext2D,
): string {
	const d = node.data;
	const x = node.position.x;
	const y = node.position.y;
	const w = metrics.width;
	const h = metrics.height;

	const borderColor = oklchToHex(d.color.shades[300]);
	const headerBg = oklchToHex(d.color.shades[100]);

	let headerHeight = HEADER_PADDING_Y * 2 + TITLE_FONT_SIZE;
	if (showGroupTypes) {
		headerHeight += GROUP_TYPE_FONT_SIZE + 4;
	}

	const rolesWithMembers = d.roles.filter((role) => d.memberNamesByRoleId.has(role.id));
	const hasMembers = rolesWithMembers.length > 0;

	let svg = `  <g>\n`;

	// Card background
	svg += `    <rect x="${String(x)}" y="${String(y)}" width="${String(w)}" height="${String(h)}" rx="${String(BORDER_RADIUS)}" fill="#ffffff" stroke="${esc(borderColor)}" stroke-width="${String(BORDER_WIDTH)}"/>\n`;

	// Header background (clipped to card shape)
	const clipId = `clip-${node.id}`;
	svg += `    <clipPath id="${esc(clipId)}"><rect x="${String(x)}" y="${String(y)}" width="${String(w)}" height="${String(h)}" rx="${String(BORDER_RADIUS)}"/></clipPath>\n`;
	svg += `    <rect x="${String(x)}" y="${String(y)}" width="${String(w)}" height="${String(headerHeight)}" fill="${esc(headerBg)}" clip-path="url(#${esc(clipId)})"/>\n`;

	// Header bottom border
	if (hasMembers) {
		svg += `    <line x1="${String(x)}" y1="${String(y + headerHeight)}" x2="${String(x + w)}" y2="${String(y + headerHeight)}" stroke="${esc(borderColor)}" stroke-width="${String(BORDER_WIDTH)}" clip-path="url(#${esc(clipId)})"/>\n`;
	}

	// Title
	svg += `    <text x="${String(x + w / 2)}" y="${String(y + HEADER_PADDING_Y + TITLE_FONT_SIZE / 2)}" text-anchor="middle" dy="0.35em" font-size="${String(TITLE_FONT_SIZE)}" font-weight="bold" fill="#0f172a">${esc(d.title)}</text>\n`;

	// Group type
	if (showGroupTypes) {
		svg += `    <text x="${String(x + w / 2)}" y="${String(y + HEADER_PADDING_Y + TITLE_FONT_SIZE + 4 + GROUP_TYPE_FONT_SIZE / 2)}" text-anchor="middle" dy="0.35em" font-size="${String(GROUP_TYPE_FONT_SIZE)}" font-weight="bold" fill="#64748b" letter-spacing="2">${esc(d.groupTypeName.toUpperCase())}</text>\n`;
	}

	// Body: roles and member badges
	if (hasMembers) {
		let cursorY = y + headerHeight + NODE_PADDING;

		for (const role of rolesWithMembers) {
			const names = d.memberNamesByRoleId.get(role.id) ?? [];
			if (names.length === 0) continue;

			// Role label
			svg += `    <text x="${String(x + NODE_PADDING)}" y="${String(cursorY + ROLE_FONT_SIZE / 2)}" dy="0.35em" font-size="${String(ROLE_FONT_SIZE)}" font-weight="bold" fill="#64748b" letter-spacing="1">${esc(role.name.toUpperCase())}</text>\n`;
			cursorY += ROLE_FONT_SIZE + 6;

			// Member badges with wrapping
			measureCtx.font = `${String(MEMBER_FONT_SIZE)}px Lato, sans-serif`;
			let badgeX = x + NODE_PADDING;

			for (const name of names) {
				const textWidth = measureCtx.measureText(name).width;
				const badgeWidth = textWidth + BADGE_PADDING_X * 2;

				if (badgeX + badgeWidth > x + w - NODE_PADDING && badgeX > x + NODE_PADDING) {
					badgeX = x + NODE_PADDING;
					cursorY += BADGE_HEIGHT + BADGE_GAP;
				}

				const badgeR = BADGE_HEIGHT / 2;
				svg += `    <rect x="${String(badgeX)}" y="${String(cursorY)}" width="${String(badgeWidth)}" height="${String(BADGE_HEIGHT)}" rx="${String(badgeR)}" fill="#f1f5f9"/>\n`;
				svg += `    <text x="${String(badgeX + BADGE_PADDING_X)}" y="${String(cursorY + BADGE_HEIGHT / 2)}" dy="0.35em" font-size="${String(MEMBER_FONT_SIZE)}" fill="#334155">${esc(name)}</text>\n`;

				badgeX += badgeWidth + BADGE_GAP;
			}
			cursorY += BADGE_HEIGHT + ROLE_GAP;
		}
	}

	svg += `  </g>\n`;
	return svg;
}
