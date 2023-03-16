import type { GroupMemberStatus } from './GroupMemberStatus';
import type { Person } from './Person';
export type GroupMember = {
	comment: string;
	groupMemberStatus?: GroupMemberStatus;
	groupTypeRoleId: number;
	person: Person;
	personId: number;
	fields?: { id: number; name?: string; value?: string }[];
};
