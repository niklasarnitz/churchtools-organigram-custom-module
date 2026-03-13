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
		const queue: { depth: number; direction: 'down' | 'up'; groupId: number }[] = rootNodes.map((id) => ({
			depth: 0,
			direction: 'down',
			groupId: id,
		}));
		const visited = new Set<number>();
		let queueIdx = 0;

		while (queueIdx < queue.length) {
			const currentItem = queue[queueIdx++];

			const { depth, direction, groupId } = currentItem;

			if (visited.has(groupId)) continue;
			visited.add(groupId);

			const group = groupsById[groupId];
			if (!group || !shouldIncludeGroup(group)) continue;

			addedNodeIds.add(groupId);

			// Only traverse downward if maxDepth not reached
			if (maxDepth === undefined || depth < maxDepth) {
				const hierarchy = hierarchiesByGroupId[groupId];
				if (hierarchy) {
					// Add children (downward traversal)
					if (direction === 'down') {
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
							queue.push({ depth: depth + 1, direction: 'down', groupId: childId });
						}
					}

					// Add parents (upward traversal) only from start group
					if (startGroupId && groupId === startGroupId && direction === 'down') {
						for (const parentId of hierarchy.parents) {
							const parentGroup = groupsById[parentId];
							if (!parentGroup || !shouldIncludeGroup(parentGroup)) continue;

							addedNodeIds.add(parentId);
							queue.push({ depth: depth + 1, direction: 'up', groupId: parentId });
						}
					}
				}
			}
		}

		return Array.from(addedNodeIds);
	}, [committedFilters, hierarchies, groupsById, hierarchiesByGroupId]);
};
