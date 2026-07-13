import type { PreviewGraphNodeData } from '../../../../types/GraphNode';
import type { Edge, Node } from '../../../../types/GraphTypes';
import type { NodeCardMetrics } from '../drawNodeCard2D';
import type { Bounds, Camera, FocusTarget, NodeHit, WorldPoint } from '../types';

import { oklchToHex } from '../../../../globals/Colors';
import { screenToWorld, worldToScreen } from '../cameraMath';
import { drawNodeCard, drawNodeCardHeaderOnly, measureNodeCard } from '../drawNodeCard2D';
import { GraphRenderer } from './GraphRenderer';

export interface NodeGraphData {
	edges: Edge[];
	nodes: Node<PreviewGraphNodeData>[];
	showGroupTypes: boolean;
}

const DEFAULT_NODE_WIDTH = 250;
const DEFAULT_NODE_HEIGHT = 80;
const SPATIAL_CELL_SIZE = 200;

/** Renders the card-and-edge organigram: rectangular node cards connected by routed edges. */
export class NodeGraphRenderer extends GraphRenderer<NodeGraphData> {
	private collapsedNodeIds = new Set<string>();
	private edges: Edge[] = [];
	private highlightedEdgeId: null | string = null;
	private readonly measureCtx: CanvasRenderingContext2D;
	private nodeMap = new Map<string, Node<PreviewGraphNodeData>>();
	private nodeMetrics = new Map<string, NodeCardMetrics>();
	private nodes: Node<PreviewGraphNodeData>[] = [];
	private showGroupTypes = true;
	private spatialGrid = new Map<string, Node<PreviewGraphNodeData>[]>();

	constructor(measureCtx: CanvasRenderingContext2D) {
		super();
		this.measureCtx = measureCtx;
	}

	collectSubgraphNodes(nodeId: string, result: Set<string>): void {
		result.add(nodeId);
		for (const edge of this.edges) {
			if (edge.source === nodeId && !result.has(edge.target)) {
				this.collectSubgraphNodes(edge.target, result);
			}
		}
	}

	edgeHitTest(world: WorldPoint, camera: Camera): Edge | null {
		const threshold = 6 / camera.zoom;

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

	getAllNodeMetrics(): Map<string, NodeCardMetrics> {
		return this.nodeMetrics;
	}

	getBounds(): Bounds | null {
		if (this.nodes.length === 0) return null;

		let maxX = -Infinity,
			maxY = -Infinity,
			minX = Infinity,
			minY = Infinity;
		for (const node of this.nodes) {
			const metrics = this.nodeMetrics.get(node.id);
			const w = metrics?.width ?? DEFAULT_NODE_WIDTH;
			const h = metrics?.height ?? DEFAULT_NODE_HEIGHT;
			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + w);
			maxY = Math.max(maxY, node.position.y + h);
		}
		return { maxX, maxY, minX, minY };
	}

	getCollapsedNodeIds(): Set<string> {
		return this.collapsedNodeIds;
	}

	getFocusTarget(nodeId: string): FocusTarget | null {
		const node = this.nodeMap.get(nodeId);
		if (!node) return null;

		const metrics = this.nodeMetrics.get(nodeId);
		const w = metrics?.width ?? DEFAULT_NODE_WIDTH;
		const h = metrics?.height ?? DEFAULT_NODE_HEIGHT;

		return {
			height: h,
			width: w,
			x: node.position.x + w / 2,
			y: node.position.y + h / 2,
			zoom: 1.2,
		};
	}

	getHighlightedEdgeId(): null | string {
		return this.highlightedEdgeId;
	}

	getNodeMetrics(nodeId: string): NodeCardMetrics | undefined {
		return this.nodeMetrics.get(nodeId);
	}

	getNodes(): Node<PreviewGraphNodeData>[] {
		return this.nodes;
	}

	hasData(): boolean {
		return this.nodes.length > 0;
	}

	hitTest(world: WorldPoint): NodeHit | null {
		// Iterate in reverse to get top-most node first
		for (let i = this.nodes.length - 1; i >= 0; i--) {
			const node = this.nodes[i];
			const metrics = this.nodeMetrics.get(node.id);
			const w = metrics?.width ?? DEFAULT_NODE_WIDTH;
			const h = metrics?.height ?? DEFAULT_NODE_HEIGHT;

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

	render(ctx: CanvasRenderingContext2D, camera: Camera, viewW: number, viewH: number): void {
		this.drawGrid(ctx, camera, viewW, viewH);
		this.drawEdges(ctx, camera, viewW, viewH);
		this.drawNodes(ctx, camera, viewW, viewH);
	}

	setHighlightedEdgeId(edgeId: null | string): void {
		this.highlightedEdgeId = edgeId;
	}

	toggleCollapsedNode(nodeId: string): void {
		if (this.collapsedNodeIds.has(nodeId)) {
			this.collapsedNodeIds.delete(nodeId);
		} else {
			this.collapsedNodeIds.add(nodeId);
		}
	}

	protected onSetData(data: NodeGraphData): void {
		this.nodes = data.nodes;
		this.edges = data.edges;
		this.showGroupTypes = data.showGroupTypes;

		this.nodeMap.clear();
		for (const node of data.nodes) {
			this.nodeMap.set(node.id, node);
		}

		this.nodeMetrics.clear();
		for (const node of data.nodes) {
			this.nodeMetrics.set(node.id, measureNodeCard(this.measureCtx, node.data, data.showGroupTypes));
		}

		this.buildSpatialGrid();
	}

	private buildSpatialGrid(): void {
		this.spatialGrid.clear();
		for (const node of this.nodes) {
			const m = this.nodeMetrics.get(node.id);
			const w = m?.width ?? DEFAULT_NODE_WIDTH;
			const h = m?.height ?? DEFAULT_NODE_HEIGHT;
			const minCellX = Math.floor(node.position.x / SPATIAL_CELL_SIZE);
			const maxCellX = Math.floor((node.position.x + w) / SPATIAL_CELL_SIZE);
			const minCellY = Math.floor(node.position.y / SPATIAL_CELL_SIZE);
			const maxCellY = Math.floor((node.position.y + h) / SPATIAL_CELL_SIZE);
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

	private drawArrowHead(
		ctx: CanvasRenderingContext2D,
		toX: number,
		toY: number,
		fromX: number,
		fromY: number,
		size: number,
	): void {
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

	private drawEdges(ctx: CanvasRenderingContext2D, camera: Camera, viewW: number, viewH: number): void {
		const zoom = camera.zoom;
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
				const sMinX = (minX - camera.x) * zoom;
				const sMaxX = (maxX - camera.x) * zoom;
				const sMinY = (minY - camera.y) * zoom;
				const sMaxY = (maxY - camera.y) * zoom;
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

	private drawGrid(ctx: CanvasRenderingContext2D, camera: Camera, viewW: number, viewH: number): void {
		if (this.nodes.length === 0) return;

		const zoom = camera.zoom;

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

		const startX = Math.floor(camera.x / gridSize) * gridSize;
		const startY = Math.floor(camera.y / gridSize) * gridSize;
		const endX = camera.x + worldW;
		const endY = camera.y + worldH;

		const dotSize = Math.max(1, 1.5 / zoom);

		for (let x = startX; x < endX; x += gridSize) {
			for (let y = startY; y < endY; y += gridSize) {
				const sx = (x - camera.x) * zoom;
				const sy = (y - camera.y) * zoom;
				ctx.fillRect(sx - dotSize / 2, sy - dotSize / 2, dotSize, dotSize);
			}
		}
	}

	private drawNodes(ctx: CanvasRenderingContext2D, camera: Camera, viewW: number, viewH: number): void {
		const zoom = camera.zoom;
		const hiddenIds = this.getHiddenNodeIds();
		const hasHighlight = this.highlightedNodeIds.size > 0;
		const highlightColor = this.isDarkMode ? '#60a5fa' : '#3b82f6';

		// Use spatial grid to only check nodes that are in or near the viewport
		const viewportMin = screenToWorld(camera, 0, 0);
		const viewportMax = screenToWorld(camera, viewW, viewH);

		const candidates = this.getSpatialCandidates(viewportMin.x, viewportMin.y, viewportMax.x, viewportMax.y);

		for (const node of candidates) {
			if (hiddenIds.has(node.id)) continue;

			const metrics = this.nodeMetrics.get(node.id) ?? { headerHeight: 38, height: 80, width: 250 };
			const w = metrics.width;
			const h = metrics.height;

			// Frustum culling (more precise than spatial grid)
			const screenPos = worldToScreen(camera, node.position.x, node.position.y);
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
		const minCellX = Math.floor(minX / SPATIAL_CELL_SIZE);
		const maxCellX = Math.floor(maxX / SPATIAL_CELL_SIZE);
		const minCellY = Math.floor(minY / SPATIAL_CELL_SIZE);
		const maxCellY = Math.floor(maxY / SPATIAL_CELL_SIZE);
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
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
	const dx = bx - ax;
	const dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - ax, py - ay);
	const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
