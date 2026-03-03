export interface Role {
	canReadChat: boolean;
	canWriteChat: boolean;
	forceTwoFactorAuth: boolean;
	groupTypeId: number;
	groupTypeRoleId: number;
	growPathId: null | number;
	hasRequested: boolean;
	id: number;
	isActive: boolean;
	isDefault: boolean;
	isHidden: boolean;
	isLeader: boolean;
	name: string;
	shorty: string;
	sortKey: number;
	toDelete: boolean;
}
