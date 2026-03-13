import jsPDF from 'jspdf';
import { useCallback } from 'react';

import type { PreviewGraphNodeData } from '../types/GraphNode';
import type { Edge, Node } from '../types/GraphTypes';

import { measureNodeCard } from '../components/WebGLRenderer/engine/drawNodeCard2D';
import { oklchToHex } from '../globals/Colors';
import { useAppStore } from '../state/useAppStore';
import { useGenerateReflowData } from './useGenerateReflowData';

// === Card Layout ===
const NODE_PADDING = 16; // Inner padding inside card
const HEADER_PADDING_Y = -2; // Vertical padding in header (negative = tighter)

// === Font Sizes ===
// === Font Sizes ===
const TITLE_FONT_SIZE = 40; // Card title (e.g. "Tobias und Kim Maier")
const GROUP_TYPE_FONT_SIZE = 40; // Group type (e.g. "KG KLEINGRUPPE")
const ROLE_FONT_SIZE = 20; // Role label (e.g. "LEITER")
const MEMBER_FONT_SIZE = 20; // Member names (e.g. "Unknown Person")
const TITLE_GROUP_TYPE_GAP = 0; // Spacing between title and group type

// === Badge Styling ===
// const BADGE_PADDING_X = 8; // Horizontal padding around member name in badge (currently unused)
// const BADGE_PADDING_Y = 4; // Vertical padding around member name in badge (currently unused)
// const BADGE_HEIGHT = MEMBER_FONT_SIZE + BADGE_PADDING_Y * 2; // Calculated badge height (currently unused)
// const BADGE_GAP = 4; // Spacing between badges (currently unused)
// const ROLE_GAP = 8; // Spacing between role sections (currently unused)

// === Card Styling ===
const BORDER_RADIUS = 12; // Rounded corner radius
// const BORDER_WIDTH = 2; // Border line thickness (currently unused)

// === PDF Layout ===
const PDF_PADDING = 0; // Padding around entire diagram in PDF
const PDF_SCALE = 2.0; // Zoom factor (1.0 = normal, 2.0 = 2x larger)
const LANDSCAPE_THRESHOLD = 1.15; // Aspect ratio threshold for landscape orientation

/**
 * Calculates optimal PDF orientation based on content aspect ratio
 * @param boundsWidth Width of the diagram bounds
 * @param boundsHeight Height of the diagram bounds
 * @returns 'landscape' if width > 1.15 × height, otherwise 'portrait'
 */
function calculatePDFOrientation(boundsWidth: number, boundsHeight: number): 'landscape' | 'portrait' {
	const aspectRatio = boundsWidth / boundsHeight;
	return aspectRatio > LANDSCAPE_THRESHOLD ? 'landscape' : 'portrait';
}

export const useGeneratePDFData = () => {
	const data = useGenerateReflowData();
	const committedFilters = useAppStore((s) => s.committedFilters);
	const showGroupTypes = committedFilters?.showGroupTypes ?? true;

	return useCallback(() => {
		const nodes = data.nodes as Node<PreviewGraphNodeData>[];
		const edges = data.edges;

		// Measurement canvas
		const measureCanvas = document.createElement('canvas');
		measureCanvas.width = 1;
		measureCanvas.height = 1;
		const measureCtx = measureCanvas.getContext('2d');
		if (!measureCtx) throw new Error('Failed to get canvas context');

		// Node metrics
		const metricsMap = new Map<string, ReturnType<typeof measureNodeCard>>();
		for (const node of nodes) {
			const result = measureNodeCard(measureCtx, node.data, showGroupTypes);
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (result) {
				metricsMap.set(node.id, result);
			}
		}

		// Bounds calculation
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const node of nodes) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const metrics = metricsMap.get(node.id)!;
			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + metrics.width);
			maxY = Math.max(maxY, node.position.y + metrics.height);
		}

		for (const edge of edges) {
			if (!edge.sections) continue;
			for (const section of edge.sections) {
				const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
				for (const point of points) {
					minX = Math.min(minX, point.x);
					minY = Math.min(minY, point.y);
					maxX = Math.max(maxX, point.x);
					maxY = Math.max(maxY, point.y);
				}
			}
		}

		const boundsWidth = maxX - minX;
		const boundsHeight = maxY - minY;
		// PDF height calculated but kept for reference/future use
		// const pdfHeight = boundsHeight * PDF_SCALE + PDF_PADDING * 2;

		// Calculate optimal orientation based on aspect ratio
		const orientation = calculatePDFOrientation(boundsWidth, boundsHeight);

		// jsPDF mit korrekter Konfiguration
		const doc = new jsPDF({
			format: 'a4',
			orientation: orientation,
			unit: 'mm',
		});

		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const scaleX = (pageWidth - PDF_PADDING * 2) / boundsWidth;
		const scaleY = (pageHeight - PDF_PADDING * 2) / boundsHeight;
		const finalScale = Math.min(scaleX, scaleY, PDF_SCALE);

		const offsetX = (pageWidth - boundsWidth * finalScale) / 2;
		const offsetY = (pageHeight - boundsHeight * finalScale) / 2;

		// Lato Font setzen (falls verfügbar, sonst Helvetica)
		doc.setFont('helvetica');

		// Edges zuerst zeichnen (hinten)
		for (const edge of edges) {
			drawEdgePDF(doc, edge, minX, minY, finalScale, offsetX, offsetY);
		}

		// Nodes zeichnen (vorne)
		for (const node of nodes) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const metrics = metricsMap.get(node.id)!;
			drawNodePDF(doc, node, metrics, showGroupTypes, measureCtx, minX, minY, finalScale, offsetX, offsetY);
		}

		return doc;
	}, [data, showGroupTypes]);
};

// Edge rendering for PDF
function drawEdgePDF(
	doc: jsPDF,
	edge: Edge,
	minX: number,
	minY: number,
	scale: number,
	offsetX: number,
	offsetY: number,
): void {
	if (!edge.sections) return;

	doc.setDrawColor(100, 116, 139); // #64748b
	doc.setLineWidth(0.1);

	for (const section of edge.sections) {
		const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
		const pdfPoints = points.map((p) => [offsetX + (p.x - minX) * scale, offsetY + (p.y - minY) * scale]);

		if (pdfPoints.length > 1) {
			const [startX, startY] = pdfPoints[0];
			doc.moveTo(startX, startY);

			for (let i = 1; i < pdfPoints.length; i++) {
				const [x, y] = pdfPoints[i];
				doc.lineTo(x, y);
			}
			doc.stroke();

			// Draw arrowhead at the end
			const [endX, endY] = pdfPoints[pdfPoints.length - 1];
			const [prevX, prevY] = pdfPoints[pdfPoints.length - 2];

			const dx = endX - prevX;
			const dy = endY - prevY;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist > 0) {
				const angle = Math.atan2(dy, dx);
				const arrowSize = 0.8;

				const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
				const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
				const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
				const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

				// Draw filled arrow triangle
				doc.setFillColor(100, 116, 139);
				doc.moveTo(endX, endY);
				doc.lineTo(arrowX1, arrowY1);
				doc.lineTo(arrowX2, arrowY2);
				doc.fill();
			}
		}
	}
}

// Node rendering for PDF
function drawNodePDF(
	doc: jsPDF,
	node: Node<PreviewGraphNodeData>,
	metrics: ReturnType<typeof measureNodeCard>,
	showGroupTypes: boolean,
	measureCtx: CanvasRenderingContext2D,
	minX: number,
	minY: number,
	scale: number,
	offsetX: number,
	offsetY: number,
): void {
	const d = node.data;
	const x = offsetX + (node.position.x - minX) * scale;
	const y = offsetY + (node.position.y - minY) * scale;
	const w = metrics.width * scale;
	const h = metrics.height * scale;

	const borderColor = oklchToHex(d.color.shades[300]);
	const headerBg = oklchToHex(d.color.shades[100]);

	let headerHeight = ((HEADER_PADDING_Y * 2 + TITLE_FONT_SIZE) * scale) / 3;
	if (showGroupTypes) {
		headerHeight += (GROUP_TYPE_FONT_SIZE + TITLE_GROUP_TYPE_GAP) * scale;
	}

	const rolesWithMembers = d.roles.filter((role) => d.memberNamesByRoleId.has(role.id));
	const hasMembers = rolesWithMembers.length > 0;

	// Card background
	doc.setDrawColor(borderColor);
	doc.setLineWidth(0.15);
	doc.setFillColor(255, 255, 255);
	doc.roundedRect(x, y, w, h, BORDER_RADIUS * scale, BORDER_RADIUS * scale, 'FD');

	// Header background with rounded top corners
	doc.setFillColor(headerBg);
	doc.roundedRect(x, y, w, headerHeight, BORDER_RADIUS * scale, BORDER_RADIUS * scale, 'F');

	/**
	// DEBUG: Draw debug rectangles to visualize areas
	doc.setDrawColor(255, 0, 0); // Red for header
	doc.setLineWidth(0.1);
	doc.rect(x, y, w, headerHeight);

	// Show padding area
	doc.setDrawColor(0, 255, 0); // Green for padding
	const paddingBox = NODE_PADDING * scale;
	doc.rect(x + paddingBox, y + paddingBox, w - paddingBox * 2, headerHeight - paddingBox);
**/
	// Header border (very thin)
	if (hasMembers) {
		doc.setDrawColor(borderColor);
		doc.setLineWidth(0.08);
		doc.line(x, y + headerHeight, x + w, y + headerHeight);
	}

	// Title
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(TITLE_FONT_SIZE * scale);
	doc.setTextColor(15, 23, 42);
	doc.text(d.title, x + w / 2, y + (HEADER_PADDING_Y + TITLE_FONT_SIZE / 2) * scale, { align: 'center' });

	// Group type
	if (showGroupTypes) {
		doc.setFontSize(GROUP_TYPE_FONT_SIZE * scale);
		doc.setTextColor(100, 116, 139);
		doc.text(
			d.groupTypeName.toUpperCase(),
			x + w / 2,
			y + (HEADER_PADDING_Y + TITLE_FONT_SIZE / 2 + TITLE_GROUP_TYPE_GAP + GROUP_TYPE_FONT_SIZE / 2) * scale,
			{ align: 'center' },
		);
	}

	// Body: roles and member badges
	if (hasMembers) {
		doc.setFont('helvetica', 'normal');
		let cursorY = y + headerHeight + NODE_PADDING * scale;

		for (const role of rolesWithMembers) {
			const names = d.memberNamesByRoleId.get(role.id) ?? [];
			if (names.length === 0) continue;

			// Role label
			doc.setFontSize(ROLE_FONT_SIZE * scale);
			doc.setTextColor(100, 116, 139);
			doc.setFont('helvetica', 'bold');
			doc.text(role.name.toUpperCase(), x + NODE_PADDING * scale, cursorY + (ROLE_FONT_SIZE / 2) * scale);
			cursorY += (ROLE_FONT_SIZE + 6) * scale;

			// Member names (text only, no badges)
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(MEMBER_FONT_SIZE * scale);
			doc.setTextColor(51, 65, 85);

			let nameX = x + NODE_PADDING * scale;
			const contentWidth = w - NODE_PADDING * 2 * scale;
			const spacing = 12 * scale; // Fixed spacing between names

			for (const name of names) {
				const textWidth = doc.getTextWidth(name);

				// Wrap to next line if doesn't fit
				if (nameX + textWidth > x + contentWidth && nameX > x + NODE_PADDING * scale) {
					nameX = x + NODE_PADDING * scale;
					cursorY += MEMBER_FONT_SIZE * 0.6 * scale;
				}

				// Draw name text only
				doc.text(name, nameX, cursorY);
				nameX += textWidth + spacing;
			}
			cursorY += MEMBER_FONT_SIZE * 1.2 * scale;
		}
	}
}
