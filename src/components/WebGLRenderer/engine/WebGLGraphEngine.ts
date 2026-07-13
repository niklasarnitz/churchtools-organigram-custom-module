import type { PreviewGraphNodeData } from '../../../types/GraphNode';
import type { Edge, Node } from '../../../types/GraphTypes';
import type { SunburstInteractionMeta, SunburstRenderData } from '../../../types/Sunburst';
import type { NodeCardMetrics } from './drawNodeCard2D';
import type { GraphRenderer } from './renderers/GraphRenderer';
import type { Bounds, Camera, NodeHit } from './types';

import { screenToWorld, worldToScreen } from './cameraMath';
import { NodeGraphRenderer } from './renderers/NodeGraphRenderer';
import { SunburstGraphRenderer } from './renderers/SunburstGraphRenderer';

export type { Camera, NodeHit };

/**
 * Owns the canvas, camera and animation loop, and delegates all algorithm-specific
 * drawing/hit-testing to the currently active `GraphRenderer` (node graph or sunburst).
 */
export class WebGLGraphEngine {
	private activeRenderer: GraphRenderer<unknown>;
	private animationId: null | number = null;
	private animationTime = 0;
	private camera: Camera = { x: 0, y: 0, zoom: 1 };
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private dpr = 1;
	private fps = 0;
	private frameCount = 0;
	private readonly highlightedNodeIds = new Set<string>();
	private hoveredNodeId: null | string = null;
	private isDarkMode = false;
	private lastFpsUpdate = 0;
	private lastFrameTime = 0;
	// Measuring canvas (offscreen)
	private readonly measureCanvas: HTMLCanvasElement;
	private readonly measureCtx: CanvasRenderingContext2D;
	private needsRender = true;
	private readonly nodeGraphRenderer: NodeGraphRenderer;
	private nodes: Node<PreviewGraphNodeData>[] = [];
	private readonly sunburstGraphRenderer: SunburstGraphRenderer;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const ctx = canvas.getContext('2d', { alpha: false });
		if (!ctx) throw new Error('Failed to get 2D context');
		this.ctx = ctx;
		this.dpr = window.devicePixelRatio || 1;

		this.measureCanvas = document.createElement('canvas');
		this.measureCanvas.width = 1;
		this.measureCanvas.height = 1;
		const measureCtx = this.measureCanvas.getContext('2d');
		if (!measureCtx) throw new Error('Failed to get measure 2D context');
		this.measureCtx = measureCtx;

		this.nodeGraphRenderer = new NodeGraphRenderer(this.measureCtx);
		this.sunburstGraphRenderer = new SunburstGraphRenderer();
		// Both renderers share the same mutable Set so highlighting survives a mode switch.
		this.nodeGraphRenderer.setHighlightedNodeIds(this.highlightedNodeIds);
		this.sunburstGraphRenderer.setHighlightedNodeIds(this.highlightedNodeIds);
		this.activeRenderer = this.nodeGraphRenderer;
	}

	edgeHitTest(screenX: number, screenY: number): Edge | null {
		if (this.activeRenderer !== this.nodeGraphRenderer) return null;
		const world = this.screenToWorld(screenX, screenY);
		return this.nodeGraphRenderer.edgeHitTest(world, this.camera);
	}

	fitView(padding = 0.05) {
		const bounds = this.getBounds();
		if (!bounds) return;

		const rect = this.canvas.getBoundingClientRect();
		const viewW = rect.width;
		const viewH = rect.height;

		const graphW = bounds.maxX - bounds.minX;
		const graphH = bounds.maxY - bounds.minY;

		if (graphW === 0 || graphH === 0) return;

		const scaleX = viewW / (graphW * (1 + padding * 2));
		const scaleY = viewH / (graphH * (1 + padding * 2));
		const zoom = Math.min(scaleX, scaleY, 4);

		this.camera = {
			x: bounds.minX + graphW / 2 - viewW / 2 / zoom,
			y: bounds.minY + graphH / 2 - viewH / 2 / zoom,
			zoom,
		};
		this.needsRender = true;
	}

	focusNode(nodeId: string, canvasRect: DOMRect) {
		const target = this.activeRenderer.getFocusTarget(nodeId);
		if (!target) return;

		this.camera = {
			x: target.x - canvasRect.width / 2 / target.zoom,
			y: target.y - canvasRect.height / 2 / target.zoom,
			zoom: target.zoom,
		};
		this.needsRender = true;
	}

	getAllNodeMetrics(): Map<string, NodeCardMetrics> {
		return this.nodeGraphRenderer.getAllNodeMetrics();
	}

	getBounds(): Bounds | null {
		return this.activeRenderer.getBounds();
	}

	getCamera(): Camera {
		return { ...this.camera };
	}

	getCanvas(): HTMLCanvasElement {
		return this.canvas;
	}

	getCollapsedNodeIds(): Set<string> {
		return this.nodeGraphRenderer.getCollapsedNodeIds();
	}

	getHighlightedEdgeId(): null | string {
		return this.nodeGraphRenderer.getHighlightedEdgeId();
	}

	getHighlightedNodeIds(): Set<string> {
		return this.highlightedNodeIds;
	}

	getNodeMetrics(nodeId: string): NodeCardMetrics | undefined {
		return this.nodeGraphRenderer.getNodeMetrics(nodeId);
	}

	getNodes(): Node<PreviewGraphNodeData>[] {
		return this.nodes;
	}

	getSunburstInteractionMeta(nodeId: string): SunburstInteractionMeta | undefined {
		if (this.activeRenderer !== this.sunburstGraphRenderer) return undefined;
		return this.sunburstGraphRenderer.getInteractionMeta(nodeId);
	}

	getSunburstRenderData(): SunburstRenderData | undefined {
		return this.activeRenderer === this.sunburstGraphRenderer
			? this.sunburstGraphRenderer.getRenderData()
			: undefined;
	}

	hitTest(screenX: number, screenY: number): NodeHit | null {
		const world = this.screenToWorld(screenX, screenY);
		return this.activeRenderer.hitTest(world);
	}

	markDirty() {
		this.needsRender = true;
	}

	resize() {
		this.dpr = window.devicePixelRatio || 1;
		const rect = this.canvas.getBoundingClientRect();
		this.canvas.width = rect.width * this.dpr;
		this.canvas.height = rect.height * this.dpr;
		this.needsRender = true;
	}

	screenToWorld(sx: number, sy: number): { x: number; y: number } {
		return screenToWorld(this.camera, sx, sy);
	}

	setCamera(camera: Camera) {
		this.camera = { ...camera };
		this.needsRender = true;
	}

	setData(
		nodes: Node<PreviewGraphNodeData>[],
		edges: Edge[],
		showGroupTypes: boolean,
		isDarkMode: boolean,
		sunburstRenderData?: SunburstRenderData,
	) {
		this.nodes = nodes;
		this.isDarkMode = isDarkMode;
		this.nodeGraphRenderer.setDarkMode(isDarkMode);
		this.sunburstGraphRenderer.setDarkMode(isDarkMode);
		this.nodeGraphRenderer.setHoveredNodeId(null);
		this.sunburstGraphRenderer.setHoveredNodeId(null);
		this.hoveredNodeId = null;

		if (sunburstRenderData) {
			this.activeRenderer = this.sunburstGraphRenderer;
			this.sunburstGraphRenderer.setData({ nodes, sunburstRenderData });
		} else {
			this.activeRenderer = this.nodeGraphRenderer;
			this.nodeGraphRenderer.setData({ edges, nodes, showGroupTypes });
		}

		this.needsRender = true;
	}

	setHighlightedEdge(edgeId: null | string) {
		if (this.nodeGraphRenderer.getHighlightedEdgeId() !== edgeId) {
			this.nodeGraphRenderer.setHighlightedEdgeId(edgeId);
			this.needsRender = true;
		}
	}

	setHighlightedSubgraph(nodeId: null | string) {
		this.highlightedNodeIds.clear();
		if (nodeId !== null) {
			this.activeRenderer.collectSubgraphNodes(nodeId, this.highlightedNodeIds);
		}
		this.needsRender = true;
	}

	setHoveredNodeId(nodeId: null | string) {
		if (this.hoveredNodeId === nodeId) return;
		this.hoveredNodeId = nodeId;
		this.nodeGraphRenderer.setHoveredNodeId(nodeId);
		this.sunburstGraphRenderer.setHoveredNodeId(nodeId);
		this.needsRender = true;
	}

	start() {
		this.lastFrameTime = performance.now();
		this.loop(this.lastFrameTime);
	}

	stop() {
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	toggleCollapsedNode(nodeId: string) {
		this.nodeGraphRenderer.toggleCollapsedNode(nodeId);
		this.needsRender = true;
	}

	worldToScreen(wx: number, wy: number): { x: number; y: number } {
		return worldToScreen(this.camera, wx, wy);
	}

	private loop = (time: number) => {
		const dt = (time - this.lastFrameTime) / 1000;
		this.lastFrameTime = time;
		this.animationTime += dt;

		// Re-render for edge dash animation every ~100ms, or immediately if dirty
		if (this.needsRender || dt > 0.1) {
			this.render();
			this.needsRender = false;
		}
		this.animationId = requestAnimationFrame(this.loop);
	};

	private render() {
		if (!this.activeRenderer.hasData()) return;

		const ctx = this.ctx;
		const rect = this.canvas.getBoundingClientRect();
		const viewW = rect.width;
		const viewH = rect.height;

		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

		// Clear
		ctx.fillStyle = this.isDarkMode ? '#020617' : '#ffffff';
		ctx.fillRect(0, 0, viewW, viewH);

		// Apply camera transform
		ctx.save();
		ctx.translate(-this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom);
		ctx.scale(this.camera.zoom, this.camera.zoom);

		this.activeRenderer.render(ctx, this.camera, viewW, viewH);

		ctx.restore();

		// FPS Counter - drawn on screen (not affected by camera)
		this.frameCount++;
		const now = performance.now();
		const elapsed = now - this.lastFpsUpdate;
		if (elapsed >= 500) {
			this.fps = Math.round((this.frameCount * 1000) / elapsed);
			this.lastFpsUpdate = now;
			this.frameCount = 0;
		}

		if (this.fps > 0) {
			ctx.fillStyle = this.isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)';
			ctx.fillRect(viewW - 70, 10, 60, 25);
			ctx.strokeStyle = this.isDarkMode ? '#334155' : '#e2e8f0';
			ctx.lineWidth = 1;
			ctx.strokeRect(viewW - 70, 10, 60, 25);

			ctx.fillStyle = this.fps < 30 ? '#ef4444' : this.isDarkMode ? '#94a3b8' : '#64748b';
			ctx.font = 'bold 12px Lato, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(`${String(this.fps)} FPS`, viewW - 40, 23);
		}
	}
}
