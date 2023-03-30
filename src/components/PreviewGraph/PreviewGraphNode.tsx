import { Handle, Position } from "reactflow";
import { useAppStore } from "../../state/useAppStore";
import React, { useCallback } from "react";

export type PreviewGraphNodeData = {
	label: string;
}

export type PreviewGraphNodeProps = {
	data: PreviewGraphNodeData;
}

export const PreviewGraphNode = React.memo(({ data }: PreviewGraphNodeProps) => {
	// Callbacks
	const renderText = useCallback(() => {
		return data.label.split('\n').map((line, index) => {
			if (index === 0) {
				return <p key={`${line}-${index}`} className="text-base font-bold">{line}</p>
			}

			if (index === 1 && useAppStore.getState().showGroupTypes) {
				return <p key={`${line}-${index}`} className="text-base italic">{line}</p>
			}

			return <p key={`${line}-${index}`} className="text-base">{line}</p>
		})
	}, [data.label])

	return <>
		<Handle type="target" position={Position.Left} />
		<div className="flex-col items-center justify-center rounded bg-gray-50 p-4">
			{renderText()}
		</div>
		<Handle type="source" position={Position.Right} />
	</>
})