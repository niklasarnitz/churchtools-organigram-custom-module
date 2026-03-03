import { useMemo } from 'react';

import type { GraphData } from '../types/GraphData';
import type { GraphNode } from '../types/GraphNode';
import type { Group } from '../types/Group';
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
    const maxDepth = useAppStore((s) => s.maxDepth);
    const showOnlyDirectChildren = useAppStore((s) => s.showOnlyDirectChildren);
    const hideIndirectSubgroups = useAppStore((s) => s.hideIndirectSubgroups);
    
    const { data: hierarchies } = useHierarchies();
    const groupsById = useGroupsById();
    const hierarchiesByGroupId = useHierarchiesByGroupId();
    const groupRolesByType = useGroupRolesByType();
    const groupMembersByGroupId = useGroupMembersByGroupId();

    const shouldIncludeGroup = useMemo(() => (group: Group) => {
        // Always include the start group, even if its type is excluded
        if (groupIdToStartWith && group.id === Number(groupIdToStartWith)) {
            return true;
        }

        return (
            !!group.information.groupTypeId &&
            !excludedGroups.includes(group.id) &&
            !excludedGroupTypes.includes(group.information.groupTypeId)
        );
    }, [excludedGroups, excludedGroupTypes, groupIdToStartWith]);

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

    const getHierarchicalData = useMemo(() => () => {
        const startGroupId = groupIdToStartWith ? Number(groupIdToStartWith) : undefined;
        const rootNodes = startGroupId ? [startGroupId] : (hierarchies ?? []).map(h => h.groupId);
        
        const nodes: GraphNode[] = [];
        const relations: Relation[] = [];
        const addedNodeIds = new Set<number>();
        const addedRelationIds = new Set<string>();

        const queue: { depth: number; groupId: number }[] = rootNodes.map(id => ({ depth: 0, groupId: id }));
        const visited = new Set<number>();

        while (queue.length > 0) {
            const currentItem = queue.shift();
            if (!currentItem) continue;

            const { depth, groupId } = currentItem;
            
            if (visited.has(groupId)) continue;
            visited.add(groupId);

            const group = groupsById[groupId];
            if (!shouldIncludeGroup(group)) continue;

            // Add node
            if (!addedNodeIds.has(groupId)) {
                nodes.push(getGraphNodeFromGroup(group));
                addedNodeIds.add(groupId);
            }

            // Check depth limit - if we reached maxDepth, we don't process children anymore
            if (maxDepth !== undefined && depth >= maxDepth) continue;

            const hierarchy = hierarchiesByGroupId[groupId];
            if (!hierarchy) continue;

            for (const childId of hierarchy.children) {
                const childGroup = groupsById[childId];
                if (!shouldIncludeGroup(childGroup)) continue;

                // Implement showOnlyDirectChildren: if enabled, only allow children of the root nodes (depth 0)
                if (showOnlyDirectChildren && depth > 0) continue;

                // Implement hideIndirectSubgroups: if current group and child have different types, and it's not a root node
                if (hideIndirectSubgroups && group.information.groupTypeId !== childGroup.information.groupTypeId && depth > 0) continue;

                // Add node if not already added
                if (!addedNodeIds.has(childId)) {
                    nodes.push(getGraphNodeFromGroup(childGroup));
                    addedNodeIds.add(childId);
                }

                // Add relation
                const relationId = `${String(groupId)}-${String(childId)}`;
                if (!addedRelationIds.has(relationId)) {
                    relations.push({
                        source: group,
                        target: childGroup,
                    });
                    addedRelationIds.add(relationId);
                }

                queue.push({ depth: depth + 1, groupId: childId });
            }
        }

        return { nodes, relations };
    }, [
        groupIdToStartWith, 
        hierarchies, 
        hierarchiesByGroupId, 
        groupsById, 
        shouldIncludeGroup, 
        getGraphNodeFromGroup, 
        maxDepth, 
        showOnlyDirectChildren, 
        hideIndirectSubgroups
    ]);

    return useMemo(() => {
        const { nodes, relations } = getHierarchicalData();
        return {
            nodes,
            relations,
        } as GraphData;
    }, [getHierarchicalData]);
};
