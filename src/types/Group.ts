import type { FollowUp } from './FollowUp';
import type { GroupInformation } from './GroupInformation';
import type { GroupMember } from './GroupMember';
import type { GroupSettings } from './GroupSettings';
import type { Role } from './Role';

export interface Group {
	followUp: FollowUp;
	guid: string;
	id: number;
	information: GroupInformation;
	members?: GroupMember[];
	name: string;
	permissions: {
		startChat: boolean;
		useChat: boolean;
	};
	roles: Role[];
	securityLevelForGroup: number;
	settings?: GroupSettings;
}
