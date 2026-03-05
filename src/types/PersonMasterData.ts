import type { AgeGroup } from './AgeGroup';
import type { Campus } from './Campus';
import type { GroupCategory } from './GroupCategory';

export interface PersonMasterData {
	ageGroups: AgeGroup[];
	campuses: Campus[];
	groupCategories: GroupCategory[];
}
