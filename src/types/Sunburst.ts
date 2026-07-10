export type PrimaryParentSource = 'churchtools-field' | 'fallback' | 'root';

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
	fontSize: number;
	isVisible: boolean;
	lines: string[];
	nodeId: number;
	orientation: 'radial' | 'tangential';
	rotation: number;
	text: string;
	textAlign: CanvasTextAlign;
	x: number;
	y: number;
}

export interface SunburstInteractionMeta {
	alternateParentTitles: string[];
	allParentIds: number[];
	center: { x: number; y: number };
	hasMultipleParents: boolean;
	nodeId: number;
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
	interactionByNodeId: Record<number, SunburstInteractionMeta>;
	labelByNodeId: Record<number, SunburstLabelLayout>;
	labels: SunburstLabelLayout[];
	maxRadius: number;
	ringWidth: number;
	segmentByNodeId: Record<number, SunburstSegmentLayout>;
	segments: SunburstSegmentLayout[];
}
