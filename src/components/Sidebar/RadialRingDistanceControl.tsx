import React, { useCallback } from 'react';

import { useAppStore } from '../../state/useAppStore';
import { LayoutAlgorithm } from '../../types/LayoutAlgorithm';

export const RadialRingDistanceControl = React.memo(() => {
	const layoutAlgorithm = useAppStore((s) => s.layoutAlgorithm);
	const radialRingDistance = useAppStore((s) => s.radialRingDistance);
	const setRadialRingDistance = useAppStore((s) => s.setRadialRingDistance);

	const handleDistanceChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setRadialRingDistance(Number(e.target.value));
		},
		[setRadialRingDistance],
	);

	// Only show when a radial layout is active
	if (layoutAlgorithm !== LayoutAlgorithm.FLAT_RADIAL) {
		return null;
	}

	return (
		<div className="mt-4 flex flex-col">
			<label htmlFor="ring-distance" className="mb-2 text-sm font-semibold">
				Ring Distanz: {radialRingDistance}px
			</label>
			<input
				className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-blue-600 dark:bg-slate-600"
				id="ring-distance"
				max={500}
				min={300}
				onChange={handleDistanceChange}
				step={10}
				type="range"
				value={radialRingDistance}
			/>
			<div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Min: 300px — Max: 500px</div>
		</div>
	);
});
