import { Handle, Position } from "reactflow";
import { Logger } from "../../globals/Logger";
import { useAppStore } from "../../state/useAppStore";
import React, { useCallback, useMemo } from "react";
import type { getColorForGroupType } from '../../globals/Colors';

export type PreviewGraphNodeData = {
	label: string;
}

export type PreviewGraphNodeDataJsonType = {
	id: number;
	title: string;
	groupTypeName: string;
	metadata: string;
	color: ReturnType<typeof getColorForGroupType>;
}

export type PreviewGraphNodeProps = {
	data: PreviewGraphNodeData;
}

export const PreviewGraphNode = React.memo(({ data }: PreviewGraphNodeProps) => {
	const labelData = useMemo(() => JSON.parse(data.label) as PreviewGraphNodeDataJsonType, [data.label])
	const tailwindColor = useMemo(() => `${labelData.color.shades[100]}`, [labelData.color.shades])

	// Callbacks
	const renderText = useCallback(() => {
		const returnValue = [<p key={`${labelData.id}-title`} className="text-base font-bold">{labelData.title}</p>]

		if (useAppStore.getState().showGroupTypes) {
			returnValue.push(<p key={`${labelData.id}-grouptype`} className="text-base italic">{labelData.groupTypeName}</p>)
		}


		returnValue.push(...labelData.metadata.split('\n').map((line, index) => {
			return <p key={`${line}-${index}`} className="text-base">{line}</p>
		}))
		return returnValue
	}, [labelData])

	return <>
		<Handle type="target" position={Position.Left} />
		<div className={`flex-col items-center justify-center rounded p-4`} style={{
			backgroundColor: tailwindColor,
		}}>
			{renderText()}
		</div>
		<Handle type="source" position={Position.Right} />
	</>
})