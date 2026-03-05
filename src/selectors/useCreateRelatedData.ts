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

const EMPTY_GRAPH: GraphData = { nodes: [], relations: [] };

export const useCreateRelatedData = (): GraphData => {
	const committedFilters = useAppStore((s) => s.committedFilters);

	const { data: hierarchies } = useHierarchies();
	const groupsById = useGroupsById();
	const hierarchiesByGroupId = useHierarchiesByGroupId();
	const groupRolesByType = useGroupRolesByType();
	const groupMembersByGroupId = useGroupMembersByGroupId();

	const shouldIncludeGroup = useMemo(
		() => {
			if (!committedFilters) return () => false;

			const {
				excludedGroups,
				excludedGroupTypes,
				groupIdToStartWith,
				includedGroupStatuses,
				includedGroups,
			} = committedFilters;

			return (group: Group) => {
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
		},
		[committedFilters],
	);

	const getGraphNodeFromGroup = useMemo(
		() => {
			if (!committedFilters) return () => ({ group: {} as Group, groupRoles: [], members: [] }) as GraphNode;

			const { excludedRoles } = committedFilters;

			return (group: Group): GraphNode => {
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
			};
		},
		[groupMembersByGroupId, groupRolesByType, committedFilters],
	);

	const getHierarchicalData = useMemo(
		() => () => {
			if (!committedFilters) return { nodes: [] as GraphNode[], relations: [] as Relation[] };

			const {
				groupIdToStartWith,
				hideIndirectSubgroups,
				maxDepth,
				showOnlyDirectChildren,
			} = committedFilters;

			const startGroupId = groupIdToStartWith ? Number(groupIdToStartWith) : undefined;
			const rootNodes = startGroupId ? [startGroupId] : (hierarchies ?? []).map((h) => h.groupId);

			const nodes: GraphNode[] = [];
			const relations: Relation[] = [];
			const addedNodeIds = new Set<number>();
			const addedRelationIds = new Set<string>();

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
					if (!childGroup || !shouldIncludeGroup(childGroup)) continue;

					// Implement showOnlyDirectChildren: if enabled, only allow children of the root nodes (depth 0)
					if (showOnlyDirectChildren && depth > 0) continue;

					// Implement hideIndirectSubgroups: if current group and child have different types, and it's not a root node
					if (
						hideIndirectSubgroups &&
						group.information.groupTypeId !== childGroup.information.groupTypeId &&
						depth > 0
					)
						continue;

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
		},
		[
			committedFilters,
			hierarchies,
			hierarchiesByGroupId,
			groupsById,
			shouldIncludeGroup,
			getGraphNodeFromGroup,
		],
	);

	return useMemo(() => {
		if (!committedFilters) return EMPTY_GRAPH;
		const { nodes, relations } = getHierarchicalData();
		return { nodes, relations } as GraphData;
	}, [committedFilters, getHierarchicalData]);
};
