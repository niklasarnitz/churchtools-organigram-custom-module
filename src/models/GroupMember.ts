import type { GroupMemberStatus } from './GroupMemberStatus';

export type GroupMember = {
	personId: number;
	groupId: number;
	groupTypeRoleId: number;
	groupMemberStatus: GroupMemberStatus;
	lastChange: string;
	deleted: boolean;
};
