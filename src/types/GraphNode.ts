import type { URecord } from '@ainias42/js-helper';
import type { Group } from './Group';
import type { GroupMember } from './GroupMember';
import type { GroupRole } from './GroupRole';
import type { Person } from './Person';
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
	metadata: string;
	personsById: URecord<number, Person>;
	roles: GroupRole[];
	title: string;
}
