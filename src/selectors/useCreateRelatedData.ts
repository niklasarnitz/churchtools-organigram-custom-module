import { useMemo } from 'react';

import type { GraphData } from '../types/GraphData';
import type { GraphNode } from '../types/GraphNode';
import type { Relation } from '../types/Relation';

import { useAppStore } from '../state/useAppStore';
import { useFilteredGroupIds } from './useFilteredGroupIds';
import { useGroupMembersByGroupId } from './useGroupMembersByGroupId';
import { useGroupRolesByType } from './useGroupRolesByType';
import { useGroupsById } from './useGroupsById';
import { useHierarchiesByGroupId } from './useHierarchiesByGroupId';

const EMPTY_GRAPH: GraphData = { nodes: [], relations: [] };

export const useCreateRelatedData = (): GraphData => {
	const committedFilters = useAppStore((s) => s.committedFilters);
	const filteredGroupIds = useFilteredGroupIds();
	const groupsById = useGroupsById();
	const hierarchiesByGroupId = useHierarchiesByGroupId();
	const groupRolesByType = useGroupRolesByType();
	const groupMembersByGroupId = useGroupMembersByGroupId();

	return useMemo(() => {
		if (!committedFilters || filteredGroupIds.length === 0) return EMPTY_GRAPH;

		const { excludedRoles } = committedFilters;
		const filteredSet = new Set(filteredGroupIds);

		const nodes: GraphNode[] = [];
		const relations: Relation[] = [];

		for (const groupId of filteredGroupIds) {
			const group = groupsById[groupId];
			if (!group) continue;

			const members = groupMembersByGroupId[groupId] ?? [];
			const rolesForType = groupRolesByType[group.information.groupTypeId] ?? [];

			const groupRoles = rolesForType.filter(
				(role) =>
					!excludedRoles.includes(role.id) && members.some((member) => member.groupTypeRoleId === role.id),
			);

			nodes.push({ group, groupRoles, members });

			const hierarchy = hierarchiesByGroupId[groupId];
			if (!hierarchy) continue;

			for (const childId of hierarchy.children) {
				if (!filteredSet.has(childId)) continue;
				const childGroup = groupsById[childId];
				if (!childGroup) continue;

				relations.push({ source: group, target: childGroup });
			}
		}

		return { nodes, relations };
	}, [committedFilters, filteredGroupIds, groupsById, hierarchiesByGroupId, groupRolesByType, groupMembersByGroupId]);
};
