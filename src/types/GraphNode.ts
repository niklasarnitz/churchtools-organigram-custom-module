import type { Group } from './Group';
import type { GroupMember } from './GroupMember';
import type { GroupRole } from './GroupRole';
import type { getColorForGroupType } from '../globals/Colors';

export interface GraphNode {
	group: Group;
	groupRoles: GroupRole[];
	members: GroupMember[];
}

export interface PreviewGraphNodeData {
	color: ReturnType<typeof getColorForGroupType>;
	group: Group;
	groupTypeName: string;
	id: number;
	members: GroupMember[];
	memberNamesByRoleId: Map<number, string[]>;
	metadata: string;
	roles: GroupRole[];
	title: string;
}
