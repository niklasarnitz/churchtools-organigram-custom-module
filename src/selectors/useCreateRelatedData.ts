import { useMemo } from 'react';
import { useAppStore } from '../state/useAppStore';
import { useGroupsById } from './useGroupsById';
import { useHierarchiesByGroupId } from './useHierarchiesByGroupId';
import { useGroupRolesByType } from './useGroupRolesByType';
import { useGroupMembersByGroupId } from './useGroupMembersByGroupId';
import { useHierarchies } from '../queries/useHierarchies';
import type { GraphData } from '../types/GraphData';
import type { GraphNode } from '../types/GraphNode';
import type { Group } from '../types/Group';
import type { Hierarchy } from '../types/Hierarchy';
import type { Relation } from '../types/Relation';

export const useCreateRelatedData = (): GraphData => {
    const { excludedGroupTypes, excludedGroups, excludedRoles, groupIdToStartWith } = useAppStore();
    
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

    const includesGroup = (nodes: GraphNode[], group: Group) => {
        return (
            nodes.findIndex((n) => {
                if (n.group && n.group.id && group && group.id) return n.group.id === group.id;
                return false;
            }) !== -1
        );
    };

    const getHierarchiesForGroup = useMemo(() => (groupId: number) => {
        const localHierarchies: Hierarchy[] = [];
        const localChildren: number[] = [];

        const hierarchy = hierarchiesByGroupId[groupId];

        if (hierarchy) {
            localHierarchies.push(hierarchy);
            localChildren.push(...hierarchy.children);
        }

        while (localChildren.length > 0) {
            const child = localChildren.pop();

            if (child) {
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

        for (const hierarchy of currentHierarchies) {
            const group = groupsById[hierarchy.groupId];
            if (!group) continue;

            if (shouldIncludeGroup(group)) {
                if (!includesGroup(nodes, group)) {
                    nodes.push(getGraphNodeFromGroup(group));
                }

                for (const child of hierarchy.children) {
                    const childGroup = groupsById[child];
                    if (!childGroup) continue;

                    if (shouldIncludeGroup(childGroup) && !includesGroup(nodes, childGroup)) {
                        nodes.push(getGraphNodeFromGroup(childGroup));
                    }

                    if (includesGroup(nodes, group) && includesGroup(nodes, childGroup)) {
                        relations.push({
                            source: group,
                            target: childGroup,
                        });
                    }
                }
            }
        }

        return {
            relations,
            nodes,
        } as GraphData;
    }, [groupIdToStartWith, getHierarchiesForGroup, hierarchies, groupsById, shouldIncludeGroup, getGraphNodeFromGroup]);
};
