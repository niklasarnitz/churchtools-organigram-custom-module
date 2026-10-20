import { test } from 'bun:test';
import assert from 'node:assert/strict';

import type { PreviewGraphNodeData } from '../types/GraphNode';
import type { Hierarchy } from '../types/Hierarchy';
import type { SunburstRenderData, SunburstSegmentLayout } from '../types/Sunburst';

import { getColorForChurchToolsColor, getColorForGroupType, oklchToHex } from '../globals/Colors';
import { createSunburstSvg } from './sunburstExport';
import { buildSunburstLayout } from './sunburstLayout';

const createNode = (id: number, title: string): PreviewGraphNodeData =>
	({
		color: { key: 'blue', shades: { 500: 'oklch(70.4% 0.14 182.503)' } },
		group: { id, information: { groupTypeId: 1 } },
		groupTypeName: 'Test',
		id,
		memberNamesByRoleId: new Map(),
		members: [],
		metadata: '',
		roles: [],
		title,
	}) as unknown as PreviewGraphNodeData;

test('converts Sunburst layout and SVG/PDF segment colors to export-safe hex values', () => {
	const nodeDataById = new Map([
		[1, createNode(1, 'Root')],
		[2, createNode(2, 'Child')],
	]);
	const hierarchiesByGroupId: Record<number, Hierarchy> = {
		1: { children: [2], group: {} as Hierarchy['group'], groupId: 1, parents: [] },
		2: { children: [], group: {} as Hierarchy['group'], groupId: 2, parents: [1] },
	};
	const layout = buildSunburstLayout({
		colorMode: 'groupType',
		groupTypeShortiesById: new Map(),
		hierarchiesByGroupId,
		nodeDataById,
		radialRingDistance: 100,
		showGroupTypes: false,
		visibleNodeIds: new Set([1, 2]),
	});

	assert(layout.renderData.segments[0]?.fillColor.startsWith('#'));

	const segment: SunburstSegmentLayout = {
		endAngle: Math.PI * 2,
		fillColor: 'oklch(70.4% 0.14 182.503)',
		id: 'sunburst-1',
		innerRadius: 50,
		isMultiParent: false,
		midAngle: 0.5,
		nodeId: 1,
		outerRadius: 100,
		pathTitles: ['Root'],
		primaryParentSource: 'root',
		startAngle: 0,
		strokeColor: '#ffffff',
		title: 'Root',
	};
	const renderData: SunburstRenderData = {
		center: { x: 0, y: 0 },
		interactionByNodeId: {},
		labelByNodeId: {},
		labels: [],
		maxRadius: 100,
		ringWidth: 50,
		segmentByNodeId: { 1: segment },
		segments: [segment],
	};

	for (const target of ['svg', 'pdf'] as const) {
		const svg = createSunburstSvg(renderData, { target });
		const segmentFill = /<path[^>]+fill="([^"]+)/.exec(svg)?.[1];
		assert(segmentFill?.startsWith('#'));
		assert(!svg.includes('oklch('));
	}
});

test('Sunburst uses configured group-type gray as fallback and keeps explicit group colors separate', () => {
	const typeColor = getColorForGroupType(26, 'gray');
	assert.equal(typeColor.key, 'gray');
	const root = createNode(1, 'Root');
	const child = createNode(2, 'Child');
	child.group.information.groupTypeId = 26;
	child.groupTypeColor = 'gray';
	const nodeDataById = new Map([
		[1, root],
		[2, child],
	]);
	const args = {
		groupTypeShortiesById: new Map<number, string>(),
		hierarchiesByGroupId: {
			1: { children: [2], group: {} as Hierarchy['group'], groupId: 1, parents: [] },
			2: { children: [], group: {} as Hierarchy['group'], groupId: 2, parents: [1] },
		},
		nodeDataById,
		radialRingDistance: 100,
		showGroupTypes: false,
		visibleNodeIds: new Set([1, 2]),
	};
	const fill = (colorMode: 'group' | 'groupType') =>
		buildSunburstLayout({ ...args, colorMode }).renderData.segments.find((s) => s.nodeId === 2)?.fillColor;
	const gray = oklchToHex(typeColor.shades[500]);
	for (const color of [undefined, null, '']) {
		child.group.information.color = color;
		child.color = getColorForChurchToolsColor(color) ?? getColorForGroupType(26, child.groupTypeColor);
		assert.equal(fill('group'), gray);
		assert.equal(fill('groupType'), gray);
	}
	child.group.information.color = 'red';
	child.color = getColorForChurchToolsColor('red') ?? typeColor;
	assert.equal(fill('group'), oklchToHex(child.color.shades[500]));
	assert.equal(fill('groupType'), gray);
	assert.deepEqual(getColorForGroupType(26, 'unknown'), getColorForGroupType(26));
});
