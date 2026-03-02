import type { GroupVisibility } from './GroupVisibility';

export type GroupSettings = {
	isOpenForMembers: boolean | undefined;
	groupMeeting: {
		autoCreate: boolean;
		templateId: undefined | number;
	};
	qrCodeCheckin: boolean;
	autoAccept: boolean;
	isHidden: boolean;
	isPublic: boolean;
	visibility: GroupVisibility;
};
