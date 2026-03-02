import { Handle, Position } from "reactflow";
import { useAppStore } from "../../state/useAppStore";
import React, { useMemo } from "react";
import type { Group } from '../../types/Group';
import type { getColorForGroupType } from '../../globals/Colors';

export type PreviewGraphNodeData = {
	id: number;
	title: string;
	groupTypeName: string;
	metadata: string;
	color: ReturnType<typeof getColorForGroupType>;
    group: Group;
}

export type PreviewGraphNodeProps = {
	data: PreviewGraphNodeData;
}

export const PreviewGraphNode = React.memo(({ data }: PreviewGraphNodeProps) => {
    const { showGroupTypes } = useAppStore();

	const backgroundColor = useMemo(() => data.color.shades[100], [data.color.shades]);
    const borderColor = useMemo(() => data.color.shades[300], [data.color.shades]);

	return (
		<div 
            className="flex min-w-[200px] flex-col overflow-hidden rounded-lg border-2 bg-white shadow-md"
            style={{ borderColor }}
        >
			<Handle type="target" position={Position.Left} className="size-3 bg-slate-400" />
			
            <div 
                className="border-b-2 px-4 py-2"
                style={{ backgroundColor, borderColor }}
            >
                <h3 className="m-0 text-lg font-bold leading-tight text-slate-900">
                    {data.title}
                </h3>
                {showGroupTypes && (
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
                        {data.groupTypeName}
                    </span>
                )}
            </div>

            <div className="whitespace-pre-wrap bg-white p-4 text-sm leading-relaxed text-slate-700">
                {data.metadata}
            </div>

			<Handle type="source" position={Position.Right} className="size-3 bg-slate-400" />
		</div>
	);
});