export type SunburstTextMode = 'radial' | 'tangential';

export interface TextOrientation {
	dominantBaseline?: string;
	flipped: boolean;
	rotationDeg: number;
	textAnchor: 'end' | 'middle' | 'start';
}

const FLIP_TOLERANCE_DEG = 3;

/** Calculates readable text orientation in screen coordinates (0° right, 90° down). */
export function calculateTextOrientation(midAngleDeg: number, mode: SunburstTextMode): TextOrientation {
	const baseRotation = normalizeDegrees(midAngleDeg + (mode === 'tangential' ? 90 : 0));
	const flipped = baseRotation > 90 + FLIP_TOLERANCE_DEG && baseRotation < 270 - FLIP_TOLERANCE_DEG;

	return {
		flipped,
		rotationDeg: normalizeDegrees(baseRotation + (flipped ? 180 : 0)),
		textAnchor: 'middle',
	};
}

export function normalizeDegrees(angleDeg: number): number {
	return ((angleDeg % 360) + 360) % 360;
}
