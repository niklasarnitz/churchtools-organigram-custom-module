import type { Edge, Node } from 'reactflow';

import { useEffect, useMemo, useState } from 'react';
import { MarkerType, Position } from 'reactflow';

import { getColorForGroupType } from '../globals/Colors';
import { getGroupMetadataString, getGroupTitle } from '../helpers/GraphHelper';
import { layoutElk } from '../helpers/layoutAlgorithms/elk';
import { useAppStore } from '../state/useAppStore';
import { LayoutAlgorithm } from '../types/LayoutAlgorithm';
import { useCreateRelatedData } from './useCreateRelatedData';
import { useGroupTypesById } from './useGroupTypesById';
import { usePersonsById } from './usePersonsById';

export const useGenerateReflowData = () => {
    const { nodes, relations } = useCreateRelatedData();
    const showGroupTypes = useAppStore((s) => s.showGroupTypes);
    const layoutAlgorithm = useAppStore((s) => s.layoutAlgorithm);
    const personsById = usePersonsById();
    const groupTypesById = useGroupTypesById();

    const [layoutedData, setLayoutedData] = useState<{ edges: Edge[]; nodes: Node[]; }>({
        edges: [],
        nodes: [],
    });

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
                    type: MarkerType.Arrow,
                    width: 20,
                },
                source: relation.source.id.toString(),
                style: { stroke: '#64748b', strokeWidth: 2 },
                target: relation.target.id.toString(),
                type: 'smoothstep',
            } as Edge;
        });

        const nodesList = nodes.map((node) => {
            return {
                data: {
                    color: getColorForGroupType(node.group.information.groupTypeId),
                    group: node.group,
                    groupTypeName: groupTypesById[node.group.information.groupTypeId].name,
                    id: node.group.id,
                    members: node.members,
                    metadata: getGroupMetadataString(node.groupRoles, node.members, personsById),
                    personsById,
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
            };
        });

        return { reflowEdges: edges, reflowNodes: nodesList };
    }, [relations, nodes, groupTypesById, personsById, showGroupTypes, isVertical]);

    useEffect(() => {
        let active = true;

        const performLayout = async () => {
            const result = await layoutElk(reflowNodes, reflowEdges, layoutAlgorithm);

            if (active) {
                setLayoutedData(result);
            }
        };

        void performLayout();

        return () => {
            active = false;
        };
    }, [reflowNodes, reflowEdges, layoutAlgorithm]);

    return layoutedData;
};
