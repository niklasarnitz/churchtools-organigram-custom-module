import { useAppStore } from '../state/useAppStore';
import type { GraphData } from './../models/GraphData';
import type { GraphNode } from './../models/GraphNode';
import type { Group } from '../models/Group';
import type { Hierarchy } from './../models/Hierarchy';
import type { Relation } from './../models/Relation';

// TODO: If group.information.groupTypeId is missing, get it from the API manually!
const shouldIncludeGroup = (group: Group) => {
	const { excludedGroupTypes, excludedGroups } = useAppStore.getState();

	return (
		group &&
		group.information &&
		group.information.groupTypeId &&
		!excludedGroups.includes(group.id) &&
		!excludedGroupTypes.includes(group.information.groupTypeId)
	);
};

const getGraphNodeFromGroup = (group: Group): GraphNode => {
	const { groupRolesByType, groupMembersByGroup, excludedRoles } = useAppStore.getState();
	const members = groupMembersByGroup[group.id] ?? [];

	const groupRoles = (groupRolesByType[group.information.groupTypeId] ?? []).filter(
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

const includesGroup = (nodes: GraphNode[], group: Group) => {
	return (
		nodes.findIndex((n) => {
			if (n.group && n.group.id && group && group.id) return n.group.id === group.id;
			return false;
		}) !== -1
	);
};

// This is a really ugly function. If you want to change that, you're welcome to do so.
const getHierarchiesForGroup = (groupId: number) => {
	const { hierarchiesByGroup } = useAppStore.getState();

	const localHierarchies: Hierarchy[] = [];
	const localChildren: number[] = [];

	const hierarchy = hierarchiesByGroup[groupId];

	if (hierarchy) {
		localHierarchies.push(hierarchy);
		localChildren.push(...hierarchy.children);
	}

	while (localChildren.length > 0) {
		const child = localChildren.pop();

		if (child) {
			const childHierarchy = hierarchiesByGroup[child];

			if (childHierarchy) {
				localHierarchies.push(childHierarchy);
				localChildren.push(...childHierarchy.children);
			}
		}
	}

	return localHierarchies;
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const createData = () => {
	const { hierarchies, groupsById, groupIdToStartWith } = useAppStore.getState();

	const localHierarchies = groupIdToStartWith ? getHierarchiesForGroup(Number(groupIdToStartWith)) : hierarchies;

	const relations: Relation[] = [];
	const nodes: GraphNode[] = [];

	for (const hierarchy of localHierarchies) {
		const group = groupsById[hierarchy.groupId];

		if (shouldIncludeGroup(group)) {
			if (!includesGroup(nodes, group)) {
				nodes.push(getGraphNodeFromGroup(group));
			}

			for (const child of hierarchy.children) {
				const childGroup = groupsById[child];

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
};
