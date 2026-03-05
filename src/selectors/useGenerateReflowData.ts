import { useEffect, useMemo, useRef, useState } from 'react';

import { getColorForGroupType } from '../globals/Colors';
import { getGroupMetadataString, getGroupTitle } from '../helpers/GraphHelper';
import { layoutElk } from '../helpers/layoutAlgorithms/elk';
import { useAppStore } from '../state/useAppStore';
import { LayoutAlgorithm } from '../types/LayoutAlgorithm';
import type { PreviewGraphNodeData } from '../types/GraphNode';
import { type Edge, type Node, Position } from '../types/GraphTypes';
import { measureNodeCard } from '../components/WebGLRenderer/engine/drawNodeCard2D';
import { useCreateRelatedData } from './useCreateRelatedData';
import { useGroupTypesById } from './useGroupTypesById';
import { usePersonsById } from './usePersonsById';

export const useGenerateReflowData = () => {
	const { nodes, relations } = useCreateRelatedData();
	const committedFilters = useAppStore((s) => s.committedFilters);
	const showGroupTypes = committedFilters?.showGroupTypes ?? true;
	const layoutAlgorithm = committedFilters?.layoutAlgorithm ?? LayoutAlgorithm.elkLayeredTB;
	const personsById = usePersonsById();
	const groupTypesById = useGroupTypesById();

	const [layoutedData, setLayoutedData] = useState<{ edges: Edge[]; nodes: Node[] }>({
		edges: [],
		nodes: [],
	});

	const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
	if (!measureCanvasRef.current) {
		const c = document.createElement('canvas');
		c.width = 1;
		c.height = 1;
		measureCanvasRef.current = c;
	}

	const isVertical =
		layoutAlgorithm === LayoutAlgorithm.elkLayeredTB ||
		layoutAlgorithm === LayoutAlgorithm.elkMrTree ||
		layoutAlgorithm === LayoutAlgorithm.elkRadial;

	const { reflowEdges, reflowNodes } = useMemo(() => {
		const edges = relations.map((relation) => {
			return {
				animated: true,
				className: 'black-100',
				id: `${String(relation.source.id)}-${String(relation.target.id)}`,
				markerEnd: {
					color: '#64748b',
					height: 20,
					type: 'arrow',
					width: 20,
				},
				source: relation.source.id.toString(),
				style: { stroke: '#64748b', strokeWidth: 2 },
				target: relation.target.id.toString(),
				type: 'smoothstep',
			} as Edge;
		});

		const nodesList = nodes.map((node) => {
			const memberNamesByRoleId = new Map<number, string[]>();
			for (const member of node.members) {
				const person = personsById[member.personId];
				const name = person ? `${person.firstName} ${person.lastName}` : 'Unknown Person';
				let list = memberNamesByRoleId.get(member.groupTypeRoleId);
				if (!list) {
					list = [];
					memberNamesByRoleId.set(member.groupTypeRoleId, list);
				}
				list.push(name);
			}

			return {
				data: {
					color: getColorForGroupType(node.group.information.groupTypeId),
					group: node.group,
					groupTypeName: groupTypesById[node.group.information.groupTypeId]?.name ?? 'Unknown',
					id: node.group.id,
					members: node.members,
					memberNamesByRoleId,
					metadata: getGroupMetadataString(node.groupRoles, node.members, personsById),
					roles: node.groupRoles,
					title: getGroupTitle(node.group, showGroupTypes, groupTypesById, true),
				},
				id: node.group.id.toString(),
				position: {
					x: 0,
					y: 0,
				},
				sourcePosition: isVertical ? Position.Bottom : Position.Right,
				targetPosition: isVertical ? Position.Top : Position.Left,
				type: 'previewGraphNode',
			} as Node;
		});

		return { reflowEdges: edges, reflowNodes: nodesList };
	}, [relations, nodes, groupTypesById, personsById, showGroupTypes, isVertical]);

	useEffect(() => {
		let active = true;

		const performLayout = async () => {
			const measureCtx = measureCanvasRef.current!.getContext('2d')!;
			const nodeSizes = new Map<string, { width: number; height: number }>();
			for (const node of reflowNodes) {
				const metrics = measureNodeCard(measureCtx, node.data as PreviewGraphNodeData, showGroupTypes);
				nodeSizes.set(node.id, { width: metrics.width, height: metrics.height });
			}

			const result = await layoutElk(reflowNodes, reflowEdges, layoutAlgorithm, nodeSizes);

			if (active) {
				setLayoutedData(result);
			}
		};

		void performLayout();

		return () => {
			active = false;
		};
	}, [reflowNodes, reflowEdges, layoutAlgorithm, showGroupTypes]);

	return layoutedData;
};
