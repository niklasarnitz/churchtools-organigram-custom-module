import { useMemo } from 'react';

import type { GraphData } from '../types/GraphData';
import type { GraphNode } from '../types/GraphNode';
import type { Group } from '../types/Group';
import type { Hierarchy } from '../types/Hierarchy';
import type { Relation } from '../types/Relation';

import { useHierarchies } from '../queries/useHierarchies';
import { useAppStore } from '../state/useAppStore';
import { useGroupMembersByGroupId } from './useGroupMembersByGroupId';
import { useGroupRolesByType } from './useGroupRolesByType';
import { useGroupsById } from './useGroupsById';
import { useHierarchiesByGroupId } from './useHierarchiesByGroupId';

export const useCreateRelatedData = (): GraphData => {
    const excludedGroupTypes = useAppStore((s) => s.excludedGroupTypes);
    const excludedGroups = useAppStore((s) => s.excludedGroups);
    const excludedRoles = useAppStore((s) => s.excludedRoles);
    const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
    
    const { data: hierarchies } = useHierarchies();
    const groupsById = useGroupsById();
    const hierarchiesByGroupId = useHierarchiesByGroupId();
    const groupRolesByType = useGroupRolesByType();
    const groupMembersByGroupId = useGroupMembersByGroupId();

    const shouldIncludeGroup = useMemo(() => (group: Group) => {
        return (
            group &&
            group.information &&
            group.information.groupTypeId &&
            !excludedGroups.includes(group.id) &&
            !excludedGroupTypes.includes(group.information.groupTypeId)
        );
    }, [excludedGroups, excludedGroupTypes]);

    const getGraphNodeFromGroup = useMemo(() => (group: Group): GraphNode => {
        const members = groupMembersByGroupId[group.id] ?? [];
        const rolesForType = groupRolesByType[group.information.groupTypeId] ?? [];

        const groupRoles = rolesForType.filter(
            (role) =>
                !excludedRoles.includes(role.id) &&
                members.findIndex((member) => member.groupTypeRoleId === role.id) !== -1,
        );

        return {
            group,
            groupRoles,
            members,
        };
    }, [groupMembersByGroupId, groupRolesByType, excludedRoles]);

    const getHierarchiesForGroup = useMemo(() => (groupId: number) => {
        const localHierarchies: Hierarchy[] = [];
        const localChildren: number[] = [];

        const hierarchy = hierarchiesByGroupId[groupId];

        if (hierarchy) {
            localHierarchies.push(hierarchy);
            localChildren.push(...hierarchy.children);
        }

        const visited = new Set<number>([groupId]);

        while (localChildren.length > 0) {
            const child = localChildren.pop();

            if (child && !visited.has(child)) {
                visited.add(child);
                const childHierarchy = hierarchiesByGroupId[child];

                if (childHierarchy) {
                    localHierarchies.push(childHierarchy);
                    localChildren.push(...childHierarchy.children);
                }
            }
        }

        return localHierarchies;
    }, [hierarchiesByGroupId]);

    return useMemo(() => {
        const currentHierarchies = groupIdToStartWith ? getHierarchiesForGroup(Number(groupIdToStartWith)) : (hierarchies ?? []);

        const relations: Relation[] = [];
        const nodes: GraphNode[] = [];
        const addedNodeIds = new Set<number>();

        const addNodeIfMissing = (group: Group) => {
            if (!addedNodeIds.has(group.id)) {
                nodes.push(getGraphNodeFromGroup(group));
                addedNodeIds.add(group.id);
                return true;
            }
            return false;
        };

        for (const hierarchy of currentHierarchies) {
            const group = groupsById[hierarchy.groupId];
            if (!group || !shouldIncludeGroup(group)) continue;

            addNodeIfMissing(group);

            for (const child of hierarchy.children) {
                const childGroup = groupsById[child];
                if (!childGroup || !shouldIncludeGroup(childGroup)) continue;

                addNodeIfMissing(childGroup);

                relations.push({
                    source: group,
                    target: childGroup,
                });
            }
        }

        return {
            nodes,
            relations,
        } as GraphData;
    }, [groupIdToStartWith, getHierarchiesForGroup, hierarchies, groupsById, shouldIncludeGroup, getGraphNodeFromGroup]);
};
