import type { GroupMemberStatus } from './GroupMemberStatus';

export interface GroupMember {
	deleted: boolean;
	groupId: number;
	groupMemberStatus: GroupMemberStatus;
	groupTypeRoleId: number;
	lastChange: string;
	personId: number;
}
