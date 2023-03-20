import type { Group } from './Group';
import type { GroupMember } from './GroupMember';
export type EnhancedGroupMember = GroupMember & {
	group: Group;
};
