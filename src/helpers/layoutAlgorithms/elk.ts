import type { ELK, ElkNode } from 'elkjs/lib/elk.bundled';

import { LayoutAlgorithm } from '../../types/LayoutAlgorithm';
import type { Edge, Node } from '../../types/GraphTypes';
import { Position } from '../../types/GraphTypes';

import ElkApi from 'elkjs/lib/elk-api';
import ElkWorkerUrl from 'elkjs/lib/elk-worker.min.js?url';

let elkInstance: ELK | null = null;

function getElk(): ELK {
	if (!elkInstance) {
		elkInstance = new ElkApi({
			workerUrl: ElkWorkerUrl as string,
		}) as unknown as ELK;
	}
	return elkInstance;
}

export const layoutElk = async (
	nodes: Node[],
	edges: Edge[],
	algorithm: LayoutAlgorithm,
	nodeSizes: Map<string, { width: number; height: number }>,
): Promise<{ edges: Edge[]; nodes: Node[] }> => {
	const elk = getElk();

	const elkAlgorithmMap: Record<LayoutAlgorithm, string> = {
		[LayoutAlgorithm.elkLayeredTB]: 'layered',
		[LayoutAlgorithm.elkLayeredLR]: 'layered',
		[LayoutAlgorithm.elkMrTree]: 'mrtree',
		[LayoutAlgorithm.elkRadial]: 'radial',
	};

	const isVertical =
		algorithm === LayoutAlgorithm.elkLayeredTB ||
		algorithm === LayoutAlgorithm.elkMrTree ||
		algorithm === LayoutAlgorithm.elkRadial;

	const isLayered =
		algorithm === LayoutAlgorithm.elkLayeredTB ||
		algorithm === LayoutAlgorithm.elkLayeredLR;

	const layoutOptions: Record<string, string> = {
		'elk.algorithm': elkAlgorithmMap[algorithm],
		'elk.direction': isVertical ? 'DOWN' : 'RIGHT',
		'elk.edgeRouting': 'ORTHOGONAL',
		'elk.padding': '[top=50,left=50,bottom=50,right=50]',
		'elk.spacing.componentsCmpHierarchy': '80',
		'elk.spacing.nodeNode': '60',
		'elk.spacing.nodeNodeBetweenLayers': '80',
		'elk.spacing.edgeEdge': '20',
		'elk.spacing.edgeNode': '30',
	};

	if (isLayered) {
		layoutOptions['elk.layered.nodePlacement.strategy'] = 'NETWORK_SIMPLEX';
		layoutOptions['elk.layered.crossingMinimization.strategy'] = 'LAYER_SWEEP';
		layoutOptions['elk.layered.crossingMinimization.greedySwitch.type'] = 'TWO_SIDED';
		layoutOptions['elk.layered.thoroughness'] = '50';
		layoutOptions['elk.alignment'] = 'CENTER';
		layoutOptions['elk.layered.considerModelOrder.strategy'] = 'NODES_AND_EDGES';
	}

	const graph: ElkNode = {
		children: nodes.map((node) => {
			const size = nodeSizes.get(node.id);
			return {
				height: size?.height ?? 80,
				id: node.id,
				width: size?.width ?? 250,
			};
		}),
		edges: edges.map((edge) => ({
			id: edge.id,
			sources: [edge.source],
			targets: [edge.target],
		})),
		id: 'root',
		layoutOptions,
	};

	const layoutedGraph = await elk.layout(graph);

	const elkNodeMap = new Map(layoutedGraph.children?.map((n) => [n.id, n]));

	const layoutedNodes = nodes.map((node) => {
		const elkNode = elkNodeMap.get(node.id);
		return {
			...node,
			height: elkNode?.height,
			position: { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0 },
			sourcePosition: isVertical ? Position.Bottom : Position.Right,
			targetPosition: isVertical ? Position.Top : Position.Left,
			width: elkNode?.width,
		};
	});

	return { edges, nodes: layoutedNodes };
};
