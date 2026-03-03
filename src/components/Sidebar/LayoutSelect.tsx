import React, { useCallback } from 'react';

import { useAppStore } from '../../state/useAppStore';
import { LayoutAlgorithm } from '../../types/LayoutAlgorithm';
import { Combobox } from '../ui/combobox';

export const LayoutSelect = React.memo(() => {
	const layoutAlgorithm = useAppStore((s) => s.layoutAlgorithm);
	const setLayoutAlgorithm = useAppStore((s) => s.setLayoutAlgorithm);

	const handleSelectChange = useCallback(
		(val: string) => {
			if (val) setLayoutAlgorithm(val as LayoutAlgorithm);
		},
		[setLayoutAlgorithm],
	);

	const options = [
		{ label: 'ELK: Layered (Horizontal)', value: LayoutAlgorithm.elkLayeredLR },
		{ label: 'ELK: Layered (Vertikal)', value: LayoutAlgorithm.elkLayeredTB },
		{ label: 'ELK: MR-Tree', value: LayoutAlgorithm.elkMrTree },
		{ label: 'ELK: Radial', value: LayoutAlgorithm.elkRadial },
	];

	return (
		<div className="mt-4 flex flex-col">
			<h5 className="mb-1 text-sm font-semibold">Layout Ausrichtung</h5>

			<Combobox
				onValueChange={handleSelectChange}
				options={options}
				placeholder="Layout auswählen"
				value={layoutAlgorithm}
			/>
		</div>
	);
});
