import type { ItemParams } from 'react-contexify';

import { Maximize, Minus, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Item, Menu, useContextMenu } from 'react-contexify';

import type { PreviewGraphNodeData } from '../../types/GraphNode';
import type { Node } from '../../types/GraphTypes';

import { Constants } from '../../globals/Constants';
import { Logger } from '../../globals/Logger';
import { useIsDarkMode } from '../../hooks/useChurchToolsTheme';
import { useGenerateReflowData } from '../../selectors/useGenerateReflowData';
import { useAppStore } from '../../state/useAppStore';
import { FloatingHeader } from '../FloatingHeader';
import { WebGLGraphEngine } from './engine/WebGLGraphEngine';
import { WebGLMinimap } from './WebGLMinimap';

interface ContextMenuProps {
	groupId: number;
}

export const WebGLGraphView = React.memo(() => {
	const data = useGenerateReflowData();
	const setGroupIdToStartWith = useAppStore((s) => s.setGroupIdToStartWith);
	const baseUrl = useAppStore((s) => s.baseUrl);
	const showGroupTypes = useAppStore((s) => s.committedFilters?.showGroupTypes ?? true);
	const focusNodeId = useAppStore((s) => s.focusNodeId);
	const setFocusNodeId = useAppStore((s) => s.setFocusNodeId);
	const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);
	const isDarkMode = useIsDarkMode();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<null | WebGLGraphEngine>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Pointer state
	const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
	const lastPinchDistance = useRef<null | number>(null);
	const lastPinchCenter = useRef<null | { x: number; y: number }>(null);
	const lastTapTime = useRef<number>(0);
	const isPanning = useRef(false);

	// Camera state for minimap reactivity
	const [cameraState, setCameraState] = useState({ x: 0, y: 0, zoom: 1 });
	const [engine, setEngine] = useState<null | WebGLGraphEngine>(null);

	const { show } = useContextMenu({
		id: Constants.contextMenuId,
	});

	// Initialize engine
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const eng = new WebGLGraphEngine(canvas);
		engineRef.current = eng;
		setEngine(eng);
		eng.resize();
		eng.start();

		const handleResize = () => {
			eng.resize();
		};
		window.addEventListener('resize', handleResize);

		return () => {
			eng.stop();
			engineRef.current = null;
			setEngine(null);
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	// Update data
	useEffect(() => {
		const engine = engineRef.current;
		if (!engine || data.nodes.length === 0) return;

		engine.setData(data.nodes as Node<PreviewGraphNodeData>[], data.edges, showGroupTypes, isDarkMode);

		// Fit view immediately after data is set
		engine.fitView(0.05);
		const cam = engine.getCamera();
		setCameraState(cam);
	}, [data.nodes, data.edges, showGroupTypes, isDarkMode]);

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
	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			const canvas = canvasRef.current;
			const engine = engineRef.current;
			if (!canvas || !engine) return;

			const now = Date.now();
			const timeSinceLastTap = now - lastTapTime.current;

			if (timeSinceLastTap < 300 && activePointers.current.size === 0) {
				// Double tap detected
				const rect = canvas.getBoundingClientRect();
				const tapX = e.clientX - rect.left;
				const tapY = e.clientY - rect.top;

				const cam = engine.getCamera();
				const zoomFactor = 1.5;
				const newZoom = Math.min(4, cam.zoom * zoomFactor);

				const worldBefore = engine.screenToWorld(tapX, tapY);
				engine.setCamera({
					x: worldBefore.x - tapX / newZoom,
					y: worldBefore.y - tapY / newZoom,
					zoom: newZoom,
				});
				updateCameraState();

				// Reset tap time to prevent triple-tap double-zooming
				lastTapTime.current = 0;
				return;
			}

			lastTapTime.current = now;

			activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
			canvas.setPointerCapture(e.pointerId);

			if (activePointers.current.size === 1) {
				isPanning.current = true;
			} else if (activePointers.current.size === 2) {
				isPanning.current = false; // Stop panning when starting pinch
				const pointers = Array.from(activePointers.current.values());
				lastPinchDistance.current = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
				const rect = canvas.getBoundingClientRect();
				const midX = (pointers[0].x + pointers[1].x) / 2 - rect.left;
				const midY = (pointers[0].y + pointers[1].y) / 2 - rect.top;
				lastPinchCenter.current = { x: midX, y: midY };
			}
		},
		[updateCameraState],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (activePointers.current.size === 0) return;

			const engine = engineRef.current;
			const canvas = canvasRef.current;
			if (!engine || !canvas) return;

			const prevPointer = activePointers.current.get(e.pointerId);
			if (!prevPointer) return;

			// Update current pointer
			activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

			if (activePointers.current.size === 1 && isPanning.current) {
				// Single-finger panning
				const dx = e.clientX - prevPointer.x;
				const dy = e.clientY - prevPointer.y;

				const cam = engine.getCamera();
				engine.setCamera({
					...cam,
					x: cam.x - dx / cam.zoom,
					y: cam.y - dy / cam.zoom,
				});
				updateCameraState();
			} else if (activePointers.current.size === 2) {
				// Two-finger pinch to zoom
				const pointers = Array.from(activePointers.current.values());
				const currentDistance = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);

				if (
					lastPinchDistance.current !== null &&
					lastPinchDistance.current !== 0 &&
					lastPinchCenter.current !== null
				) {
					const zoomFactor = currentDistance / lastPinchDistance.current;
					const cam = engine.getCamera();
					const newZoom = Math.min(4, Math.max(0.05, cam.zoom * zoomFactor));

					// Zoom toward midpoint of pointers and pan to track the midpoint
					const rect = canvas.getBoundingClientRect();
					const midX = (pointers[0].x + pointers[1].x) / 2 - rect.left;
					const midY = (pointers[0].y + pointers[1].y) / 2 - rect.top;

					// Find what part of the world was under the previous midpoint
					const worldBefore = engine.screenToWorld(lastPinchCenter.current.x, lastPinchCenter.current.y);

					// Update camera so that same world part is now under the new midpoint
					engine.setCamera({
						x: worldBefore.x - midX / newZoom,
						y: worldBefore.y - midY / newZoom,
						zoom: newZoom,
					});
					updateCameraState();

					// Update previous midpoint for next frame
					lastPinchCenter.current = { x: midX, y: midY };
				}
				lastPinchDistance.current = currentDistance;
			}
		},
		[updateCameraState],
	);

	const handlePointerUp = useCallback((e: React.PointerEvent) => {
		activePointers.current.delete(e.pointerId);
		const canvas = canvasRef.current;
		if (canvas) {
			canvas.releasePointerCapture(e.pointerId);
		}

		if (activePointers.current.size < 2) {
			lastPinchDistance.current = null;
			lastPinchCenter.current = null;
		}
		if (activePointers.current.size === 0) {
			isPanning.current = false;
		} else if (activePointers.current.size === 1) {
			isPanning.current = true;
			// Update the remaining pointer's reference point to avoid jumps
			const remainingPointerId = activePointers.current.keys().next().value;
			if (remainingPointerId !== undefined) {
				// The current pointer being moved will be updated in handlePointerMove
			}
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
			engine.setHighlightedEdge(null);
			const currentHighlighted = engine.getHighlightedNodeIds();
			if (currentHighlighted.has(hit.node.id) && currentHighlighted.size > 0) {
				engine.setHighlightedSubgraph(null);
			} else {
				engine.setHighlightedSubgraph(hit.node.id);
			}
			return;
		}

		const edgeHit = engine.edgeHitTest(x, y);
		if (edgeHit) {
			engine.setHighlightedSubgraph(null);
			const current = engine.getHighlightedEdgeId();
			engine.setHighlightedEdge(current === edgeHit.id ? null : edgeHit.id);
		} else {
			engine.setHighlightedEdge(null);
			engine.setHighlightedSubgraph(null);
		}
	}, []);

	const handleContextMenu = useCallback(
		(e: React.MouseEvent) => {
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
		},
		[show],
	);

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

	// Keyboard navigation: arrow keys to pan, +/- to zoom
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const engine = engineRef.current;
			if (!engine) return;

			const panStep = 50;
			const cam = engine.getCamera();

			switch (e.key) {
				case '+':
				case '=': {
					handleZoomIn();
					break;
				}
				case '-': {
					handleZoomOut();
					break;
				}
				case 'ArrowDown': {
					e.preventDefault();
					engine.setCamera({ ...cam, y: cam.y + panStep / cam.zoom });
					updateCameraState();
					break;
				}
				case 'ArrowLeft': {
					e.preventDefault();
					engine.setCamera({ ...cam, x: cam.x - panStep / cam.zoom });
					updateCameraState();
					break;
				}
				case 'ArrowRight': {
					e.preventDefault();
					engine.setCamera({ ...cam, x: cam.x + panStep / cam.zoom });
					updateCameraState();
					break;
				}
				case 'ArrowUp': {
					e.preventDefault();
					engine.setCamera({ ...cam, y: cam.y - panStep / cam.zoom });
					updateCameraState();
					break;
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [updateCameraState, handleZoomIn, handleZoomOut]);

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

	const didClickToggleCollapse = useCallback((params: ItemParams<ContextMenuProps>) => {
		const engine = engineRef.current;
		const groupId = params.props?.groupId;
		if (engine && groupId) {
			engine.toggleCollapsedNode(String(groupId));
		}
	}, []);

	return (
		<div className="relative size-full" ref={containerRef}>
			<div className={isSidebarOpen ? 'hidden lg:block' : 'block'}>
				<FloatingHeader nodes={data.nodes} />
			</div>
			<canvas
				className="size-full cursor-grab active:cursor-grabbing"
				onClick={handleClick}
				onContextMenu={handleContextMenu}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				ref={canvasRef}
				style={{ display: 'block' }}
			/>

			{/* Context Menu - reuse same IDs */}
			<Menu animation="scale" id={Constants.contextMenuId}>
				<Item onClick={didClickOpenGroup}>Gruppe aufrufen</Item>
				<Item onClick={didClickSetGroupAsStartGroup}>Gruppe als Startgruppe setzen</Item>
				<Item onClick={didClickToggleCollapse}>Untergruppen ein-/ausklappen</Item>
			</Menu>

			{/* Controls */}
			<div className="absolute bottom-6 left-2 flex flex-col gap-2">
				<button
					className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-lg backdrop-blur-md hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
					onClick={handleZoomIn}
					title="Zoom In"
				>
					<Plus className="size-5" />
				</button>
				<button
					className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-lg backdrop-blur-md hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
					onClick={handleZoomOut}
					title="Zoom Out"
				>
					<Minus className="size-5" />
				</button>
				<button
					className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-lg backdrop-blur-md hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
					onClick={handleFitView}
					title="Fit View"
				>
					<Maximize className="size-5" />
				</button>
			</div>

			{/* Minimap */}
			<WebGLMinimap
				camera={cameraState}
				engine={engine}
				isDarkMode={isDarkMode}
				onCameraChange={(cam) => {
					engineRef.current?.setCamera(cam);
					updateCameraState();
				}}
			/>
		</div>
	);
});
