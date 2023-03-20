import type { Group } from './Group';
import type { GroupMember } from './GroupMember';

export type Relation = {
	source: Group;
	target: Group | GroupMember;
};
