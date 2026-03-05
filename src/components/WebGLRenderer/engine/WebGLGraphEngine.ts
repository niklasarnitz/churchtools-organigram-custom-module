import type { PreviewGraphNodeData } from '../../../types/GraphNode';

import { oklchToHex } from '../../../globals/Colors';
import { type Edge, type Node, Position } from '../../../types/GraphTypes';
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
    private ctx: CanvasRenderingContext2D;
    private dpr = 1;
    private edges: Edge[] = [];
    private isDarkMode = false;
    private lastFrameTime = 0;
    // Measuring canvas (offscreen)
    private measureCanvas: HTMLCanvasElement;
    private measureCtx: CanvasRenderingContext2D;
    private needsRender = true;
    // Offscreen canvas for node texture caching
    private nodeCanvasCache = new Map<string, { canvas: HTMLCanvasElement; height: number; width: number; }>();
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

    getBounds(): null | { maxX: number; maxY: number; minX: number; minY: number; } {
        if (this.nodes.length === 0) return null;
        
        let maxX = -Infinity, maxY = -Infinity, minX = Infinity, minY = Infinity;
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
        const themeChanged = this.isDarkMode !== isDarkMode;
        this.nodes = nodes;
        this.edges = edges;
        this.showGroupTypes = showGroupTypes;
        this.isDarkMode = isDarkMode;
        
        this.nodeMap.clear();
        for (const node of nodes) {
            this.nodeMap.set(node.id, node);
        }
        
        // Recalculate metrics and invalidate caches
        if (themeChanged) {
            this.nodeCanvasCache.clear();
        }
        this.nodeMetrics.clear();
        
        for (const node of nodes) {
            const metrics = measureNodeCard(this.measureCtx, node.data, showGroupTypes);
            this.nodeMetrics.set(node.id, metrics);
        }

        this.buildSpatialGrid();
        
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

    private drawArrowHead(
        ctx: CanvasRenderingContext2D,
        tx: number, ty: number,
        isVertical: boolean,
        dir: number,
        size: number,
    ) {
        ctx.beginPath();
        if (isVertical) {
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx - size, ty - size * dir);
            ctx.lineTo(tx + size, ty - size * dir);
        } else {
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx - size * dir, ty - size);
            ctx.lineTo(tx - size * dir, ty + size);
        }
        ctx.closePath();
        ctx.fill();
    }

    private drawEdges(ctx: CanvasRenderingContext2D) {
        const zoom = this.camera.zoom;
        const rect = this.canvas.getBoundingClientRect();
        const viewW = rect.width;
        const viewH = rect.height;
        const defaultMetrics = { headerHeight: 38, height: 80, width: 250 };
        const arrowSize = 8;
        const edgePadding = 10;

        // Determine orientation from first edge
        let isVertical = true;
        if (this.edges.length > 0) {
            const firstSource = this.nodeMap.get(this.edges[0].source);
            if (firstSource) {
                const pos = firstSource.sourcePosition ?? Position.Bottom;
                isVertical = pos === Position.Bottom || pos === Position.Top;
            }
        }

        // Group edges by source node for bundled drawing
        const edgesBySource = new Map<string, { src: { x: number; y: number }; targets: { x: number; y: number }[] }>();

        for (const edge of this.edges) {
            const sourceNode = this.nodeMap.get(edge.source);
            const targetNode = this.nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) continue;

            const sourceMetrics = this.nodeMetrics.get(sourceNode.id) ?? defaultMetrics;
            const targetMetrics = this.nodeMetrics.get(targetNode.id) ?? defaultMetrics;

            const sourcePos = sourceNode.sourcePosition ?? Position.Bottom;
            const targetPos = targetNode.targetPosition ?? Position.Top;

            const src = this.getPortPosition(sourceNode, sourcePos, sourceMetrics);
            const tgt = this.getPortPosition(targetNode, targetPos, targetMetrics);

            let group = edgesBySource.get(edge.source);
            if (!group) {
                group = { src, targets: [] };
                edgesBySource.set(edge.source, group);
            }
            group.targets.push(tgt);
        }

        ctx.strokeStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
        ctx.lineWidth = 2;
        ctx.fillStyle = this.isDarkMode ? '#94a3b8' : '#64748b';

        for (const group of edgesBySource.values()) {
            const { src, targets } = group;

            if (targets.length === 0) continue;

            if (isVertical) {
                // Frustum culling: compute bounding box of the entire group
                let bMaxX = src.x, bMaxY = src.y, bMinX = src.x, bMinY = src.y;
                for (const tgt of targets) {
                    bMinX = Math.min(bMinX, tgt.x);
                    bMaxX = Math.max(bMaxX, tgt.x);
                    bMinY = Math.min(bMinY, tgt.y);
                    bMaxY = Math.max(bMaxY, tgt.y);
                }
                const sMinX = (bMinX - this.camera.x) * zoom;
                const sMaxX = (bMaxX - this.camera.x) * zoom;
                const sMinY = (bMinY - this.camera.y) * zoom;
                const sMaxY = (bMaxY - this.camera.y) * zoom;
                if (sMaxX < 0 || sMaxY < 0 || sMinX > viewW || sMinY > viewH) continue;

                // midY is exactly halfway between the source port and the closest target port
                let closestTargetY = targets[0].y;
                for (const tgt of targets) {
                    if (Math.abs(tgt.y - src.y) < Math.abs(closestTargetY - src.y)) {
                        closestTargetY = tgt.y;
                    }
                }
                const idealMidY = (src.y + closestTargetY) / 2;

                // Compute rail extents for node-avoidance check
                const sortedTargets = [...targets].sort((a, b) => a.x - b.x);
                const leftX = Math.min(src.x, sortedTargets[0].x);
                const rightX = Math.max(src.x, sortedTargets[sortedTargets.length - 1].x);

                const midY = this.findSafeRailY(idealMidY, leftX, rightX, src.y, closestTargetY, edgePadding);

                if (targets.length === 1 && Math.abs(targets[0].x - src.x) < 1) {
                    // Single child directly below: straight line
                    ctx.beginPath();
                    ctx.moveTo(src.x, src.y);
                    ctx.lineTo(targets[0].x, targets[0].y);
                    ctx.strokeStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
                    ctx.stroke();
                    ctx.fillStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
                    this.drawArrowHead(ctx, targets[0].x, targets[0].y, isVertical, targets[0].y > src.y ? 1 : -1, arrowSize);
                    continue;
                }

                // Draw trunk: source port down to midY
                ctx.beginPath();
                ctx.moveTo(src.x, src.y);
                ctx.lineTo(src.x, midY);
                ctx.strokeStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
                ctx.stroke();

                // Draw horizontal rail at midY
                ctx.beginPath();
                ctx.moveTo(leftX, midY);
                ctx.lineTo(rightX, midY);
                ctx.stroke();

                // Draw branches from rail down to each target
                for (const tgt of targets) {
                    const dirY = tgt.y > src.y ? 1 : -1;

                    ctx.beginPath();
                    ctx.moveTo(tgt.x, midY);
                    ctx.lineTo(tgt.x, tgt.y);
                    ctx.stroke();

                    ctx.fillStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
                    this.drawArrowHead(ctx, tgt.x, tgt.y, isVertical, dirY, arrowSize);
                }
            } else {
                // Horizontal layout: same logic but rotated
                let bMaxX = src.x, bMaxY = src.y, bMinX = src.x, bMinY = src.y;
                for (const tgt of targets) {
                    bMinX = Math.min(bMinX, tgt.x);
                    bMaxX = Math.max(bMaxX, tgt.x);
                    bMinY = Math.min(bMinY, tgt.y);
                    bMaxY = Math.max(bMaxY, tgt.y);
                }
                const sMinX = (bMinX - this.camera.x) * zoom;
                const sMaxX = (bMaxX - this.camera.x) * zoom;
                const sMinY = (bMinY - this.camera.y) * zoom;
                const sMaxY = (bMaxY - this.camera.y) * zoom;
                if (sMaxX < 0 || sMaxY < 0 || sMinX > viewW || sMinY > viewH) continue;

                let closestTargetX = targets[0].x;
                for (const tgt of targets) {
                    if (Math.abs(tgt.x - src.x) < Math.abs(closestTargetX - src.x)) {
                        closestTargetX = tgt.x;
                    }
                }
                const idealMidX = (src.x + closestTargetX) / 2;

                const sortedTargets = [...targets].sort((a, b) => a.y - b.y);
                const topY = Math.min(src.y, sortedTargets[0].y);
                const bottomY = Math.max(src.y, sortedTargets[sortedTargets.length - 1].y);

                const midX = this.findSafeRailX(idealMidX, topY, bottomY, src.x, closestTargetX, edgePadding);

                if (targets.length === 1 && Math.abs(targets[0].y - src.y) < 1) {
                    ctx.beginPath();
                    ctx.moveTo(src.x, src.y);
                    ctx.lineTo(targets[0].x, targets[0].y);
                    ctx.strokeStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
                    ctx.stroke();
                    ctx.fillStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
                    this.drawArrowHead(ctx, targets[0].x, targets[0].y, isVertical, targets[0].x > src.x ? 1 : -1, arrowSize);
                    continue;
                }

                // Trunk: source port right to midX
                ctx.beginPath();
                ctx.moveTo(src.x, src.y);
                ctx.lineTo(midX, src.y);
                ctx.strokeStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
                ctx.stroke();

                // Vertical rail at midX
                ctx.beginPath();
                ctx.moveTo(midX, topY);
                ctx.lineTo(midX, bottomY);
                ctx.stroke();

                for (const tgt of targets) {
                    const dirX = tgt.x > src.x ? 1 : -1;

                    ctx.beginPath();
                    ctx.moveTo(midX, tgt.y);
                    ctx.lineTo(tgt.x, tgt.y);
                    ctx.stroke();

                    ctx.fillStyle = this.isDarkMode ? '#94a3b8' : '#64748b';
                    this.drawArrowHead(ctx, tgt.x, tgt.y, isVertical, dirX, arrowSize);
                }
            }
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
        const gridSize = Math.max(baseGridSize, Math.ceil(Math.sqrt(worldW * worldH / maxDots)));

        const opacity = Math.min(1, (zoom - 0.3) / 0.7) * (this.isDarkMode ? 0.2 : 0.3);
        ctx.fillStyle = this.isDarkMode ? `rgba(51, 65, 85, ${String(opacity)})` : `rgba(148, 163, 184, ${String(opacity)})`;

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

    private drawNodePorts(
        ctx: CanvasRenderingContext2D,
        node: Node<PreviewGraphNodeData>,
        w: number,
        h: number,
    ) {
        const sourcePos = node.sourcePosition ?? Position.Bottom;
        const targetPos = node.targetPosition ?? Position.Top;
        const x = node.position.x;
        const y = node.position.y;

        // Source port
        switch (sourcePos) {
            case Position.Bottom:
                this.drawPort(ctx, x + w / 2, y + h);
                break;
            case Position.Left:
                this.drawPort(ctx, x, y + h / 2);
                break;
            case Position.Right:
                this.drawPort(ctx, x + w, y + h / 2);
                break;
            case Position.Top:
                this.drawPort(ctx, x + w / 2, y);
                break;
        }

        // Target port
        switch (targetPos) {
            case Position.Bottom:
                this.drawPort(ctx, x + w / 2, y + h);
                break;
            case Position.Left:
                this.drawPort(ctx, x, y + h / 2);
                break;
            case Position.Right:
                this.drawPort(ctx, x + w, y + h / 2);
                break;
            case Position.Top:
                this.drawPort(ctx, x + w / 2, y);
                break;
        }
    }

    private drawNodes(ctx: CanvasRenderingContext2D, viewW: number, viewH: number) {
        const zoom = this.camera.zoom;

        // LOD levels:
        // zoom >= 0.4  → full card with members + ports
        // zoom >= 0.15 → header only (title + group type + ports, no members)
        // zoom < 0.15  → simple colored rectangle, no text

        for (const node of this.nodes) {
            const metrics = this.nodeMetrics.get(node.id) ?? { headerHeight: 38, height: 80, width: 250 };
            const w = metrics.width;
            const h = metrics.height;

            // Frustum culling
            const screenPos = this.worldToScreen(node.position.x, node.position.y);
            const screenW = w * zoom;
            const screenH = h * zoom;
            if (
                screenPos.x + screenW < 0 ||
                screenPos.y + screenH < 0 ||
                screenPos.x > viewW ||
                screenPos.y > viewH
            ) {
                continue;
            }

            if (zoom >= 0.4) {
                // Full node card from cached canvas
                const cached = this.getOrCreateNodeCanvas(node);
                ctx.drawImage(cached.canvas, node.position.x, node.position.y, cached.width, cached.height);
                // Ports drawn on world canvas so they aren't clipped
                this.drawNodePorts(ctx, node, w, h);
            } else if (zoom >= 0.15) {
                // Header-only: colored header with white body, no member details
                drawNodeCardHeaderOnly(
                    ctx,
                    node.data,
                    this.showGroupTypes,
                    node.position.x,
                    node.position.y,
                    w,
                    h,
                    metrics.headerHeight,
                    this.isDarkMode
                );
                this.drawNodePorts(ctx, node, w, h);
            } else {
                // Minimal LOD: simple colored rectangle
                const borderColor = oklchToHex(node.data.color.shades[this.isDarkMode ? 700 : 300]);
                const headerBg = oklchToHex(node.data.color.shades[this.isDarkMode ? 900 : 100]);

                ctx.fillStyle = headerBg;
                roundRect(ctx, node.position.x, node.position.y, w, h, 6);
                ctx.fill();
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }

    private drawPort(ctx: CanvasRenderingContext2D, px: number, py: number) {
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.isDarkMode ? '#64748b' : '#94a3b8';
        ctx.fill();
        ctx.strokeStyle = this.isDarkMode ? '#0f172a' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    private findSafeRailX(idealX: number, railMinY: number, railMaxY: number, srcX: number, tgtX: number, edgePadding: number): number {
        const minX = Math.min(srcX, tgtX) + edgePadding;
        const maxX = Math.max(srcX, tgtX) - edgePadding;
        if (minX >= maxX) return idealX;

        if (!this.railIntersectsNodeH(idealX, railMinY, railMaxY, edgePadding)) {
            return idealX;
        }

        for (let offset = edgePadding; offset < (maxX - minX); offset += edgePadding) {
            const left = idealX - offset;
            if (left >= minX && !this.railIntersectsNodeH(left, railMinY, railMaxY, edgePadding)) {
                return left;
            }
            const right = idealX + offset;
            if (right <= maxX && !this.railIntersectsNodeH(right, railMinY, railMaxY, edgePadding)) {
                return right;
            }
        }
        return idealX;
    }

    private findSafeRailY(idealY: number, railMinX: number, railMaxX: number, srcY: number, tgtY: number, edgePadding: number): number {
        const minY = Math.min(srcY, tgtY) + edgePadding;
        const maxY = Math.max(srcY, tgtY) - edgePadding;
        if (minY >= maxY) return idealY;

        // Check if idealY intersects any node
        if (!this.railIntersectsNode(idealY, railMinX, railMaxX, edgePadding)) {
            return idealY;
        }

        // Search outward from idealY for a safe position
        for (let offset = edgePadding; offset < (maxY - minY); offset += edgePadding) {
            const above = idealY - offset;
            if (above >= minY && !this.railIntersectsNode(above, railMinX, railMaxX, edgePadding)) {
                return above;
            }
            const below = idealY + offset;
            if (below <= maxY && !this.railIntersectsNode(below, railMinX, railMaxX, edgePadding)) {
                return below;
            }
        }
        return idealY;
    }

    private getOrCreateNodeCanvas(node: Node<PreviewGraphNodeData>): { canvas: HTMLCanvasElement; height: number; width: number; } {
        const cached = this.nodeCanvasCache.get(node.id);
        if (cached) return cached;

        const metrics = this.nodeMetrics.get(node.id);
        const w = metrics?.width ?? 250;
        const h = metrics?.height ?? 80;
        
        const scale = 2; // high-res textures
        const offscreen = document.createElement('canvas');
        offscreen.width = w * scale;
        offscreen.height = h * scale;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) throw new Error('Failed to get offscreen 2D context');
        offCtx.scale(scale, scale);

        drawNodeCard(offCtx, node.data, this.showGroupTypes, 0, 0, w, h, this.isDarkMode);

        const entry = { canvas: offscreen, height: h, width: w };
        this.nodeCanvasCache.set(node.id, entry);
        return entry;
    }

    private getPortPosition(
        node: Node<PreviewGraphNodeData>,
        position: Position,
        metrics: NodeCardMetrics,
    ): { x: number; y: number } {
        const w = metrics.width;
        const h = metrics.height;
        switch (position) {
            case Position.Bottom:
                return { x: node.position.x + w / 2, y: node.position.y + h };
            case Position.Left:
                return { x: node.position.x, y: node.position.y + h / 2 };
            case Position.Right:
                return { x: node.position.x + w, y: node.position.y + h / 2 };
            case Position.Top:
                return { x: node.position.x + w / 2, y: node.position.y };
        }
    }

    private getSpatialCandidates(minX: number, minY: number, maxX: number, maxY: number): Set<Node<PreviewGraphNodeData>> {
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

    private railIntersectsNode(railY: number, railMinX: number, railMaxX: number, padding: number): boolean {
        const candidates = this.getSpatialCandidates(railMinX - padding, railY - padding, railMaxX + padding, railY + padding);
        for (const node of candidates) {
            const m = this.nodeMetrics.get(node.id);
            const w = m?.width ?? 250;
            const h = m?.height ?? 80;
            const nx = node.position.x;
            const ny = node.position.y;
            if (railY >= ny - padding && railY <= ny + h + padding &&
                railMaxX >= nx - padding && railMinX <= nx + w + padding) {
                return true;
            }
        }
        return false;
    }

    private railIntersectsNodeH(railX: number, railMinY: number, railMaxY: number, padding: number): boolean {
        const candidates = this.getSpatialCandidates(railX - padding, railMinY - padding, railX + padding, railMaxY + padding);
        for (const node of candidates) {
            const m = this.nodeMetrics.get(node.id);
            const w = m?.width ?? 250;
            const h = m?.height ?? 80;
            const nx = node.position.x;
            const ny = node.position.y;
            if (railX >= nx - padding && railX <= nx + w + padding &&
                railMaxY >= ny - padding && railMinY <= ny + h + padding) {
                return true;
            }
        }
        return false;
    }

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
    }
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
) {
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
