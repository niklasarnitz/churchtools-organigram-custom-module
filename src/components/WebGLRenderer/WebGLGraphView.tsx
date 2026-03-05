import type { ItemParams } from 'react-contexify';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Item, Menu, useContextMenu } from 'react-contexify';
import { Maximize, Minus, Plus } from 'lucide-react';

import { Constants } from '../../globals/Constants';
import { Logger } from '../../globals/Logger';
import { useGenerateReflowData } from '../../selectors/useGenerateReflowData';
import { useAppStore } from '../../state/useAppStore';
import { FloatingHeader } from '../FloatingHeader';
import { WebGLGraphEngine } from './engine/WebGLGraphEngine';
import { WebGLMinimap } from './WebGLMinimap';

interface ContextMenuProps {
    groupId: number;
}

export const WebGLGraphView = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const data = useGenerateReflowData();
    const setGroupIdToStartWith = useAppStore((s) => s.setGroupIdToStartWith);
    const baseUrl = useAppStore((s) => s.baseUrl);
    const showGroupTypes = useAppStore((s) => s.committedFilters?.showGroupTypes ?? true);
    const focusNodeId = useAppStore((s) => s.focusNodeId);
    const setFocusNodeId = useAppStore((s) => s.setFocusNodeId);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<WebGLGraphEngine | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Pan state
    const isPanning = useRef(false);
    const lastPointer = useRef({ x: 0, y: 0 });
    
    // Camera state for minimap reactivity
    const [cameraState, setCameraState] = useState({ x: 0, y: 0, zoom: 1 });

    const { show } = useContextMenu({
        id: Constants.contextMenuId,
    });

    // Initialize engine
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = new WebGLGraphEngine(canvas);
        engineRef.current = engine;
        engine.resize();
        engine.start();

        const handleResize = () => {
            engine.resize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            engine.stop();
            engineRef.current = null;
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Update data
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || data.nodes.length === 0) return;

        engine.setData(data.nodes as any, data.edges, showGroupTypes);
        
        // Fit view after a short delay to ensure metrics are computed
        setTimeout(() => {
            engine.fitView(0.05);
            const cam = engine.getCamera();
            setCameraState(cam);
        }, 50);
    }, [data.nodes, data.edges, showGroupTypes]);

    // Focus on a specific node when requested
    useEffect(() => {
        const engine = engineRef.current;
        const canvas = canvasRef.current;
        if (!engine || !canvas || !focusNodeId) return;

        const rect = canvas.getBoundingClientRect();
        engine.focusNode(focusNodeId, rect);
        setCameraState(engine.getCamera());
        setFocusNodeId(undefined);
    }, [focusNodeId, setFocusNodeId]);

    // Update camera state periodically for minimap
    const updateCameraState = useCallback(() => {
        const engine = engineRef.current;
        if (engine) {
            setCameraState(engine.getCamera());
        }
    }, []);

    // Pointer handlers
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button === 0) {
            isPanning.current = true;
            lastPointer.current = { x: e.clientX, y: e.clientY };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isPanning.current) return;
        const engine = engineRef.current;
        if (!engine) return;

        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        lastPointer.current = { x: e.clientX, y: e.clientY };

        const cam = engine.getCamera();
        engine.setCamera({
            ...cam,
            x: cam.x - dx / cam.zoom,
            y: cam.y - dy / cam.zoom,
        });
        updateCameraState();
    }, [updateCameraState]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (isPanning.current) {
            isPanning.current = false;
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        }
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        const engine = engineRef.current;
        const canvas = canvasRef.current;
        if (!engine || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hit = engine.hitTest(x, y);
        if (hit) {
            Logger.log(`onNodeClick::${hit.node.id}`);
            setGroupIdToStartWith(hit.node.id);
        }
    }, [setGroupIdToStartWith]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const engine = engineRef.current;
        const canvas = canvasRef.current;
        if (!engine || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hit = engine.hitTest(x, y);
        if (hit) {
            show({
                event: e.nativeEvent,
                props: { groupId: Number(hit.node.id) },
            });
        }
    }, [show]);

    // Native wheel handler (must be non-passive to preventDefault)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const engine = engineRef.current;
            if (!engine) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const cam = engine.getCamera();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(4, Math.max(0.05, cam.zoom * zoomFactor));

            // Zoom toward cursor
            const worldBefore = engine.screenToWorld(mouseX, mouseY);
            engine.setCamera({
                x: worldBefore.x - mouseX / newZoom,
                y: worldBefore.y - mouseY / newZoom,
                zoom: newZoom,
            });
            setCameraState(engine.getCamera());
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const handleFitView = useCallback(() => {
        const engine = engineRef.current;
        if (engine) {
            engine.fitView(0.05);
            updateCameraState();
        }
    }, [updateCameraState]);

    const handleZoomIn = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const cam = engine.getCamera();
        const newZoom = Math.min(4, cam.zoom * 1.3);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        // Zoom toward center
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const worldBefore = engine.screenToWorld(cx, cy);
        engine.setCamera({
            x: worldBefore.x - cx / newZoom,
            y: worldBefore.y - cy / newZoom,
            zoom: newZoom,
        });
        updateCameraState();
    }, [updateCameraState]);

    const handleZoomOut = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const cam = engine.getCamera();
        const newZoom = Math.max(0.05, cam.zoom * 0.7);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const worldBefore = engine.screenToWorld(cx, cy);
        engine.setCamera({
            x: worldBefore.x - cx / newZoom,
            y: worldBefore.y - cy / newZoom,
            zoom: newZoom,
        });
        updateCameraState();
    }, [updateCameraState]);

    // Context menu handlers
    const didClickOpenGroup = useCallback(
        (params: ItemParams<ContextMenuProps>) => {
            const groupId = params.props?.groupId;
            if (groupId && baseUrl) {
                window.open(`${baseUrl}/groups/${String(groupId)}`, '_blank')?.focus();
            }
        },
        [baseUrl],
    );

    const didClickSetGroupAsStartGroup = useCallback(
        (params: ItemParams<ContextMenuProps>) => {
            const groupId = params.props?.groupId;
            if (groupId) {
                setGroupIdToStartWith(String(groupId));
            }
        },
        [setGroupIdToStartWith],
    );

    return (
        <div ref={containerRef} className="relative size-full">
            <FloatingHeader nodes={data.nodes} />
            <canvas
                ref={canvasRef}
                className="size-full cursor-grab active:cursor-grabbing"
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ display: 'block' }}
            />

            {/* Context Menu - reuse same IDs */}
            <Menu animation="scale" id={Constants.contextMenuId}>
                <Item onClick={didClickOpenGroup}>Gruppe aufrufen</Item>
                <Item onClick={didClickSetGroupAsStartGroup}>Gruppe als Startgruppe setzen</Item>
            </Menu>

            {/* Controls */}
            <div className="absolute right-2 bottom-2 flex flex-col gap-1">
                <button
                    className="flex size-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    onClick={handleZoomIn}
                    title="Zoom In"
                >
                    <Plus className="size-4" />
                </button>
                <button
                    className="flex size-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                >
                    <Minus className="size-4" />
                </button>
                <button
                    className="flex size-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    onClick={handleFitView}
                    title="Fit View"
                >
                    <Maximize className="size-4" />
                </button>
            </div>

            {/* Minimap */}
            <WebGLMinimap
                camera={cameraState}
                engine={engineRef.current}
                onCameraChange={(cam) => {
                    engineRef.current?.setCamera(cam);
                    updateCameraState();
                }}
            />

        </div>
    );
});
