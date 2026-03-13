import { performance } from 'perf_hooks';

// Simulate members
const members = Array.from({ length: 100000 }, (_, i) => ({
  personId: i,
  groupTypeRoleId: i % 100, // 100 different roles
}));

const excludedRoles = Array.from({ length: 50 }, (_, i) => i * 2); // 50 excluded roles

// Baseline
const startBaseline = performance.now();
for (let j = 0; j < 100; j++) {
  const filteredMembers = excludedRoles.length > 0
    ? members.filter((m) => !excludedRoles.includes(m.groupTypeRoleId))
    : members;
  const result = Array.from(new Set(filteredMembers.map((m) => m.personId)));
}
const endBaseline = performance.now();
console.log(`Baseline (Array.includes): ${endBaseline - startBaseline} ms`);

// Optimized
const startOptimized = performance.now();
for (let j = 0; j < 100; j++) {
  if (excludedRoles.length > 0) {
    const excludedRolesSet = new Set(excludedRoles);
    const filteredMembers = members.filter((m) => !excludedRolesSet.has(m.groupTypeRoleId));
    const result = Array.from(new Set(filteredMembers.map((m) => m.personId)));
  } else {
    const result = Array.from(new Set(members.map((m) => m.personId)));
  }
}
const endOptimized = performance.now();
console.log(`Optimized (Set.has): ${endOptimized - startOptimized} ms`);
