import { performance } from "perf_hooks";

// In the actual code, the arrays are iterated over in the inner while loop!
// The real test is where shouldIncludeGroup is called for EACH group, e.g. 50,000 times.

// Mock data
const numGroups = 10000;
const groupsById: Record<number, any> = {};
const hierarchiesByGroupId: Record<number, any> = {};
const rootNodes: number[] = [1];

for (let i = 1; i <= numGroups; i++) {
  groupsById[i] = {
    id: i,
    information: {
      groupTypeId: (i % 5) + 1,
      groupStatusId: (i % 3) + 1,
    }
  };
  hierarchiesByGroupId[i] = {
    groupId: i,
    children: i * 2 <= numGroups ? [i * 2, i * 2 + 1] : []
  };
}

const committedFilters = {
    // Large array of excluded groups scattered across the ids
    excludedGroups: Array.from({length: 5000}, (_, i) => i * 10),
    excludedGroupTypes: [3, 4],
    groupIdToStartWith: undefined,
    hideIndirectSubgroups: false,
    // Included groups contains most ids, forcing Array.includes to scan
    includedGroups: Array.from({length: 9000}, (_, i) => i + 1),
    includedGroupStatuses: [1, 2],
    maxDepth: undefined,
    showOnlyDirectChildren: false,
};

function runHookLogic(useSets: boolean) {
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

    const startGroupId = groupIdToStartWith ? Number(groupIdToStartWith) : undefined;
    const addedNodeIds = new Set<number>();
    const queue: { depth: number; groupId: number }[] = rootNodes.map((id) => ({ depth: 0, groupId: id }));
    const visited = new Set<number>();
    let queueIdx = 0;

    if (!useSets) {
        const shouldIncludeGroup = (group: any) => {
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

        // Simulating the loop running over all elements.
        for(let i = 1; i <= numGroups; i++) {
            shouldIncludeGroup(groupsById[i]);
        }

    } else {
        const includedGroupsSet = new Set(includedGroups);
        const excludedGroupsSet = new Set(excludedGroups);
        const excludedGroupTypesSet = new Set(excludedGroupTypes);
        const includedGroupStatusesSet = new Set(includedGroupStatuses);

        const shouldIncludeGroup = (group: any) => {
            if (groupIdToStartWith && group.id === Number(groupIdToStartWith)) {
                return true;
            }
            if (includedGroupsSet.size > 0 && !includedGroupsSet.has(group.id)) {
                return false;
            }
            return (
                !!group.information.groupTypeId &&
                !excludedGroupsSet.has(group.id) &&
                !excludedGroupTypesSet.has(group.information.groupTypeId) &&
                (includedGroupStatusesSet.size === 0 || includedGroupStatusesSet.has(group.information.groupStatusId))
            );
        };

        for(let i = 1; i <= numGroups; i++) {
            shouldIncludeGroup(groupsById[i]);
        }
    }

    return Array.from(addedNodeIds);
}

// Warmup
for(let i=0; i<5; i++) {
    runHookLogic(false);
    runHookLogic(true);
}

let totalArr = 0;
let totalSet = 0;
let iters = 20;

for(let i=0; i<iters; i++) {
    const start1 = performance.now();
    runHookLogic(false);
    totalArr += (performance.now() - start1);

    const start2 = performance.now();
    runHookLogic(true);
    totalSet += (performance.now() - start2);
}

console.log(`Simulated Loop Calls:`);
console.log(`Avg Array includes: ${totalArr / iters} ms`);
console.log(`Avg Set has: ${totalSet / iters} ms`);
