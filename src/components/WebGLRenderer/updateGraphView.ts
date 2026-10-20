import type { PreviewGraphNodeData } from '../../types/GraphNode';
import type { Edge, Node } from '../../types/GraphTypes';
import type { SunburstRenderData } from '../../types/Sunburst';
import type { Camera } from './engine/types';
import type { WebGLGraphEngine } from './engine/WebGLGraphEngine';

interface ViewUpdate {
	data: { edges: Edge[]; isCalculating: boolean; nodes: Node[]; sunburstRenderData?: SunburstRenderData };
	engine: Pick<WebGLGraphEngine, 'fitView' | 'getCamera' | 'setCamera' | 'setData'>;
	isDarkMode: boolean;
	previousRingWidth: number | undefined;
	savedCamera: Camera | undefined;
	setCamera: (camera: Camera) => void;
	showGroupTypes: boolean;
}

/** Only completed layouts may consume a pending camera reset or overwrite the saved view. */
export function updateGraphView({
	data,
	engine,
	isDarkMode,
	previousRingWidth,
	savedCamera,
	setCamera,
	showGroupTypes,
}: ViewUpdate): number | undefined {
	if (data.isCalculating || data.nodes.length === 0) return previousRingWidth;
	engine.setData(
		data.nodes as Node<PreviewGraphNodeData>[],
		data.edges,
		showGroupTypes,
		isDarkMode,
		data.sunburstRenderData,
	);
	const ringWidth = data.sunburstRenderData?.ringWidth;
	const changedRingWidth =
		ringWidth !== undefined && previousRingWidth !== undefined && previousRingWidth !== ringWidth;
	if (savedCamera) engine.setCamera(savedCamera);
	else if (!changedRingWidth) engine.fitView(0.05);
	setCamera(engine.getCamera());
	return ringWidth;
}
