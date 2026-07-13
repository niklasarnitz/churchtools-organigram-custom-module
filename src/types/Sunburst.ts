/* eslint-disable perfectionist/sort-interfaces */
/* eslint-disable perfectionist/sort-modules */

export type PrimaryParentSource = 'churchtools-field' | 'fallback' | 'root';
export type SunburstColorMode = 'group' | 'groupType' | 'segment';

export interface SunburstColorDebugEntry {
	ancestorIds: number[];
	ancestorTitles: string[];
	branchRootColor: string;
	branchRootDepth: number;
	branchRootId: number;
	branchRootTitle: string;
	depth: number;
	effectiveCenterNodeId?: number;
	fillColor: string;
	nodeId: number;
	nodeTitle: string;
}

export interface SunburstBaseColorDebugEntry {
	derivedColor: string;
	groupColorName?: string;
	groupName?: string;
	nodeId: number;
	nodeTitle?: string;
	rawColorCandidates?: string[];
	reason: 'converted' | 'invalid-conversion' | 'missing-node' | 'missing-shade-500';
	resolvedFromPath?: string;
	shade500?: string;
}

export interface SunburstSegmentLayout {
	endAngle: number;
	fillColor: string;
	id: string;
	innerRadius: number;
	isMultiParent: boolean;
	midAngle: number;
	nodeId: number;
	outerRadius: number;
	pathTitles: string[];
	primaryParentSource: PrimaryParentSource;
	startAngle: number;
	strokeColor: string;
	title: string;
}

export interface SunburstLabelLayout {
	flipped: boolean;
	fontSize: number;
	isVisible: boolean;
	lines: string[];
	nodeId: number;
	orientation: 'radial' | 'tangential';
	rotation: number;
	text: string;
	textAnchor: 'end' | 'middle' | 'start';
	textAlign: CanvasTextAlign;
	tangentialLineDirection: 'inside-out' | 'outside-in';
	x: number;
	y: number;
}

export interface SunburstInteractionMeta {
	alternateParentTitles: string[];
	allParentIds: number[];
	center: { x: number; y: number };
	hasMultipleParents: boolean;
	nodeId: number;
	parentGroups: {
		id: number;
		isPrimary: boolean;
		primarySource?: 'churchtools-field' | 'fallback';
		title: string;
	}[];
	pathIds: number[];
	pathTitles: string[];
	primaryParentId?: number;
	primaryParentSource: PrimaryParentSource;
	ring: { innerRadius: number; outerRadius: number };
	secondaryParentIds: number[];
	segmentId: string;
	title: string;
}

export interface SunburstRenderData {
	center: { x: number; y: number };
	centerLabel?: {
		fillColor: string;
		fontSize: number;
		lines: string[];
		nodeId?: number;
		radius: number;
		strokeColor: string;
	};
	debug?: {
		baseColors: SunburstBaseColorDebugEntry[];
		segments: SunburstColorDebugEntry[];
	};
	interactionByNodeId: Record<number, SunburstInteractionMeta>;
	labelByNodeId: Record<number, SunburstLabelLayout>;
	labels: SunburstLabelLayout[];
	maxRadius: number;
	ringWidth: number;
	segmentByNodeId: Record<number, SunburstSegmentLayout>;
	segments: SunburstSegmentLayout[];
}
