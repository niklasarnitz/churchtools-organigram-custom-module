export type FollowUp = {
	typeId: number | null;
	targetTypeId: number;
	targetObjectId: number | null;
	targetGroupMemberStatusId: number | null;
	sendReminderMails: boolean;
};
