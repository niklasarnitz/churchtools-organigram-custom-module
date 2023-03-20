import type { EnhancedGroupMember } from './EnhancedGroupMember';
import type { Group } from './Group';

export type Relation = {
	source: Group;
	target: Group | EnhancedGroupMember;
};
