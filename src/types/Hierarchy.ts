import type { GroupDomainObject } from './GroupDomainObject';

export interface Hierarchy {
	// Child Group Ids
	children: number[];
	group: GroupDomainObject;
	groupId: number;
	// Parent Group Ids
	parents: number[];
}
