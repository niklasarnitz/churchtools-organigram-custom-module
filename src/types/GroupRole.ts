export type GroupRole = {
	id: number;
	groupTypeId: number;
	name: string;
	nameTranslated: string;
	shorty: string;
	sortKey: number;
	type: string;
	isDefault: boolean;
	isHidden: boolean;
	growPathId: number | null;
	isLeader: boolean;
};
