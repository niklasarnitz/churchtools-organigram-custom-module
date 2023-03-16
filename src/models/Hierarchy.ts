import type { GroupDomainObject } from './GroupDomainObject';

export type Hierarchy = {
	groupId: number;
	group: GroupDomainObject;
	// Parent Group Ids
	parents: number[];
	// Child Group Ids
	children: number[];
};
