import type { Camera, WorldPoint } from './types';

export function screenToWorld(camera: Camera, screenX: number, screenY: number): WorldPoint {
	return {
		x: screenX / camera.zoom + camera.x,
		y: screenY / camera.zoom + camera.y,
	};
}

export function worldToScreen(camera: Camera, worldX: number, worldY: number): WorldPoint {
	return {
		x: (worldX - camera.x) * camera.zoom,
		y: (worldY - camera.y) * camera.zoom,
	};
}
