import { useMemo } from 'react';

import type { Group } from '../types/Group';

import { useAppStore } from '../state/useAppStore';
import { useGroupsById } from './useGroupsById';
import { useHierarchiesByGroupId } from './useHierarchiesByGroupId';

export const useFilteredGroupIds = (): number[] => {
	const committedFilters = useAppStore((s) => s.committedFilters);
	const collapsedNodeIds = useAppStore((s) => s.collapsedNodeIds);

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
			showParentGroups,
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
		const collapsedNodeIdSet = new Set(collapsedNodeIds.map(Number));
		const rootNodes = startGroupId
			? [startGroupId]
			: Object.keys(groupsById)
					.filter((groupId) => {
						const group = groupsById[Number(groupId)];
						if (!group || !shouldIncludeGroup(group)) return false;

						const hierarchy = hierarchiesByGroupId[group.id];
						return (hierarchy?.parents ?? []).every((parentId) => {
							const parent = groupsById[parentId];
							return !parent || !shouldIncludeGroup(parent);
						});
					})
					.map(Number);
		const traversalRootNodes =
			rootNodes.length > 0
				? rootNodes
				: Object.values(groupsById).flatMap((group) => (group && shouldIncludeGroup(group) ? [group.id] : []));

		const addedNodeIds = new Set<number>();
		const queue: { depth: number; direction: 'down' | 'up'; groupId: number }[] = traversalRootNodes.map((id) => ({
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
			const isCollapsed = collapsedNodeIdSet.has(groupId);

			// The root is ring 1, so maxDepth 1 must not traverse to ring 2.
			if (!isCollapsed && (maxDepth === undefined || depth + 1 < maxDepth)) {
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

					// Add parents (upward traversal) only from start group if showParentGroups is enabled
					if (startGroupId && groupId === startGroupId && direction === 'down' && showParentGroups) {
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
	}, [collapsedNodeIds, committedFilters, groupsById, hierarchiesByGroupId]);
};
