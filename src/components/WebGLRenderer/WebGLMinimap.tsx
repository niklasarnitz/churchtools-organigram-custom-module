import React, { useCallback, useEffect, useRef } from 'react';

import type { Camera, WebGLGraphEngine } from './engine/WebGLGraphEngine';

import { oklchToHex } from '../../globals/Colors';

interface WebGLMinimapProps {
    camera: Camera;
    engine: WebGLGraphEngine | null;
    onCameraChange: (camera: Camera) => void;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MINIMAP_PADDING = 10;

export const WebGLMinimap = React.memo(({ camera, engine, onCameraChange }: WebGLMinimapProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !engine) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = MINIMAP_WIDTH * dpr;
        canvas.height = MINIMAP_HEIGHT * dpr;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

        const bounds = engine.getBounds();
        if (!bounds) return;

        const graphW = bounds.maxX - bounds.minX;
        const graphH = bounds.maxY - bounds.minY;
        if (graphW === 0 || graphH === 0) return;

        const scale = Math.min(
            (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / graphW,
            (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / graphH,
        );
        const offsetX = MINIMAP_PADDING + ((MINIMAP_WIDTH - MINIMAP_PADDING * 2) - graphW * scale) / 2;
        const offsetY = MINIMAP_PADDING + ((MINIMAP_HEIGHT - MINIMAP_PADDING * 2) - graphH * scale) / 2;

        const toMinimapX = (x: number) => (x - bounds.minX) * scale + offsetX;
        const toMinimapY = (y: number) => (y - bounds.minY) * scale + offsetY;

        // Draw nodes
        const nodeData = engine.getNodes();
        const nodeMetrics = engine.getAllNodeMetrics();
        
        if (nodeData) {
            for (const node of nodeData) {
                const metrics = nodeMetrics?.get(node.id);
                const w = metrics?.width ?? 250;
                const h = metrics?.height ?? 80;
                
                const mx = toMinimapX(node.position.x);
                const my = toMinimapY(node.position.y);
                const mw = w * scale;
                const mh = h * scale;

                ctx.fillStyle = oklchToHex(node.data.color.shades[300]);
                ctx.fillRect(mx, my, Math.max(mw, 2), Math.max(mh, 2));
            }
        }

        // Draw viewport rectangle
        const mainCanvas = engine.getCanvas();
        const rect = mainCanvas?.getBoundingClientRect();
        if (rect) {
            const vpX = toMinimapX(camera.x);
            const vpY = toMinimapY(camera.y);
            const vpW = (rect.width / camera.zoom) * scale;
            const vpH = (rect.height / camera.zoom) * scale;

            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.fillRect(vpX, vpY, vpW, vpH);
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(vpX, vpY, vpW, vpH);
        }
    }, [camera, engine]);

    useEffect(() => {
        draw();
    }, [draw]);

    const handleMinimapClick = useCallback(
        (e: React.MouseEvent) => {
            if (!engine) return;
            
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            const bounds = engine.getBounds();
            if (!bounds) return;

            const graphW = bounds.maxX - bounds.minX;
            const graphH = bounds.maxY - bounds.minY;
            const scale = Math.min(
                (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / graphW,
                (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / graphH,
            );
            const offsetX = MINIMAP_PADDING + ((MINIMAP_WIDTH - MINIMAP_PADDING * 2) - graphW * scale) / 2;
            const offsetY = MINIMAP_PADDING + ((MINIMAP_HEIGHT - MINIMAP_PADDING * 2) - graphH * scale) / 2;

            const worldX = (clickX - offsetX) / scale + bounds.minX;
            const worldY = (clickY - offsetY) / scale + bounds.minY;

            const mainCanvas = engine.getCanvas();
            const mainRect = mainCanvas?.getBoundingClientRect();
            if (!mainRect) return;

            onCameraChange({
                ...camera,
                x: worldX - mainRect.width / 2 / camera.zoom,
                y: worldY - mainRect.height / 2 / camera.zoom,
            });
        },
        [engine, camera, onCameraChange],
    );

    return (
        <canvas
            ref={canvasRef}
            className="absolute right-2 bottom-12 cursor-pointer rounded border border-slate-200 shadow-sm dark:border-slate-700"
            onClick={handleMinimapClick}
            style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        />
    );
});
