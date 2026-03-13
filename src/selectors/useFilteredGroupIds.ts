import { useMemo } from 'react';

import type { Group } from '../types/Group';

import { useHierarchies } from '../queries/useHierarchies';
import { useAppStore } from '../state/useAppStore';
import { useGroupsById } from './useGroupsById';
import { useHierarchiesByGroupId } from './useHierarchiesByGroupId';

export const useFilteredGroupIds = (): number[] => {
	const committedFilters = useAppStore((s) => s.committedFilters);

	const { data: hierarchies } = useHierarchies();
	const groupsById = useGroupsById();
	const hierarchiesByGroupId = useHierarchiesByGroupId();

	return useMemo(() => {
		if (!committedFilters) return [];

		const {
			excludedGroups,
			excludedGroupTypes,
			groupIdToStartWith,
			hideIndirectSubgroups,
			includedGroups,
			includedGroupStatuses,
			maxDepth,
			showOnlyDirectChildren,
		} = committedFilters;

		const shouldIncludeGroup = (group: Group) => {
			if (groupIdToStartWith && group.id === Number(groupIdToStartWith)) {
				return true;
			}
			if (includedGroups.length > 0 && !includedGroups.includes(group.id)) {
				return false;
			}
			return (
				!!group.information.groupTypeId &&
				!excludedGroups.includes(group.id) &&
				!excludedGroupTypes.includes(group.information.groupTypeId) &&
				(includedGroupStatuses.length === 0 || includedGroupStatuses.includes(group.information.groupStatusId))
			);
		};

		const startGroupId = groupIdToStartWith ? Number(groupIdToStartWith) : undefined;
		const rootNodes = startGroupId ? [startGroupId] : (hierarchies ?? []).map((h) => h.groupId);

		const addedNodeIds = new Set<number>();
		const queue: { depth: number; groupId: number }[] = rootNodes.map((id) => ({ depth: 0, groupId: id }));
		const visited = new Set<number>();
		let queueIdx = 0;

		while (queueIdx < queue.length) {
			const currentItem = queue[queueIdx++];

			const { depth, groupId } = currentItem;

			if (visited.has(groupId)) continue;
			visited.add(groupId);

			const group = groupsById[groupId];
			if (!group || !shouldIncludeGroup(group)) continue;

			addedNodeIds.add(groupId);

			if (maxDepth !== undefined && depth >= maxDepth) continue;

			const hierarchy = hierarchiesByGroupId[groupId];
			if (!hierarchy) continue;

			for (const childId of hierarchy.children) {
				const childGroup = groupsById[childId];
				if (!childGroup || !shouldIncludeGroup(childGroup)) continue;

				if (showOnlyDirectChildren && depth > 0) continue;

				if (
					hideIndirectSubgroups &&
					group.information.groupTypeId !== childGroup.information.groupTypeId &&
					depth > 0
				)
					continue;

				addedNodeIds.add(childId);
				queue.push({ depth: depth + 1, groupId: childId });
			}
		}

		return Array.from(addedNodeIds);
	}, [committedFilters, hierarchies, groupsById, hierarchiesByGroupId]);
};
