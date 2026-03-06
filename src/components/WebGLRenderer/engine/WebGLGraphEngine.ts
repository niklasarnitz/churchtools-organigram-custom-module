import type { PreviewGraphNodeData } from '../../../types/GraphNode';
import type { Edge, Node } from '../../../types/GraphTypes';

import { oklchToHex } from '../../../globals/Colors';
import { drawNodeCard, drawNodeCardHeaderOnly, measureNodeCard, type NodeCardMetrics } from './drawNodeCard2D';

export interface Camera {
	x: number;
	y: number;
	zoom: number;
}

export interface NodeHit {
	height: number;
	node: Node<PreviewGraphNodeData>;
	width: number;
}

export class WebGLGraphEngine {
	private animationId: null | number = null;
	private animationTime = 0;
	private camera: Camera = { x: 0, y: 0, zoom: 1 };
	private canvas: HTMLCanvasElement;
	private collapsedNodeIds = new Set<string>();
	private ctx: CanvasRenderingContext2D;
	private dpr = 1;
	private edges: Edge[] = [];
	private fps = 0;
	private frameCount = 0;
	private highlightedEdgeId: null | string = null;
	private highlightedNodeIds = new Set<string>();
	private isDarkMode = false;
	private lastFpsUpdate = 0;
	private lastFrameTime = 0;
	// Measuring canvas (offscreen)
	private measureCanvas: HTMLCanvasElement;
	private measureCtx: CanvasRenderingContext2D;
	private needsRender = true;
	private nodeMap = new Map<string, Node<PreviewGraphNodeData>>();
	private nodeMetrics = new Map<string, NodeCardMetrics>();
	private nodes: Node<PreviewGraphNodeData>[] = [];

	private showGroupTypes = true;

	private spatialCellSize = 200;
	private spatialGrid = new Map<string, Node<PreviewGraphNodeData>[]>();

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
	}

	edgeHitTest(screenX: number, screenY: number): Edge | null {
		const world = this.screenToWorld(screenX, screenY);
		const threshold = 6 / this.camera.zoom;

		for (const edge of this.edges) {
			if (!edge.sections) continue;
			for (const section of edge.sections) {
				const points: { x: number; y: number }[] = [section.startPoint];
				if (section.bendPoints) {
					for (const bp of section.bendPoints) points.push(bp);
				}
				points.push(section.endPoint);

				for (let i = 0; i < points.length - 1; i++) {
					if (
						pointToSegmentDist(
							world.x,
							world.y,
							points[i].x,
							points[i].y,
							points[i + 1].x,
							points[i + 1].y,
						) < threshold
					) {
						return edge;
					}
				}
			}
		}
		return null;
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
		const node = this.nodeMap.get(nodeId);
		if (!node) return;

		const metrics = this.nodeMetrics.get(nodeId);
		const w = metrics?.width ?? 250;
		const h = metrics?.height ?? 80;

		const zoom = 1.2;
		const cx = node.position.x + w / 2;
		const cy = node.position.y + h / 2;

		this.camera = {
			x: cx - canvasRect.width / 2 / zoom,
			y: cy - canvasRect.height / 2 / zoom,
			zoom,
		};
		this.needsRender = true;
	}

	getAllNodeMetrics(): Map<string, NodeCardMetrics> {
		return this.nodeMetrics;
	}

	getBounds(): null | { maxX: number; maxY: number; minX: number; minY: number } {
		if (this.nodes.length === 0) return null;

		let maxX = -Infinity,
			maxY = -Infinity,
			minX = Infinity,
			minY = Infinity;
		for (const node of this.nodes) {
			const metrics = this.nodeMetrics.get(node.id);
			const w = metrics?.width ?? 250;
			const h = metrics?.height ?? 80;
			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + w);
			maxY = Math.max(maxY, node.position.y + h);
		}
		return { maxX, maxY, minX, minY };
	}

	getCamera(): Camera {
		return { ...this.camera };
	}

	getCanvas(): HTMLCanvasElement {
		return this.canvas;
	}

	getCollapsedNodeIds(): Set<string> {
		return this.collapsedNodeIds;
	}

	getHighlightedEdgeId(): null | string {
		return this.highlightedEdgeId;
	}

	getHighlightedNodeIds(): Set<string> {
		return this.highlightedNodeIds;
	}

	getNodeMetrics(nodeId: string): NodeCardMetrics | undefined {
		return this.nodeMetrics.get(nodeId);
	}

	getNodes(): Node<PreviewGraphNodeData>[] {
		return this.nodes;
	}

	hitTest(screenX: number, screenY: number): NodeHit | null {
		const world = this.screenToWorld(screenX, screenY);

		// Iterate in reverse to get top-most node first
		for (let i = this.nodes.length - 1; i >= 0; i--) {
			const node = this.nodes[i];
			const metrics = this.nodeMetrics.get(node.id);
			const w = metrics?.width ?? 250;
			const h = metrics?.height ?? 80;

			if (
				world.x >= node.position.x &&
				world.x <= node.position.x + w &&
				world.y >= node.position.y &&
				world.y <= node.position.y + h
			) {
				return { height: h, node, width: w };
			}
		}
		return null;
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
		return {
			x: sx / this.camera.zoom + this.camera.x,
			y: sy / this.camera.zoom + this.camera.y,
		};
	}

	setCamera(camera: Camera) {
		this.camera = { ...camera };
		this.needsRender = true;
	}

	setData(nodes: Node<PreviewGraphNodeData>[], edges: Edge[], showGroupTypes: boolean, isDarkMode: boolean) {
		this.nodes = nodes;
		this.edges = edges;
		this.showGroupTypes = showGroupTypes;
		this.isDarkMode = isDarkMode;

		this.nodeMap.clear();
		for (const node of nodes) {
			this.nodeMap.set(node.id, node);
		}

		// Recalculate metrics
		this.nodeMetrics.clear();

		for (const node of nodes) {
			const metrics = measureNodeCard(this.measureCtx, node.data, showGroupTypes);
			this.nodeMetrics.set(node.id, metrics);
		}

		this.buildSpatialGrid();

		this.needsRender = true;
	}

	setHighlightedEdge(edgeId: null | string) {
		if (this.highlightedEdgeId !== edgeId) {
			this.highlightedEdgeId = edgeId;
			this.needsRender = true;
		}
	}

	setHighlightedSubgraph(nodeId: null | string) {
		this.highlightedNodeIds.clear();
		if (nodeId !== null) {
			this.collectSubgraphNodes(nodeId, this.highlightedNodeIds);
		}
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
		if (this.collapsedNodeIds.has(nodeId)) {
			this.collapsedNodeIds.delete(nodeId);
		} else {
			this.collapsedNodeIds.add(nodeId);
		}
		this.needsRender = true;
	}

	worldToScreen(wx: number, wy: number): { x: number; y: number } {
		return {
			x: (wx - this.camera.x) * this.camera.zoom,
			y: (wy - this.camera.y) * this.camera.zoom,
		};
	}

	private buildSpatialGrid() {
		this.spatialGrid.clear();
		for (const node of this.nodes) {
			const m = this.nodeMetrics.get(node.id);
			const w = m?.width ?? 250;
			const h = m?.height ?? 80;
			const minCellX = Math.floor(node.position.x / this.spatialCellSize);
			const maxCellX = Math.floor((node.position.x + w) / this.spatialCellSize);
			const minCellY = Math.floor(node.position.y / this.spatialCellSize);
			const maxCellY = Math.floor((node.position.y + h) / this.spatialCellSize);
			for (let cx = minCellX; cx <= maxCellX; cx++) {
				for (let cy = minCellY; cy <= maxCellY; cy++) {
					const key = `${String(cx)},${String(cy)}`;
					let cell = this.spatialGrid.get(key);
					if (!cell) {
						cell = [];
						this.spatialGrid.set(key, cell);
					}
					cell.push(node);
				}
			}
		}
	}

	private collectSubgraphNodes(nodeId: string, result: Set<string>) {
		result.add(nodeId);
		for (const edge of this.edges) {
			if (edge.source === nodeId && !result.has(edge.target)) {
				this.collectSubgraphNodes(edge.target, result);
			}
		}
	}

	private drawArrowHead(
		ctx: CanvasRenderingContext2D,
		toX: number,
		toY: number,
		fromX: number,
		fromY: number,
		size: number,
	) {
		const dx = toX - fromX;
		const dy = toY - fromY;
		const len = Math.sqrt(dx * dx + dy * dy);
		if (len === 0) return;
		const ux = dx / len;
		const uy = dy / len;
		ctx.beginPath();
		ctx.moveTo(toX, toY);
		ctx.lineTo(toX - ux * size + uy * size * 0.5, toY - uy * size - ux * size * 0.5);
		ctx.lineTo(toX - ux * size - uy * size * 0.5, toY - uy * size + ux * size * 0.5);
		ctx.closePath();
		ctx.fill();
	}

	private drawEdges(ctx: CanvasRenderingContext2D) {
		const zoom = this.camera.zoom;
		const rect = this.canvas.getBoundingClientRect();
		const viewW = rect.width;
		const viewH = rect.height;
		const arrowSize = 8;
		const hiddenIds = this.getHiddenNodeIds();
		const hasNodeHighlight = this.highlightedNodeIds.size > 0;

		const edgeColor = this.isDarkMode ? '#94a3b8' : '#64748b';
		const highlightColor = this.isDarkMode ? '#60a5fa' : '#3b82f6';
		ctx.lineJoin = 'round';

		for (const edge of this.edges) {
			const sections = edge.sections;
			if (!sections || sections.length === 0) continue;

			// Skip edges connected to hidden nodes
			if (hiddenIds.has(edge.source) || hiddenIds.has(edge.target)) continue;

			const isHighlighted = edge.id === this.highlightedEdgeId;
			const isInSubgraph =
				hasNodeHighlight &&
				this.highlightedNodeIds.has(edge.source) &&
				this.highlightedNodeIds.has(edge.target);

			// Dim edges not in the highlighted subgraph
			if (hasNodeHighlight && !isInSubgraph) {
				ctx.globalAlpha = 0.15;
			}

			for (const section of sections) {
				const points: { x: number; y: number }[] = [];
				points.push(section.startPoint);
				if (section.bendPoints) {
					for (const bp of section.bendPoints) {
						points.push(bp);
					}
				}
				points.push(section.endPoint);

				// Frustum culling
				let maxX = -Infinity,
					maxY = -Infinity,
					minX = Infinity,
					minY = Infinity;
				for (const p of points) {
					minX = Math.min(minX, p.x);
					minY = Math.min(minY, p.y);
					maxX = Math.max(maxX, p.x);
					maxY = Math.max(maxY, p.y);
				}
				const sMinX = (minX - this.camera.x) * zoom;
				const sMaxX = (maxX - this.camera.x) * zoom;
				const sMinY = (minY - this.camera.y) * zoom;
				const sMaxY = (maxY - this.camera.y) * zoom;
				if (sMaxX < 0 || sMaxY < 0 || sMinX > viewW || sMinY > viewH) continue;

				// Build path once
				const buildPath = () => {
					ctx.beginPath();
					ctx.moveTo(points[0].x, points[0].y);
					for (let i = 1; i < points.length; i++) {
						ctx.lineTo(points[i].x, points[i].y);
					}
				};

				if (isHighlighted) {
					// Glow pass
					ctx.save();
					ctx.shadowColor = highlightColor;
					ctx.shadowBlur = 12 / zoom;
					ctx.strokeStyle = highlightColor;
					ctx.lineWidth = 4;
					buildPath();
					ctx.stroke();
					ctx.restore();
				}

				// Normal pass
				ctx.strokeStyle = isHighlighted ? highlightColor : edgeColor;
				ctx.lineWidth = isHighlighted ? 3 : 2;
				buildPath();
				ctx.stroke();

				// Arrow head
				const last = points[points.length - 1];
				const prev = points[points.length - 2];
				ctx.fillStyle = isHighlighted ? highlightColor : edgeColor;
				this.drawArrowHead(ctx, last.x, last.y, prev.x, prev.y, arrowSize);
			}

			// Reset alpha
			ctx.globalAlpha = 1;
		}
	}

	private drawGrid(ctx: CanvasRenderingContext2D, viewW: number, viewH: number) {
		if (this.nodes.length === 0) return;

		const zoom = this.camera.zoom;

		// Only draw grid when zoomed in enough
		if (zoom < 0.3) return;

		const baseGridSize = 20;
		const worldW = viewW / zoom;
		const worldH = viewH / zoom;
		const maxDots = 2500;
		const gridSize = Math.max(baseGridSize, Math.ceil(Math.sqrt((worldW * worldH) / maxDots)));

		const opacity = Math.min(1, (zoom - 0.3) / 0.7) * (this.isDarkMode ? 0.2 : 0.3);
		ctx.fillStyle = this.isDarkMode
			? `rgba(51, 65, 85, ${String(opacity)})`
			: `rgba(148, 163, 184, ${String(opacity)})`;

		const startX = Math.floor(this.camera.x / gridSize) * gridSize;
		const startY = Math.floor(this.camera.y / gridSize) * gridSize;
		const endX = this.camera.x + worldW;
		const endY = this.camera.y + worldH;

		const dotSize = Math.max(1, 1.5 / zoom);

		for (let x = startX; x < endX; x += gridSize) {
			for (let y = startY; y < endY; y += gridSize) {
				const sx = (x - this.camera.x) * zoom;
				const sy = (y - this.camera.y) * zoom;
				ctx.fillRect(sx - dotSize / 2, sy - dotSize / 2, dotSize, dotSize);
			}
		}
	}

	private drawNodes(ctx: CanvasRenderingContext2D, viewW: number, viewH: number) {
		const zoom = this.camera.zoom;
		const hiddenIds = this.getHiddenNodeIds();
		const hasHighlight = this.highlightedNodeIds.size > 0;
		const highlightColor = this.isDarkMode ? '#60a5fa' : '#3b82f6';

		// Use spatial grid to only check nodes that are in or near the viewport
		const viewportMin = this.screenToWorld(0, 0);
		const viewportMax = this.screenToWorld(viewW, viewH);

		const candidates = this.getSpatialCandidates(viewportMin.x, viewportMin.y, viewportMax.x, viewportMax.y);

		for (const node of candidates) {
			if (hiddenIds.has(node.id)) continue;

			const metrics = this.nodeMetrics.get(node.id) ?? { headerHeight: 38, height: 80, width: 250 };
			const w = metrics.width;
			const h = metrics.height;

			// Frustum culling (more precise than spatial grid)
			const screenPos = this.worldToScreen(node.position.x, node.position.y);
			const screenW = w * zoom;
			const screenH = h * zoom;
			if (screenPos.x + screenW < 0 || screenPos.y + screenH < 0 || screenPos.x > viewW || screenPos.y > viewH) {
				continue;
			}

			// Dim non-highlighted nodes when a subgraph is highlighted
			if (hasHighlight && !this.highlightedNodeIds.has(node.id)) {
				ctx.globalAlpha = 0.25;
			}

			// Draw highlight glow for highlighted nodes
			if (hasHighlight && this.highlightedNodeIds.has(node.id)) {
				ctx.save();
				ctx.shadowColor = highlightColor;
				ctx.shadowBlur = 16 / zoom;
				ctx.strokeStyle = highlightColor;
				ctx.lineWidth = 3;
				roundRect(ctx, node.position.x, node.position.y, w, h, 12);
				ctx.stroke();
				ctx.restore();
			}

			if (zoom >= 0.4) {
				// Full node card drawn directly (vectorized)
				drawNodeCard(
					ctx,
					node.data,
					this.showGroupTypes,
					node.position.x,
					node.position.y,
					w,
					h,
					this.isDarkMode,
				);
			} else if (zoom >= 0.15) {
				// Header-only
				drawNodeCardHeaderOnly(
					ctx,
					node.data,
					this.showGroupTypes,
					node.position.x,
					node.position.y,
					w,
					h,
					metrics.headerHeight,
					this.isDarkMode,
				);
			} else {
				// Minimal LOD
				const borderColor = oklchToHex(node.data.color.shades[this.isDarkMode ? 700 : 300]);
				const headerBg = oklchToHex(node.data.color.shades[this.isDarkMode ? 900 : 100]);

				ctx.fillStyle = headerBg;
				roundRect(ctx, node.position.x, node.position.y, w, h, 6);
				ctx.fill();
				ctx.strokeStyle = borderColor;
				ctx.lineWidth = 2;
				ctx.stroke();
			}

			// Reset alpha
			ctx.globalAlpha = 1;
		}
	}

	private getHiddenNodeIds(): Set<string> {
		const hidden = new Set<string>();
		for (const collapsedId of this.collapsedNodeIds) {
			// Hide all descendants of the collapsed node (but not the collapsed node itself)
			for (const edge of this.edges) {
				if (edge.source === collapsedId) {
					this.collectSubgraphNodes(edge.target, hidden);
				}
			}
		}
		return hidden;
	}

	private getSpatialCandidates(
		minX: number,
		minY: number,
		maxX: number,
		maxY: number,
	): Set<Node<PreviewGraphNodeData>> {
		const result = new Set<Node<PreviewGraphNodeData>>();
		const minCellX = Math.floor(minX / this.spatialCellSize);
		const maxCellX = Math.floor(maxX / this.spatialCellSize);
		const minCellY = Math.floor(minY / this.spatialCellSize);
		const maxCellY = Math.floor(maxY / this.spatialCellSize);
		for (let cx = minCellX; cx <= maxCellX; cx++) {
			for (let cy = minCellY; cy <= maxCellY; cy++) {
				const cell = this.spatialGrid.get(`${String(cx)},${String(cy)}`);
				if (cell) {
					for (const node of cell) {
						result.add(node);
					}
				}
			}
		}
		return result;
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
		if (this.nodes.length === 0) return;

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

		// Draw grid
		this.drawGrid(ctx, viewW, viewH);

		// Draw edges
		this.drawEdges(ctx);

		// Draw nodes
		this.drawNodes(ctx, viewW, viewH);

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

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
	const dx = bx - ax;
	const dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - ax, py - ay);
	const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.arcTo(x + w, y, x + w, y + r, r);
	ctx.lineTo(x + w, y + h - r);
	ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
	ctx.lineTo(x + r, y + h);
	ctx.arcTo(x, y + h, x, y + h - r, r);
	ctx.lineTo(x, y + r);
	ctx.arcTo(x, y, x + r, y, r);
	ctx.closePath();
}
