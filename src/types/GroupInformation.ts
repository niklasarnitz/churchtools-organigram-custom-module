import type { ChatStatus } from './ChatStatus';
import type { GroupStatus } from './GroupStatus';

export interface GroupInformation {
	ageGroupIds: number[];
	campusId: number;
	chatStatus: ChatStatus;
	groupCategoryId: number;
	groupStatusId: GroupStatus;
	groupTypeId: number;
	imageUrl: string;
	meetingTime: string;
	note: string;
	targetGroupId: number;
	weekday: number;
}
