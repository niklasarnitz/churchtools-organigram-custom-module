import type { Bounds, Camera, FocusTarget, NodeHit, WorldPoint } from '../types';

/**
 * Base class every rendering algorithm (node/edge graph, sunburst, ...) implements.
 * `WebGLGraphEngine` owns the canvas, camera and animation loop and delegates all
 * algorithm-specific drawing, hit-testing and layout queries to a `GraphRenderer`.
 *
 * `TData` is the shape of data each concrete algorithm accepts via `setData` (e.g.
 * node/edge lists for the card graph, sunburst layout data for the radial renderer);
 * `getData` hands it back so shared callers don't need to know the concrete subclass.
 */
export abstract class GraphRenderer<TData> {
	protected currentData: TData | undefined;
	protected highlightedNodeIds = new Set<string>();
	protected hoveredNodeId: null | string = null;
	protected isDarkMode = false;

	/** Adds `nodeId` and every node reachable from it (per this algorithm's hierarchy) to `result`. */
	abstract collectSubgraphNodes(nodeId: string, result: Set<string>): void;

	abstract getBounds(): Bounds | null;

	getData(): TData | undefined {
		return this.currentData;
	}

	/** Returns the camera target to center on `nodeId`, or `null` if it doesn't exist. */
	abstract getFocusTarget(nodeId: string): FocusTarget | null;

	abstract hasData(): boolean;

	abstract hitTest(world: WorldPoint): NodeHit | null;

	abstract render(ctx: CanvasRenderingContext2D, camera: Camera, viewW: number, viewH: number): void;

	setDarkMode(isDarkMode: boolean): void {
		this.isDarkMode = isDarkMode;
	}

	setData(data: TData): void {
		this.currentData = data;
		this.onSetData(data);
	}

	setHighlightedNodeIds(nodeIds: Set<string>): void {
		this.highlightedNodeIds = nodeIds;
	}

	setHoveredNodeId(nodeId: null | string): void {
		this.hoveredNodeId = nodeId;
	}

	/** Algorithm-specific processing of newly set data; called once by `setData`. */
	protected abstract onSetData(data: TData): void;
}
