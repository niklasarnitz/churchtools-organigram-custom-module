/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-useless-assignment */
/* eslint-disable perfectionist/sort-modules */
/* eslint-disable perfectionist/sort-named-imports */
/* eslint-disable perfectionist/sort-objects */

import { hierarchy, partition, type HierarchyRectangularNode } from 'd3-hierarchy';

import type { PreviewGraphNodeData } from '../types/GraphNode';
import type { Group } from '../types/Group';
import type { Hierarchy } from '../types/Hierarchy';
import type {
	PrimaryParentSource,
	SunburstBaseColorDebugEntry,
	SunburstColorDebugEntry,
	SunburstInteractionMeta,
	SunburstLabelLayout,
	SunburstRenderData,
	SunburstSegmentLayout,
} from '../types/Sunburst';

import { oklchToHex } from '../globals/Colors';

interface BuildSunburstLayoutArgs {
	centerNodeId?: number;
	hierarchiesByGroupId: Record<number, Hierarchy | undefined>;
	nodeDataById: Map<number, PreviewGraphNodeData>;
	radialRingDistance: number;
	visibleNodeIds: Set<number>;
}

interface DisplayTreeNode {
	children: DisplayTreeNode[];
	id: number;
	order: number;
	parentId?: number;
	primaryParentSource: PrimaryParentSource;
	title: string;
}

const VIRTUAL_ROOT_ID = -1;
const VIRTUAL_ROOT_TITLE = 'Organigramm';

export function extractConfiguredPrimaryParentGroupId(group: Group): number | undefined {
	const fieldPath = import.meta.env.VITE_PRIMARY_PARENT_GROUP_FIELD?.trim() || 'sunburstPrimaryParent';
	const groupRecord = group as Record<string, unknown>;
	const candidateValues = [
		getNestedValue(groupRecord, fieldPath),
		getNestedValue(groupRecord, `customFields.${fieldPath}`),
		getNestedValue(groupRecord, `information.${fieldPath}`),
		getNestedValue(groupRecord, `information.customFields.${fieldPath}`),
	];

	for (const candidate of candidateValues) {
		const parsed = parseLinkedGroupId(candidate);
		if (parsed && parsed > 0) return parsed;
	}

	return undefined;
}

export function buildSunburstLayout({
	centerNodeId,
	hierarchiesByGroupId,
	nodeDataById,
	radialRingDistance,
	visibleNodeIds,
}: BuildSunburstLayoutArgs): {
	interactionByNodeId: Record<number, SunburstInteractionMeta>;
	labelByNodeId: Record<number, SunburstLabelLayout>;
	layoutNodes: Array<{ id: number; x: number; y: number }>;
	primaryParentIdByNodeId: Record<number, number | undefined>;
	primaryParentSourceByNodeId: Record<number, PrimaryParentSource>;
	renderData: SunburstRenderData;
	rootNodeIds: number[];
	secondaryParentIdsByNodeId: Record<number, number[]>;
} {
	const visibleParentsByNodeId = new Map<number, number[]>();
	const visibleChildrenByNodeId = new Map<number, number[]>();
	const childOrderByRelation = new Map<string, number>();
	const configuredParentByNodeId = new Map<number, number>();

	for (const nodeId of visibleNodeIds) {
		const hierarchyEntry = hierarchiesByGroupId[nodeId];
		const visibleParents = (hierarchyEntry?.parents ?? []).filter((parentId) => visibleNodeIds.has(parentId));
		const visibleChildren = (hierarchyEntry?.children ?? []).filter((childId) => visibleNodeIds.has(childId));
		visibleParentsByNodeId.set(nodeId, visibleParents);
		visibleChildrenByNodeId.set(nodeId, visibleChildren);

		for (const [index, childId] of visibleChildren.entries()) {
			childOrderByRelation.set(`${String(nodeId)}:${String(childId)}`, index);
		}

		const group = nodeDataById.get(nodeId)?.group;
		const configuredParentId = group ? extractConfiguredPrimaryParentGroupId(group) : undefined;
		if (configuredParentId !== undefined) {
			configuredParentByNodeId.set(nodeId, configuredParentId);
		}
	}

	const rootNodeIds = Array.from(visibleNodeIds)
		.filter((nodeId) => (visibleParentsByNodeId.get(nodeId) ?? []).length === 0)
		.sort((left, right) => left - right);
	const effectiveCenterNodeId = centerNodeId && visibleNodeIds.has(centerNodeId) ? centerNodeId : undefined;
	const fallbackRoots =
		effectiveCenterNodeId !== undefined
			? [effectiveCenterNodeId]
			: rootNodeIds.length > 0
				? rootNodeIds
				: Array.from(visibleNodeIds)
						.sort((a, b) => a - b)
						.slice(0, 1);
	const rootDistanceByNodeId = computeMinDistanceFromRoots(fallbackRoots, visibleChildrenByNodeId);

	const primaryParentByNodeId = new Map<number, number>();
	const primaryParentSourceByNodeId = new Map<number, PrimaryParentSource>();

	for (const nodeId of visibleNodeIds) {
		const visibleParents = visibleParentsByNodeId.get(nodeId) ?? [];
		if (visibleParents.length === 0) {
			primaryParentSourceByNodeId.set(nodeId, 'root');
			continue;
		}

		const configuredParentId = configuredParentByNodeId.get(nodeId);
		if (configuredParentId !== undefined && visibleParents.includes(configuredParentId)) {
			primaryParentByNodeId.set(nodeId, configuredParentId);
			primaryParentSourceByNodeId.set(nodeId, 'churchtools-field');
			continue;
		}

		const selectedParentId = [...visibleParents].sort((left, right) => {
			const depthDelta =
				(rootDistanceByNodeId.get(left) ?? Number.POSITIVE_INFINITY) -
				(rootDistanceByNodeId.get(right) ?? Number.POSITIVE_INFINITY);
			if (depthDelta !== 0) return depthDelta;

			const leftOrder = childOrderByRelation.get(`${String(left)}:${String(nodeId)}`) ?? Number.MAX_SAFE_INTEGER;
			const rightOrder =
				childOrderByRelation.get(`${String(right)}:${String(nodeId)}`) ?? Number.MAX_SAFE_INTEGER;
			if (leftOrder !== rightOrder) return leftOrder - rightOrder;

			return left - right;
		})[0];

		if (selectedParentId !== undefined) {
			primaryParentByNodeId.set(nodeId, selectedParentId);
			primaryParentSourceByNodeId.set(nodeId, 'fallback');
		} else {
			primaryParentSourceByNodeId.set(nodeId, 'root');
		}
	}

	breakCycles(primaryParentByNodeId, primaryParentSourceByNodeId);

	const displayChildrenByNodeId = new Map<number, number[]>();
	const secondaryParentIdsByNodeId: Record<number, number[]> = {};

	for (const nodeId of visibleNodeIds) {
		const parentIds = visibleParentsByNodeId.get(nodeId) ?? [];
		const primaryParentId = primaryParentByNodeId.get(nodeId);
		secondaryParentIdsByNodeId[nodeId] = parentIds.filter((parentId) => parentId !== primaryParentId);

		const effectiveParentId = primaryParentId ?? VIRTUAL_ROOT_ID;
		const siblings = displayChildrenByNodeId.get(effectiveParentId) ?? [];
		siblings.push(nodeId);
		displayChildrenByNodeId.set(effectiveParentId, siblings);
	}

	for (const [parentId, childIds] of displayChildrenByNodeId) {
		if (parentId === VIRTUAL_ROOT_ID) {
			childIds.sort((left, right) => left - right);
			continue;
		}

		childIds.sort((left, right) => {
			const leftOrder =
				childOrderByRelation.get(`${String(parentId)}:${String(left)}`) ?? Number.MAX_SAFE_INTEGER;
			const rightOrder =
				childOrderByRelation.get(`${String(parentId)}:${String(right)}`) ?? Number.MAX_SAFE_INTEGER;
			if (leftOrder !== rightOrder) return leftOrder - rightOrder;
			return left - right;
		});
	}

	const treeRoot: DisplayTreeNode = {
		children:
			effectiveCenterNodeId !== undefined
				? buildDisplayChildren(
						effectiveCenterNodeId,
						displayChildrenByNodeId,
						nodeDataById,
						primaryParentByNodeId,
						primaryParentSourceByNodeId,
					)
				: buildDisplayChildren(
						VIRTUAL_ROOT_ID,
						displayChildrenByNodeId,
						nodeDataById,
						primaryParentByNodeId,
						primaryParentSourceByNodeId,
					),
		id: VIRTUAL_ROOT_ID,
		order: 0,
		primaryParentSource: 'root',
		title: VIRTUAL_ROOT_TITLE,
	};

	const d3Root = hierarchy<DisplayTreeNode>(treeRoot)
		// Only leaves contribute weight. This makes child segments fill their
		// parent's complete angular range instead of reserving a share for the parent.
		.sum((node) => (node.id === VIRTUAL_ROOT_ID || node.children.length > 0 ? 0 : 1))
		.sort((left, right) => left.data.order - right.data.order);

	const maxDepth = Math.max(...d3Root.descendants().map((node) => node.depth), 1);
	partition<DisplayTreeNode>().size([Math.PI * 2, maxDepth])(d3Root);

	// Keep the donut hole proportional to the current ring width so the center
	// matches the original larger layout again while still scaling with the control.
	const holeRadius = Math.max(radialRingDistance / 2, 40);
	const ringGap = 0;
	const segments: SunburstSegmentLayout[] = [];
	const labels: SunburstLabelLayout[] = [];
	const interactionByNodeId: Record<number, SunburstInteractionMeta> = {};
	const labelByNodeId: Record<number, SunburstLabelLayout> = {};
	const segmentByNodeId: Record<number, SunburstSegmentLayout> = {};
	const layoutNodes: Array<{ id: number; x: number; y: number }> = [];
	const branchRootColorByNodeId = new Map<number, string>();
	const sunburstDebugEnabled = import.meta.env.DEV;
	const sunburstBaseColorDebugEntries: SunburstBaseColorDebugEntry[] = [];
	const sunburstColorDebugEntries: SunburstColorDebugEntry[] = [];

	for (const descendant of d3Root.descendants() as HierarchyRectangularNode<DisplayTreeNode>[]) {
		if (descendant.data.id === VIRTUAL_ROOT_ID) continue;

		const nodeId = descendant.data.id;
		const branchRootNode = findVisibleBranchRootNode(descendant, effectiveCenterNodeId);
		if (!branchRootNode) continue;

		const branchRootId = branchRootNode.data.id;
		const branchRootColor =
			branchRootColorByNodeId.get(branchRootId) ??
			deriveBaseNodeColor(branchRootId, nodeDataById, sunburstBaseColorDebugEntries);
		branchRootColorByNodeId.set(branchRootId, branchRootColor);

		const parentId = primaryParentByNodeId.get(nodeId);
		const parentData = parentId ? nodeDataById.get(parentId) : undefined;
		const depth = descendant.depth;
		const startAngle = descendant.x0;
		const endAngle = descendant.x1;
		const midAngle = (startAngle + endAngle) / 2;
		const innerRadius = holeRadius + Math.max(depth - 1, 0) * (radialRingDistance + ringGap);
		const outerRadius = holeRadius + depth * radialRingDistance;
		const centerRadius = (innerRadius + outerRadius) / 2;
		const x = centerRadius * Math.cos(midAngle - Math.PI / 2);
		const y = centerRadius * Math.sin(midAngle - Math.PI / 2);
		const nodeData = nodeDataById.get(nodeId);
		if (!nodeData) continue;

		const fillColor = deriveSegmentColor(branchRootColor, depth - branchRootNode.depth);
		if (sunburstDebugEnabled) {
			sunburstColorDebugEntries.push({
				ancestorIds: descendant
					.ancestors()
					.map((entry) => entry.data.id)
					.filter((id) => id !== VIRTUAL_ROOT_ID)
					.reverse(),
				ancestorTitles: descendant
					.ancestors()
					.map((entry) => entry.data.title)
					.filter((title) => title !== VIRTUAL_ROOT_TITLE)
					.reverse(),
				branchRootColor,
				branchRootDepth: branchRootNode.depth,
				branchRootId,
				branchRootTitle: branchRootNode.data.title,
				depth,
				effectiveCenterNodeId,
				fillColor,
				nodeId,
				nodeTitle: nodeData.title,
			});
		}
		const strokeColor = deriveSeparatorColor();
		const primaryParentSource = primaryParentSourceByNodeId.get(nodeId) ?? 'fallback';
		const pathNodeIds = descendant
			.ancestors()
			.map((entry) => entry.data.id)
			.filter((id) => id !== VIRTUAL_ROOT_ID)
			.reverse();
		const pathTitles = descendant
			.ancestors()
			.map((entry) => entry.data.title)
			.filter((title) => title !== VIRTUAL_ROOT_TITLE)
			.reverse();
		const segmentId = `sunburst-${String(nodeId)}`;
		const allParentIds = visibleParentsByNodeId.get(nodeId) ?? [];
		const alternateParentTitles = secondaryParentIdsByNodeId[nodeId]
			.map((secondaryParentId) => nodeDataById.get(secondaryParentId)?.title)
			.filter((title): title is string => Boolean(title));
		const isMultiParent = allParentIds.length > 1;

		const segment: SunburstSegmentLayout = {
			endAngle,
			fillColor,
			id: segmentId,
			innerRadius,
			isMultiParent,
			midAngle,
			nodeId,
			outerRadius,
			pathTitles,
			primaryParentSource,
			startAngle,
			strokeColor,
			title: nodeData.title,
		};

		const label = buildLabelLayout(segment, radialRingDistance);
		const interactionMeta: SunburstInteractionMeta = {
			alternateParentTitles,
			allParentIds,
			center: { x, y },
			hasMultipleParents: isMultiParent,
			nodeId,
			pathIds: pathNodeIds,
			pathTitles,
			primaryParentId: parentId,
			primaryParentSource,
			ring: { innerRadius, outerRadius },
			secondaryParentIds: secondaryParentIdsByNodeId[nodeId],
			segmentId,
			title: nodeData.title,
		};

		segments.push(segment);
		labels.push(label);
		segmentByNodeId[nodeId] = segment;
		labelByNodeId[nodeId] = label;
		interactionByNodeId[nodeId] = interactionMeta;
		layoutNodes.push({ id: nodeId, x, y });

		if (!parentData && rootNodeIds.length === 1 && pathTitles[0] !== nodeDataById.get(rootNodeIds[0])?.title) {
			interactionMeta.pathTitles.unshift(
				nodeDataById.get(rootNodeIds[0])?.title ?? pathTitles[0] ?? nodeData.title,
			);
		}
	}

	const maxRadius = holeRadius + Math.max(maxDepth - 1, 0) * (radialRingDistance + ringGap) + radialRingDistance;
	const centerNodeData = effectiveCenterNodeId !== undefined ? nodeDataById.get(effectiveCenterNodeId) : undefined;
	const centerNodeTitle = centerNodeData?.title;
	const centerNodeFillColor = centerNodeData?.color.shades[500]
		? oklchToHex(centerNodeData.color.shades[500])
		: '#ffffff';
	const centerNodeStrokeColor = deriveStrokeColor(centerNodeFillColor);

	if (effectiveCenterNodeId !== undefined && centerNodeData) {
		interactionByNodeId[effectiveCenterNodeId] = {
			alternateParentTitles: [],
			allParentIds: visibleParentsByNodeId.get(effectiveCenterNodeId) ?? [],
			center: { x: 0, y: 0 },
			hasMultipleParents: false,
			nodeId: effectiveCenterNodeId,
			pathIds: [effectiveCenterNodeId],
			pathTitles: [centerNodeData.title],
			primaryParentId: primaryParentByNodeId.get(effectiveCenterNodeId),
			primaryParentSource: primaryParentSourceByNodeId.get(effectiveCenterNodeId) ?? 'root',
			ring: { innerRadius: 0, outerRadius: holeRadius },
			secondaryParentIds: secondaryParentIdsByNodeId[effectiveCenterNodeId] ?? [],
			segmentId: `sunburst-center-${String(effectiveCenterNodeId)}`,
			title: centerNodeData.title,
		};
		layoutNodes.push({ id: effectiveCenterNodeId, x: 0, y: 0 });
	}

	return {
		interactionByNodeId,
		labelByNodeId,
		layoutNodes,
		primaryParentIdByNodeId: Object.fromEntries(
			Array.from(visibleNodeIds).map((nodeId) => [nodeId, primaryParentByNodeId.get(nodeId)]),
		),
		primaryParentSourceByNodeId: Object.fromEntries(
			Array.from(visibleNodeIds).map((nodeId) => [nodeId, primaryParentSourceByNodeId.get(nodeId) ?? 'fallback']),
		),
		renderData: {
			center: { x: 0, y: 0 },
			centerLabel: centerNodeTitle
				? {
						fillColor: centerNodeFillColor,
						fontSize: Math.min(28, holeRadius * 0.24),
						lines: wrapLabel(centerNodeTitle, 18),
						nodeId: effectiveCenterNodeId,
						radius: holeRadius - 8,
						strokeColor: centerNodeStrokeColor,
					}
				: undefined,
			debug: sunburstDebugEnabled
				? {
						baseColors: sunburstBaseColorDebugEntries,
						segments: sunburstColorDebugEntries,
					}
				: undefined,
			interactionByNodeId,
			labelByNodeId,
			labels,
			maxRadius,
			ringWidth: radialRingDistance,
			segmentByNodeId,
			segments,
		},
		rootNodeIds,
		secondaryParentIdsByNodeId,
	};
}

function buildDisplayChildren(
	parentId: number,
	displayChildrenByNodeId: Map<number, number[]>,
	nodeDataById: Map<number, PreviewGraphNodeData>,
	primaryParentByNodeId: Map<number, number>,
	primaryParentSourceByNodeId: Map<number, PrimaryParentSource>,
): DisplayTreeNode[] {
	const childIds = displayChildrenByNodeId.get(parentId) ?? [];

	return childIds.map((childId, order) => ({
		children: buildDisplayChildren(
			childId,
			displayChildrenByNodeId,
			nodeDataById,
			primaryParentByNodeId,
			primaryParentSourceByNodeId,
		),
		id: childId,
		order,
		parentId: primaryParentByNodeId.get(childId),
		primaryParentSource: primaryParentSourceByNodeId.get(childId) ?? 'fallback',
		title: nodeDataById.get(childId)?.title ?? `[Group ${String(childId)}]`,
	}));
}

function computeMinDistanceFromRoots(
	rootNodeIds: number[],
	visibleChildrenByNodeId: Map<number, number[]>,
): Map<number, number> {
	const distanceByNodeId = new Map<number, number>();
	const queue = rootNodeIds.map((rootNodeId) => ({ depth: 0, nodeId: rootNodeId }));

	for (const rootNodeId of rootNodeIds) {
		distanceByNodeId.set(rootNodeId, 0);
	}

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) continue;

		for (const childId of visibleChildrenByNodeId.get(current.nodeId) ?? []) {
			const nextDepth = current.depth + 1;
			if ((distanceByNodeId.get(childId) ?? Number.POSITIVE_INFINITY) <= nextDepth) continue;
			distanceByNodeId.set(childId, nextDepth);
			queue.push({ depth: nextDepth, nodeId: childId });
		}
	}

	return distanceByNodeId;
}

function breakCycles(
	primaryParentByNodeId: Map<number, number>,
	primaryParentSourceByNodeId: Map<number, PrimaryParentSource>,
): void {
	for (const nodeId of primaryParentByNodeId.keys()) {
		const visited = new Set<number>();
		let currentNodeId: number | undefined = nodeId;

		while (currentNodeId !== undefined) {
			if (visited.has(currentNodeId)) {
				primaryParentByNodeId.delete(nodeId);
				primaryParentSourceByNodeId.set(nodeId, 'root');
				break;
			}

			visited.add(currentNodeId);
			currentNodeId = primaryParentByNodeId.get(currentNodeId);
		}
	}
}

function buildLabelLayout(segment: SunburstSegmentLayout, ringHeight: number): SunburstLabelLayout {
	const angleSpan = segment.endAngle - segment.startAngle;
	const radius = (segment.innerRadius + segment.outerRadius) / 2;
	const arcLength = radius * angleSpan;
	const angleForText = segment.midAngle - Math.PI / 2;
	const orientation = angleSpan >= Math.PI / 9 && arcLength >= ringHeight * 1.25 ? 'tangential' : 'radial';
	let rotationInRadians = orientation === 'tangential' ? angleForText + Math.PI / 2 : angleForText;
	if (Math.cos(rotationInRadians) < 0) rotationInRadians += Math.PI;
	const rotation = (rotationInRadians * 180) / Math.PI;

	const x = radius * Math.cos(angleForText);
	const y = radius * Math.sin(angleForText);
	const maximumFontSize = Math.min(40, ringHeight * 0.38);
	const inlineSpace = Math.max(orientation === 'tangential' ? arcLength * 0.9 : ringHeight * 0.82, 1);
	const crossSpace = Math.max(orientation === 'tangential' ? ringHeight * 0.82 : arcLength * 0.72, 1);
	const { fontSize, lines } = fitLabelText(segment.title, {
		crossSpace,
		inlineSpace,
		maximumFontSize,
	});

	return {
		fontSize,
		isVisible: true,
		lines,
		nodeId: segment.nodeId,
		orientation,
		rotation,
		text: segment.title,
		textAlign: 'center',
		x,
		y,
	};
}

function findVisibleBranchRootNode(
	descendant: HierarchyRectangularNode<DisplayTreeNode>,
	effectiveCenterNodeId?: number,
): HierarchyRectangularNode<DisplayTreeNode> | undefined {
	return descendant
		.ancestors()
		.toReversed()
		.find((entry) => entry.data.id !== VIRTUAL_ROOT_ID && entry.data.id !== effectiveCenterNodeId);
}

function deriveSegmentColor(baseColor: string, depthOffset: number): string {
	return lightenHexColor(baseColor, depthOffset);
}

function deriveStrokeColor(fillColor: string): string {
	return adjustHexColor(fillColor, -0.14);
}

function deriveSeparatorColor(): string {
	return '#ffffff';
}

function adjustHexColor(hexColor: string, amount: number): string {
	const hex = hexColor.replace('#', '');
	const numeric = Number.parseInt(hex, 16);
	if (Number.isNaN(numeric)) return hexColor;

	const red = clampChannel((numeric >> 16) + Math.round(255 * amount));
	const green = clampChannel(((numeric >> 8) & 0xff) + Math.round(255 * amount));
	const blue = clampChannel((numeric & 0xff) + Math.round(255 * amount));

	return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function lightenHexColor(hexColor: string, depthOffset: number): string {
	if (depthOffset <= 0) return hexColor;

	const { hue, lightness, saturation } = hexToHsl(hexColor);
	const lightnessShift = depthOffset * 0.075;

	return hslToHex(
		hue,
		Math.max(0.12, Math.min(0.9, saturation * 0.96)),
		Math.max(0.22, Math.min(0.86, lightness + lightnessShift)),
	);
}

function deriveBaseNodeColor(
	nodeId: number,
	nodeDataById: Map<number, PreviewGraphNodeData>,
	debugEntries?: SunburstBaseColorDebugEntry[],
): string {
	const nodeData = nodeDataById.get(nodeId);
	if (!nodeData) {
		debugEntries?.push({
			derivedColor: '#94a3b8',
			nodeId,
			reason: 'missing-node',
		});
		return '#94a3b8';
	}

	const shade500 = nodeData.color.shades[500];
	const churchToolsColorName = nodeData.group.information.color;
	if (!shade500) {
		debugEntries?.push({
			derivedColor: '#94a3b8',
			groupColorName: churchToolsColorName,
			groupName: nodeData.group?.name,
			nodeId,
			nodeTitle: nodeData.title,
			rawColorCandidates: churchToolsColorName ? [`information.color=${churchToolsColorName}`] : [],
			reason: 'missing-shade-500',
			resolvedFromPath: churchToolsColorName ? 'information.color' : undefined,
		});
		return '#94a3b8';
	}

	const derivedColor = shade500.startsWith('#') ? shade500 : oklchToHex(shade500);
	const normalizedColor = derivedColor.trim().toLowerCase();
	if (!normalizedColor.startsWith('#') || normalizedColor.length !== 7) {
		debugEntries?.push({
			derivedColor,
			groupColorName: churchToolsColorName,
			groupName: nodeData.group?.name,
			nodeId,
			nodeTitle: nodeData.title,
			rawColorCandidates: churchToolsColorName ? [`information.color=${churchToolsColorName}`] : [],
			reason: 'invalid-conversion',
			resolvedFromPath: churchToolsColorName ? 'information.color' : undefined,
			shade500,
		});
		return '#94a3b8';
	}

	debugEntries?.push({
		derivedColor: normalizedColor,
		groupColorName: churchToolsColorName,
		groupName: nodeData.group?.name,
		nodeId,
		nodeTitle: nodeData.title,
		rawColorCandidates: churchToolsColorName ? [`information.color=${churchToolsColorName}`] : [],
		reason: 'converted',
		resolvedFromPath: churchToolsColorName ? 'information.color' : undefined,
		shade500,
	});
	return normalizedColor;
}

function hexToHsl(hexColor: string): { hue: number; lightness: number; saturation: number } {
	const normalized = hexColor.replace('#', '');
	const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
	const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
	const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const lightness = (max + min) / 2;
	const delta = max - min;
	if (delta === 0) return { hue: 0, lightness, saturation: 0 };

	const saturation = delta / (1 - Math.abs(2 * lightness - 1));
	let hue = 0;
	if (max === red) hue = 60 * (((green - blue) / delta) % 6);
	else if (max === green) hue = 60 * ((blue - red) / delta + 2);
	else hue = 60 * ((red - green) / delta + 4);
	return { hue: hue < 0 ? hue + 360 : hue, lightness, saturation };
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const intermediate = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const match = lightness - chroma / 2;
	const [red, green, blue] =
		hue < 60
			? [chroma, intermediate, 0]
			: hue < 120
				? [intermediate, chroma, 0]
				: hue < 180
					? [0, chroma, intermediate]
					: hue < 240
						? [0, intermediate, chroma]
						: hue < 300
							? [intermediate, 0, chroma]
							: [chroma, 0, intermediate];
	return `#${[red, green, blue]
		.map((channel) =>
			clampChannel(Math.round((channel + match) * 255))
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`;
}

function fitLabelText(
	title: string,
	{ crossSpace, inlineSpace, maximumFontSize }: { crossSpace: number; inlineSpace: number; maximumFontSize: number },
): { fontSize: number; lines: string[] } {
	const minFontSize = 5;
	const lineHeightFactor = 1.05;
	const words = title.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return { fontSize: minFontSize, lines: [] };

	const maxLines = Math.max(1, Math.min(words.length, Math.floor(crossSpace / (minFontSize * lineHeightFactor))));
	let bestFontSize = 0;
	let bestLines = [title];

	for (let lineCount = 1; lineCount <= maxLines; lineCount += 1) {
		const lines = wrapLabelBalanced(words, lineCount);
		if (lines.length === 0) continue;

		const widestLine = Math.max(...lines.map((line) => estimateTextWidthUnits(line)));
		if (widestLine <= 0) continue;

		const fontSizeByWidth = inlineSpace / widestLine;
		const fontSizeByHeight = crossSpace / (1 + (lines.length - 1) * lineHeightFactor);
		const fontSize = Math.max(minFontSize, Math.min(maximumFontSize, fontSizeByWidth, fontSizeByHeight));

		if (
			fontSize > bestFontSize + 0.01 ||
			(Math.abs(fontSize - bestFontSize) <= 0.01 && lines.length > bestLines.length)
		) {
			bestFontSize = fontSize;
			bestLines = lines;
		}
	}

	if (bestFontSize === 0) {
		const fallbackWidth = Math.max(estimateTextWidthUnits(title), 1);
		bestFontSize = Math.max(minFontSize, Math.min(maximumFontSize, inlineSpace / fallbackWidth));
	}

	return { fontSize: bestFontSize, lines: bestLines };
}

function wrapLabel(title: string, maxLineCharacters: number): string[] {
	const words = title.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];

	const lines: string[] = [];
	let currentLine = '';
	for (const word of words) {
		const nextLine = currentLine ? `${currentLine} ${word}` : word;
		if (nextLine.length <= maxLineCharacters || !currentLine) {
			currentLine = nextLine;
			continue;
		}
		lines.push(currentLine);
		currentLine = word;
	}
	if (currentLine) lines.push(currentLine);
	return lines;
}

function wrapLabelBalanced(words: string[], lineCount: number): string[] {
	if (words.length === 0) return [];
	if (lineCount <= 1 || words.length === 1) return [words.join(' ')];

	const memo = new Map<string, { lines: string[]; score: number }>();
	const totalWordCount = words.length;

	const partition = (startIndex: number, remainingLines: number): { lines: string[]; score: number } => {
		const memoKey = `${String(startIndex)}:${String(remainingLines)}`;
		const cached = memo.get(memoKey);
		if (cached) return cached;

		const remainingWords = totalWordCount - startIndex;
		if (remainingLines <= 1 || remainingWords <= 1) {
			const line = words.slice(startIndex).join(' ');
			const result = { lines: [line], score: estimateTextWidthUnits(line) };
			memo.set(memoKey, result);
			return result;
		}

		let bestResult: undefined | { lines: string[]; score: number };
		const maxBreakIndex = totalWordCount - remainingLines + 1;
		for (let endIndex = startIndex + 1; endIndex <= maxBreakIndex; endIndex += 1) {
			const line = words.slice(startIndex, endIndex).join(' ');
			const lineWidth = estimateTextWidthUnits(line);
			const next = partition(endIndex, remainingLines - 1);
			const score = Math.max(lineWidth, next.score);
			if (!bestResult || score < bestResult.score) {
				bestResult = { lines: [line, ...next.lines], score };
			}
		}

		const result = bestResult ?? { lines: [words.slice(startIndex).join(' ')], score: Number.POSITIVE_INFINITY };
		memo.set(memoKey, result);
		return result;
	};

	return partition(0, lineCount).lines;
}

function estimateTextWidthUnits(text: string): number {
	let width = 0;
	for (const character of text) {
		if (character === ' ') {
			width += 0.34;
			continue;
		}

		if ('ilIjtfr'.includes(character)) {
			width += 0.34;
			continue;
		}

		if ('mwMW@%&QGO'.includes(character)) {
			width += 0.9;
			continue;
		}

		if (/[A-Z0-9]/.test(character)) {
			width += 0.68;
			continue;
		}

		if (/[.,:;!|()[\]/\\-]/.test(character)) {
			width += 0.38;
			continue;
		}

		width += 0.56;
	}

	return width;
}

function clampChannel(value: number): number {
	return Math.max(0, Math.min(255, value));
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce<unknown>((current, segment) => {
		if (!current || typeof current !== 'object') return undefined;
		return (current as Record<string, unknown>)[segment];
	}, obj);
}

function parseNumericId(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
	if (typeof value === 'string') {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	return undefined;
}

function parseLinkedGroupId(value: unknown): number | undefined {
	const directId = parseNumericId(value);
	if (directId !== undefined) return directId;

	if (Array.isArray(value)) {
		for (const entry of value) {
			const parsedEntry = parseLinkedGroupId(entry);
			if (parsedEntry !== undefined) return parsedEntry;
		}
		return undefined;
	}

	if (!value || typeof value !== 'object') return undefined;

	const record = value as Record<string, unknown>;
	const candidates = [record.id, record.groupId, record.value, record.domainIdentifier, record.identifier];
	for (const candidate of candidates) {
		const parsed = parseNumericId(candidate);
		if (parsed !== undefined) return parsed;
	}

	return undefined;
}
