import jsPDF from 'jspdf';
import { useCallback } from 'react';
import 'svg2pdf.js';

import type { SunburstRenderData } from '../types/Sunburst';

import { createSunburstSvg } from '../helpers/sunburstExport';
import { useGenerateReflowData } from './useGenerateReflowData';
import { useGenerateSVGData } from './useGenerateSVGData';

// === PDF Layout ===
const LANDSCAPE_THRESHOLD = 1.15; // Aspect ratio threshold for landscape orientation
const SUNBURST_PDF_MARGIN = 10;

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

function createInfoPDF(message: string): jsPDF {
	const doc = new jsPDF({
		format: 'a4',
		orientation: 'portrait',
		unit: 'mm',
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	doc.setFont('helvetica');
	doc.setFontSize(14);
	doc.text('PDF Export', pageWidth / 2, 30, { align: 'center' });

	doc.setFontSize(11);
	const maxLineWidth = pageWidth - 40;
	const wrappedMessageRaw = doc.splitTextToSize(message, maxLineWidth) as unknown;
	const wrappedMessage: string | string[] = Array.isArray(wrappedMessageRaw)
		? wrappedMessageRaw.filter((line): line is string => typeof line === 'string')
		: typeof wrappedMessageRaw === 'string'
			? wrappedMessageRaw
			: message;
	doc.text(wrappedMessage, 20, 45);

	return doc;
}

export const useGeneratePDFData = () => {
	const data = useGenerateReflowData();
	const generateSVGData = useGenerateSVGData();

	return useCallback(async () => {
		if (data.sunburstRenderData) {
			return createSunburstPDF(data.sunburstRenderData);
		}

		if (data.nodes.length === 0) {
			return createInfoPDF(
				'Es gibt keine sichtbaren Gruppen zum Export. Bitte passe die Filter an und versuche es erneut.',
			);
		}

		const svgMarkup = generateSVGData();
		const svgDocument = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
		const svg = svgDocument.documentElement;
		if (svg.nodeName.toLowerCase() === 'parsererror') {
			return createInfoPDF('Die Organigramm-SVG konnte nicht fuer den PDF-Export vorbereitet werden.');
		}

		// Read dimensions from viewBox or width/height attributes
		const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number);
		const boundsWidth = viewBox ? viewBox[2] : Number.parseFloat(svg.getAttribute('width') ?? '') || 1;
		const boundsHeight = viewBox ? viewBox[3] : Number.parseFloat(svg.getAttribute('height') ?? '') || 1;

		const orientation = calculatePDFOrientation(boundsWidth, boundsHeight);
		const doc = new jsPDF({
			compress: true,
			format: 'a4',
			orientation: orientation,
			unit: 'mm',
		});

		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const availableWidth = pageWidth - 20; // 10mm margin on each side
		const availableHeight = pageHeight - 20;

		const scale = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);
		const width = boundsWidth * scale;
		const height = boundsHeight * scale;

		await doc.svg(svg, {
			height,
			width,
			x: (pageWidth - width) / 2,
			y: (pageHeight - height) / 2,
		});

		return doc;
	}, [data, generateSVGData]);
};

async function createSunburstPDF(renderData: SunburstRenderData): Promise<jsPDF> {
	const svgMarkup = createSunburstSvg(renderData, { target: 'pdf' });
	const svgDocument = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
	const svg = svgDocument.documentElement;
	if (svg.nodeName.toLowerCase() === 'parsererror') {
		return createInfoPDF('Die Sunburst-SVG konnte nicht fuer den PDF-Export vorbereitet werden.');
	}

	const doc = new jsPDF({
		compress: true,
		format: 'a3',
		orientation: 'landscape',
		unit: 'mm',
	});
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const availableWidth = pageWidth - SUNBURST_PDF_MARGIN * 2;
	const availableHeight = pageHeight - SUNBURST_PDF_MARGIN * 2;
	const sourceWidth = Number.parseFloat(svg.getAttribute('width') ?? '') || 1;
	const sourceHeight = Number.parseFloat(svg.getAttribute('height') ?? '') || 1;
	const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
	const width = sourceWidth * scale;
	const height = sourceHeight * scale;

	await doc.svg(svg, {
		height,
		width,
		x: (pageWidth - width) / 2,
		y: (pageHeight - height) / 2,
	});

	return doc;
}
