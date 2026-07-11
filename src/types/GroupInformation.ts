import type { ChatStatus } from './ChatStatus';
import type { GroupStatus } from './GroupStatus';

export interface GroupInformation {
	[key: string]: unknown;
	ageGroupIds: number[];
	campusId: number;
	chatStatus: ChatStatus;
	color?: string;
	groupCategoryId: number;
	groupStatusId: GroupStatus;
	groupTypeId: number;
	imageUrl: string;
	meetingTime: string;
	note: string;
	targetGroupId: number;
	weekday: number;
}
