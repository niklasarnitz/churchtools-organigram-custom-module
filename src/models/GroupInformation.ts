import type { ChatStatus } from './ChatStatus';
import type { GroupStatus } from './GroupStatus';

export type GroupInformation = {
	imageUrl: string;
	groupStatusId: GroupStatus;
	groupTypeId: number;
	chatStatus: ChatStatus;
	note: string;
	campusId: number;
	groupCategoryId: number;
	targetGroupId: number;
	ageGroupIds: number[];
	weekday: number;
	meetingTime: string;
};
