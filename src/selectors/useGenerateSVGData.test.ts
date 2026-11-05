import { expect, test } from 'bun:test';

import type { PreviewGraphNodeData } from '../types/GraphNode';

import { createGraphSvg } from './useGenerateSVGData';

test('export bounds every label and badge without shrinking fonts or loading remote fonts', () => {
	const previousDocument = globalThis.document;
	// Deterministic canvas metrics; real browser/export rendering is checked separately.
	const ctx = {
		font: '',
		letterSpacing: '0px',
		measureText(text: string) {
			return { width: Array.from(text).length * Number.parseFloat(this.font.replace('bold ', '')) * 0.6 };
		},
	};
	globalThis.document = { createElement: () => ({ getContext: () => ctx }) } as unknown as Document;
	try {
		const data = {
			color: { shades: { 100: 'oklch(95% 0.01 200)', 300: 'oklch(70% 0.1 200)' } },
			groupTypeName: 'Very long group type '.repeat(20),
			id: 1,
			memberNamesByRoleId: new Map([[1, ['OversizedMember'.repeat(30), 'Short']]]),
			roles: [{ id: 1, name: 'Very long role '.repeat(20) }],
			title: 'A readable long title that wraps into two lines rather than shrinking',
		} as unknown as PreviewGraphNodeData;
		const svg = createGraphSvg([{ data, id: '1', position: { x: 0, y: 0 } }], [], true);
		expect(svg).not.toContain('@import');
		expect(svg).not.toContain('fonts.googleapis');
		expect(svg).not.toContain('dy="0.35em"');
		expect(svg).toContain('Arial, Helvetica, sans-serif');
		expect(svg.match(/font-size="14"/g)).toHaveLength(2);
		expect(svg.match(/…/g)?.length).toBeGreaterThanOrEqual(3);
		for (const match of svg.matchAll(/<text x="([\d.]+)"[^>]*font-size="([\d.]+)"[^>]*>([^<]*)<\/text>/g)) {
			const [, rawX, rawSize, label] = match;
			const spacing = match[0].includes('letter-spacing="2"')
				? 2
				: match[0].includes('letter-spacing="1"')
					? 1
					: 0;
			const width = Array.from(label).length * (Number(rawSize) * 0.6 + spacing);
			expect(width).toBeLessThanOrEqual(268);
			if (!match[0].includes('text-anchor="middle"')) expect(Number(rawX) + width).toBeLessThanOrEqual(284);
		}
		for (const badge of svg.matchAll(/<rect x="([\d.]+)"[^>]*width="([\d.]+)"[^>]*fill="#f1f5f9"/g)) {
			expect(Number(badge[1]) + Number(badge[2])).toBeLessThanOrEqual(284);
		}
		const hidden = createGraphSvg([{ data, id: '1', position: { x: 0, y: 0 } }], [], false);
		expect(hidden).not.toContain('letter-spacing="2"');
		data.title = 'Unbreakable'.repeat(100);
		const singleWord = createGraphSvg([{ data, id: '1', position: { x: 0, y: 0 } }], [], false);
		expect(singleWord.match(/font-size="14"/g)).toHaveLength(1);
		expect(singleWord).not.toContain(data.title);
		data.title = 'Müller & <Team>';
		const shortTitle = createGraphSvg([{ data, id: '1', position: { x: 0, y: 0 } }], [], false);
		expect(shortTitle).toContain('Müller &amp; &lt;Team&gt;');
	} finally {
		globalThis.document = previousDocument;
	}
});

test('wider export fonts are accounted for before cards are placed next to each other', () => {
	const previousDocument = globalThis.document;
	const ctx = {
		font: '',
		letterSpacing: '0px',
		measureText(text: string) {
			return { width: text.length * (this.font.includes('Lato') ? 4 : 8) };
		},
	};
	globalThis.document = { createElement: () => ({ getContext: () => ctx }) } as unknown as Document;
	try {
		const data = {
			color: { shades: { 100: 'oklch(95% 0.01 200)', 300: 'oklch(70% 0.1 200)' } },
			groupTypeName: 'B',
			id: 1,
			memberNamesByRoleId: new Map([[1, ['nnnnnn', 'nnnnnn', 'nnnnnn', 'nnnnnn']]]),
			roles: [{ id: 1, name: 'Lead' }],
			title: 'Team',
		} as unknown as PreviewGraphNodeData;
		const svg = createGraphSvg(
			[
				{ data, id: '1', position: { x: 0, y: 0 } },
				{ data: { ...data, id: 2 }, id: '2', position: { x: 0, y: 120 } },
			],
			[],
			true,
		);
		// Four 48px labels + 16px badge padding each + 3×4px gaps + 32px card padding.
		expect(svg).toContain('width="300" height="112"');
		expect(svg).not.toContain('height="136"');
		expect(svg.match(/>nnnnnn<\/text>/gu)).toHaveLength(8);
	} finally {
		globalThis.document = previousDocument;
	}
});
