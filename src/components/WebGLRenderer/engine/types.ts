import type { PreviewGraphNodeData } from '../../../types/GraphNode';
import type { Node } from '../../../types/GraphTypes';
import type { SunburstInteractionMeta } from '../../../types/Sunburst';

export interface Bounds {
	maxX: number;
	maxY: number;
	minX: number;
	minY: number;
}

export interface Camera {
	x: number;
	y: number;
	zoom: number;
}

/** Camera target produced by a renderer's `getFocusTarget`; width/height are informational (unused for sunburst). */
export interface FocusTarget {
	height: number;
	width: number;
	x: number;
	y: number;
	zoom: number;
}

export interface NodeHit {
	height: number;
	interactionMeta?: SunburstInteractionMeta;
	node: Node<PreviewGraphNodeData>;
	width: number;
}

export interface WorldPoint {
	x: number;
	y: number;
}
