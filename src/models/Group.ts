import type { FollowUp } from './FollowUp';
import type { GroupInformation } from './GroupInformation';
import type { GroupMember } from './GroupMember';
import type { GroupSettings } from './GroupSettings';
import type { Role } from './Role';

export type Group = {
	id: number;
	guid: string;
	name: string;
	securityLevelForGroup: number;
	permissions: {
		useChat: boolean;
		startChat: boolean;
	};
	information: GroupInformation;
	settings?: GroupSettings;
	followUp: FollowUp;
	roles: Role[];
	members?: GroupMember[];
};
