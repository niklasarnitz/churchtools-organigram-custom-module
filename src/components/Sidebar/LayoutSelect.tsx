import React, { useCallback } from 'react';

import { useAppStore } from '../../state/useAppStore';
import { LayoutAlgorithm } from '../../types/LayoutAlgorithm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export const LayoutSelect = React.memo(() => {
    const layoutAlgorithm = useAppStore((s) => s.layoutAlgorithm);
    const setLayoutAlgorithm = useAppStore((s) => s.setLayoutAlgorithm);

    const handleSelectChange = useCallback((val: string) => {
        setLayoutAlgorithm(val as LayoutAlgorithm);
    }, [setLayoutAlgorithm]);

    return (
        <div className="mt-4 flex flex-col">
            <h5 className="mb-1 text-sm font-semibold">Layout Ausrichtung</h5>

            <Select onValueChange={handleSelectChange} value={layoutAlgorithm}>
                <SelectTrigger>
                    <SelectValue placeholder="Layout auswählen" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={LayoutAlgorithm.elkLayeredLR}>ELK: Layered (Horizontal)</SelectItem>
                    <SelectItem value={LayoutAlgorithm.elkLayeredTB}>ELK: Layered (Vertikal)</SelectItem>
                    <SelectItem value={LayoutAlgorithm.elkMrTree}>ELK: MR-Tree</SelectItem>
                    <SelectItem value={LayoutAlgorithm.elkRadial}>ELK: Radial</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
});
