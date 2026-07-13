export type SunburstTextMode = 'radial' | 'tangential';

export type TangentialLineDirection = 'inside-out' | 'outside-in';

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

export function getTangentialLineDirection(midAngleDeg: number): TangentialLineDirection {
	const angle = normalizeDegrees(midAngleDeg);
	const isLowerHalf = angle > 0 && angle < 180;
	const isBottomBoundary = Math.abs(angle - 90) <= FLIP_TOLERANCE_DEG;
	return isLowerHalf && !isBottomBoundary ? 'inside-out' : 'outside-in';
}

export function getTangentialLineOffset(
	lineIndex: number,
	lineCount: number,
	lineHeight: number,
	direction: TangentialLineDirection,
): number {
	const centeredIndex = (lineCount - 1) / 2;
	return (direction === 'inside-out' ? lineIndex - centeredIndex : centeredIndex - lineIndex) * lineHeight;
}

export function normalizeDegrees(angleDeg: number): number {
	return ((angleDeg % 360) + 360) % 360;
}

export function toScreenAngle(angleRad: number): number {
	return angleRad - Math.PI / 2;
}

export function toScreenAngleDegrees(angleRad: number): number {
	return (toScreenAngle(angleRad) * 180) / Math.PI;
}
