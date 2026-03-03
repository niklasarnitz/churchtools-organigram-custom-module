import type { Edge, Node } from 'reactflow';

import ELK, { type ElkNode } from 'elkjs';

import type { PreviewGraphNodeData } from '../../components/PreviewGraph/PreviewGraphNode';

import { LayoutAlgorithm } from '../../types/LayoutAlgorithm';
import { getGroupNodeWidth, getReflowGroupNodeHeight } from '../GraphHelper';

const elk = new ELK();

export const layoutElk = async (
	nodes: Node[],
	edges: Edge[],
	algorithm: LayoutAlgorithm = LayoutAlgorithm.elkLayeredTB,
    showGroupTypes = false,
): Promise<{ edges: Edge[]; nodes: Node[]; }> => {
    let elkAlgorithm = 'layered';
    let direction = 'DOWN';

    if (algorithm === LayoutAlgorithm.elkLayeredLR) {
        direction = 'RIGHT';
    } else if (algorithm === LayoutAlgorithm.elkMrTree) {
        elkAlgorithm = 'mrtree';
    } else if (algorithm === LayoutAlgorithm.elkRadial) {
        elkAlgorithm = 'radial';
    }

	const elkGraph: ElkNode = {
		children: nodes.map((node) => {
            const data = node.data as PreviewGraphNodeData;
            const width = Math.max(getGroupNodeWidth(data.title, data.metadata), 250);
            
            const hasMembers = data.roles.some((role) => 
                data.members.some((member) => member.groupTypeRoleId === role.id)
            );
            const height = Math.max(getReflowGroupNodeHeight(data.metadata, data.title, hasMembers, showGroupTypes), hasMembers ? 150 : 80);

            return {
                height,
                id: node.id,
                width,
            };
        }),
		edges: edges.map((edge) => ({
			id: edge.id,
			sources: [edge.source],
			targets: [edge.target],
		})),
		id: 'root',
		layoutOptions: {
			'elk.algorithm': elkAlgorithm,
			'elk.direction': direction,
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.spacing.nodeNodeBetweenLayers': '150',
            'elk.padding': '[top=50,left=50,bottom=50,right=50]',
            'elk.spacing.nodeNode': '100',
		},
	};

	const layoutedGraph = await elk.layout(elkGraph);

	const layoutedNodes = nodes.map((node) => {
        const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
        
        return {
            ...node,
            position: {
                x: elkNode?.x ?? 0,
                y: elkNode?.y ?? 0,
            },
        };
    });

	return { edges, nodes: layoutedNodes };
};
