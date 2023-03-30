import type { Group } from './Group';
import type { GroupMember } from './GroupMember';
import type { GroupRole } from './GroupRole';

export type GraphNode = {
	group: Group;
	groupRoles: GroupRole[];
	members: GroupMember[];
};
