import type { GroupVisibility } from './GroupVisibility';

export interface GroupSettings {
	autoAccept: boolean;
	groupMeeting: {
		autoCreate: boolean;
		templateId: number | undefined;
	};
	isHidden: boolean;
	isOpenForMembers: boolean | undefined;
	isPublic: boolean;
	qrCodeCheckin: boolean;
	visibility: GroupVisibility;
}
