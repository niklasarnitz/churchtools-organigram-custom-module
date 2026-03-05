import type { getColorForGroupType } from '../globals/Colors';
import type { Group } from './Group';
import type { GroupMember } from './GroupMember';
import type { GroupRole } from './GroupRole';

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
	memberNamesByRoleId: Map<number, string[]>;
	members: GroupMember[];
	metadata: string;
	roles: GroupRole[];
	title: string;
}
