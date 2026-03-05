import type { PreviewGraphNodeData } from '../../../types/GraphNode';
import { type Edge, type Node, Position } from '../../../types/GraphTypes';

import { oklchToHex } from '../../../globals/Colors';
import { drawNodeCard, drawNodeCardHeaderOnly, measureNodeCard, type NodeCardMetrics } from './drawNodeCard2D';

export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

export interface NodeHit {
    node: Node<PreviewGraphNodeData>;
    width: number;
    height: number;
}

export class WebGLGraphEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private camera: Camera = { x: 0, y: 0, zoom: 1 };
    private nodes: Node<PreviewGraphNodeData>[] = [];
    private edges: Edge[] = [];
    private nodeMetrics: Map<string, NodeCardMetrics> = new Map();
    private showGroupTypes = true;
    private animationId: number | null = null;
    private animationTime = 0;
    private lastFrameTime = 0;
    private dpr = 1;
    private needsRender = true;
    private nodeMap: Map<string, Node<PreviewGraphNodeData>> = new Map();

    // Offscreen canvas for node texture caching
    private nodeCanvasCache: Map<string, { canvas: HTMLCanvasElement; width: number; height: number }> = new Map();
    
    // Measuring canvas (offscreen)
    private measureCanvas: HTMLCanvasElement;
    private measureCtx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Failed to get 2D context');
        this.ctx = ctx;
        this.dpr = window.devicePixelRatio || 1;
        
        this.measureCanvas = document.createElement('canvas');
        this.measureCanvas.width = 1;
        this.measureCanvas.height = 1;
        this.measureCtx = this.measureCanvas.getContext('2d')!;
    }

    setData(nodes: Node<PreviewGraphNodeData>[], edges: Edge[], showGroupTypes: boolean) {
        this.nodes = nodes;
        this.edges = edges;
        this.showGroupTypes = showGroupTypes;
        
        this.nodeMap.clear();
        for (const node of nodes) {
            this.nodeMap.set(node.id, node);
        }
        
        // Recalculate metrics and invalidate caches
        this.nodeMetrics.clear();
        this.nodeCanvasCache.clear();
        
        for (const node of nodes) {
            const metrics = measureNodeCard(this.measureCtx, node.data, showGroupTypes);
            this.nodeMetrics.set(node.id, metrics);
        }
        
        this.needsRender = true;
    }

    getCamera(): Camera {
        return { ...this.camera };
    }

    setCamera(camera: Camera) {
        this.camera = { ...camera };
        this.needsRender = true;
    }

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.needsRender = true;
    }

    getBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
        if (this.nodes.length === 0) return null;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of this.nodes) {
            const metrics = this.nodeMetrics.get(node.id);
            const w = metrics?.width ?? 250;
            const h = metrics?.height ?? 80;
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + w);
            maxY = Math.max(maxY, node.position.y + h);
        }
        return { minX, minY, maxX, maxY };
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

    worldToScreen(wx: number, wy: number): { x: number; y: number } {
        return {
            x: (wx - this.camera.x) * this.camera.zoom,
            y: (wy - this.camera.y) * this.camera.zoom,
        };
    }

    screenToWorld(sx: number, sy: number): { x: number; y: number } {
        return {
            x: sx / this.camera.zoom + this.camera.x,
            y: sy / this.camera.zoom + this.camera.y,
        };
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
                return { node, width: w, height: h };
            }
        }
        return null;
    }

    getNodeMetrics(nodeId: string): NodeCardMetrics | undefined {
        return this.nodeMetrics.get(nodeId);
    }

    getNodes(): Node<PreviewGraphNodeData>[] {
        return this.nodes;
    }

    getAllNodeMetrics(): Map<string, NodeCardMetrics> {
        return this.nodeMetrics;
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
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

    markDirty() {
        this.needsRender = true;
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

    private getOrCreateNodeCanvas(node: Node<PreviewGraphNodeData>): { canvas: HTMLCanvasElement; width: number; height: number } {
        const cached = this.nodeCanvasCache.get(node.id);
        if (cached) return cached;

        const metrics = this.nodeMetrics.get(node.id);
        const w = metrics?.width ?? 250;
        const h = metrics?.height ?? 80;
        
        const scale = 2; // high-res textures
        const offscreen = document.createElement('canvas');
        offscreen.width = w * scale;
        offscreen.height = h * scale;
        const offCtx = offscreen.getContext('2d')!;
        offCtx.scale(scale, scale);

        drawNodeCard(offCtx, node.data, this.showGroupTypes, 0, 0, w, h);

        const entry = { canvas: offscreen, width: w, height: h };
        this.nodeCanvasCache.set(node.id, entry);
        return entry;
    }

    private render() {
        const ctx = this.ctx;
        const rect = this.canvas.getBoundingClientRect();
        const viewW = rect.width;
        const viewH = rect.height;

        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        
        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewW, viewH);

        // Apply camera transform
        ctx.save();
        ctx.translate(-this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom);
        ctx.scale(this.camera.zoom, this.camera.zoom);

        // Draw edges
        this.drawEdges(ctx);

        // Draw nodes
        this.drawNodes(ctx, viewW, viewH);

        ctx.restore();
    }

    private drawGrid(ctx: CanvasRenderingContext2D, viewW: number, viewH: number) {
        const zoom = this.camera.zoom;
        
        // Only draw grid when zoomed in enough
        if (zoom < 0.3) return;

        const baseGridSize = 20;
        const worldW = viewW / zoom;
        const worldH = viewH / zoom;
        const maxDots = 2500;
        const gridSize = Math.max(baseGridSize, Math.ceil(Math.sqrt(worldW * worldH / maxDots)));

        const opacity = Math.min(1, (zoom - 0.3) / 0.7) * 0.3;
        ctx.fillStyle = `rgba(148, 163, 184, ${opacity})`;

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

    private getPortPosition(
        node: Node<PreviewGraphNodeData>,
        position: Position,
        metrics: NodeCardMetrics,
    ): { x: number; y: number } {
        const w = metrics.width;
        const h = metrics.height;
        switch (position) {
            case Position.Top:
                return { x: node.position.x + w / 2, y: node.position.y };
            case Position.Bottom:
                return { x: node.position.x + w / 2, y: node.position.y + h };
            case Position.Left:
                return { x: node.position.x, y: node.position.y + h / 2 };
            case Position.Right:
                return { x: node.position.x + w, y: node.position.y + h / 2 };
        }
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

    private railIntersectsNode(railY: number, railMinX: number, railMaxX: number, padding: number): boolean {
        for (const node of this.nodes) {
            const m = this.nodeMetrics.get(node.id);
            const w = m?.width ?? 250;
            const h = m?.height ?? 80;
            const nx = node.position.x;
            const ny = node.position.y;
            // Check if the horizontal rail at railY overlaps with this node's bounding box
            if (railY >= ny - padding && railY <= ny + h + padding &&
                railMaxX >= nx - padding && railMinX <= nx + w + padding) {
                return true;
            }
        }
        return false;
    }

    private railIntersectsNodeH(railX: number, railMinY: number, railMaxY: number, padding: number): boolean {
        for (const node of this.nodes) {
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

    private drawEdges(ctx: CanvasRenderingContext2D) {
        const zoom = this.camera.zoom;
        const rect = this.canvas.getBoundingClientRect();
        const viewW = rect.width;
        const viewH = rect.height;
        const defaultMetrics = { width: 250, height: 80, headerHeight: 38 };
        const arrowSize = 8;
        const edgePadding = 10;

        // Determine orientation from first edge
        let isVertical = true;
        if (this.edges.length > 0) {
            const firstSource = this.nodeMap.get(this.edges[0].source);
            if (firstSource) {
                const pos = (firstSource.sourcePosition as Position) ?? Position.Bottom;
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

            const sourcePos = (sourceNode.sourcePosition as Position) ?? Position.Bottom;
            const targetPos = (targetNode.targetPosition as Position) ?? Position.Top;

            const src = this.getPortPosition(sourceNode, sourcePos, sourceMetrics);
            const tgt = this.getPortPosition(targetNode, targetPos, targetMetrics);

            let group = edgesBySource.get(edge.source);
            if (!group) {
                group = { src, targets: [] };
                edgesBySource.set(edge.source, group);
            }
            group.targets.push(tgt);
        }

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#64748b';

        for (const group of edgesBySource.values()) {
            const { src, targets } = group;

            if (targets.length === 0) continue;

            if (isVertical) {
                // Frustum culling: compute bounding box of the entire group
                let bMinX = src.x, bMaxX = src.x, bMinY = src.y, bMaxY = src.y;
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
                    ctx.stroke();
                    this.drawArrowHead(ctx, targets[0].x, targets[0].y, isVertical, targets[0].y > src.y ? 1 : -1, arrowSize);
                    continue;
                }

                // Draw trunk: source port down to midY
                ctx.beginPath();
                ctx.moveTo(src.x, src.y);
                ctx.lineTo(src.x, midY);
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

                    this.drawArrowHead(ctx, tgt.x, tgt.y, isVertical, dirY, arrowSize);
                }
            } else {
                // Horizontal layout: same logic but rotated
                let bMinX = src.x, bMaxX = src.x, bMinY = src.y, bMaxY = src.y;
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
                    ctx.stroke();
                    this.drawArrowHead(ctx, targets[0].x, targets[0].y, isVertical, targets[0].x > src.x ? 1 : -1, arrowSize);
                    continue;
                }

                // Trunk: source port right to midX
                ctx.beginPath();
                ctx.moveTo(src.x, src.y);
                ctx.lineTo(midX, src.y);
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

                    this.drawArrowHead(ctx, tgt.x, tgt.y, isVertical, dirX, arrowSize);
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

    private drawPort(ctx: CanvasRenderingContext2D, px: number, py: number) {
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    private drawNodePorts(
        ctx: CanvasRenderingContext2D,
        node: Node<PreviewGraphNodeData>,
        w: number,
        h: number,
    ) {
        const sourcePos = (node.sourcePosition as Position) ?? Position.Bottom;
        const targetPos = (node.targetPosition as Position) ?? Position.Top;
        const x = node.position.x;
        const y = node.position.y;

        // Source port
        switch (sourcePos) {
            case Position.Bottom:
                this.drawPort(ctx, x + w / 2, y + h);
                break;
            case Position.Top:
                this.drawPort(ctx, x + w / 2, y);
                break;
            case Position.Right:
                this.drawPort(ctx, x + w, y + h / 2);
                break;
            case Position.Left:
                this.drawPort(ctx, x, y + h / 2);
                break;
        }

        // Target port
        switch (targetPos) {
            case Position.Top:
                this.drawPort(ctx, x + w / 2, y);
                break;
            case Position.Bottom:
                this.drawPort(ctx, x + w / 2, y + h);
                break;
            case Position.Left:
                this.drawPort(ctx, x, y + h / 2);
                break;
            case Position.Right:
                this.drawPort(ctx, x + w, y + h / 2);
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
            const metrics = this.nodeMetrics.get(node.id) ?? { width: 250, height: 80, headerHeight: 38 };
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
                );
                this.drawNodePorts(ctx, node, w, h);
            } else {
                // Minimal LOD: simple colored rectangle
                const borderColor = oklchToHex(node.data.color.shades[300]);
                const headerBg = oklchToHex(node.data.color.shades[100]);

                ctx.fillStyle = headerBg;
                roundRect(ctx, node.position.x, node.position.y, w, h, 6);
                ctx.fill();
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
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
