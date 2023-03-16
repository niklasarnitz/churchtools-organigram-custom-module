export type Role = {
	id: number;
	groupTypeId: number;
	name: string;
	shorty: string;
	sortKey: number;
	toDelete: boolean;
	hasRequested: boolean;
	isLeader: boolean;
	isDefault: boolean;
	isHidden: boolean;
	growPathId: null | number;
	groupTypeRoleId: number;
	forceTwoFactorAuth: boolean;
	isActive: boolean;
	canReadChat: boolean;
	canWriteChat: boolean;
};
