import { create } from 'zustand';
import { fetchGroupMembers } from '../api/routes/fetchGroupMembers';
import { fetchGroupRoles } from '../api/routes/fetchGroupRoles';
import { fetchGroupTypes } from '../api/routes/fetchGroupTypes';
import { fetchGroups } from '../api/routes/fetchGroups';
import { fetchHierarchies } from '../api/routes/fetchHierarchies';
import { fetchPersons } from '../api/routes/fetchPersons';
import _ from 'lodash';
import type { Group } from '../models/Group';
import type { GroupMember } from '../models/GroupMember';
import type { GroupRole } from '../models/GroupRole';
import type { GroupType } from '../models/GroupType';
import type { Hierarchy } from '../models/Hierarchy';
import type { Person } from '../models/Person';

type GroupState = {
	persons: Person[];
	personsById: Record<number, Person>;
	groups: Group[];
	groupsById: Record<number, Group>;
	groupMembers: GroupMember[];
	hierarchies: Hierarchy[];
	hierarchiesByGroup: Record<number, Hierarchy>;
	isLoading: boolean;
	groupTypes: GroupType[];
	groupTypesById: Record<number, GroupType>;
	groupRoles: GroupRole[];
	groupRolesByType: Record<number, GroupRole[]>;

	selectedRoles: number[];
	setSelectedRoles: (roles: string | string[]) => void;

	// Fetching
	fetchGroups: (withMembers?: boolean) => Promise<void>;
	fetchHierarchies: () => Promise<void>;
	fetchPersons: () => Promise<void>;
	fetchGroupRoles: () => Promise<void>;
	fetchGroupTypes: () => Promise<void>;
};

export const useAppStore = create<GroupState>((set, get) => ({
	isLoading: false,
	persons: [] as Person[],
	personsById: {} as Record<number, Person>,
	groups: [] as Group[],
	groupsById: {} as Record<number, Group>,
	groupMembers: [] as GroupMember[],
	hierarchies: [] as Hierarchy[],
	hierarchiesByGroup: {} as Record<number, Hierarchy>,
	groupTypes: [] as GroupType[],
	groupTypesById: {} as Record<number, GroupType>,
	groupRoles: [] as GroupRole[],
	groupRolesByType: {} as Record<number, GroupRole[]>,
	selectedRoles: [] as number[],
	fetchGroups: async (withMembers: boolean = true) => {
		set({ isLoading: true });
		const groups = await fetchGroups();

		if (groups) set({ groups, groupsById: Object.fromEntries(groups.map((group) => [group.id, group])) });

		if (withMembers) {
			const groupMembers = await fetchGroupMembers();

			if (groupMembers) set({ groupMembers });
		}

		set({ isLoading: false });
	},
	fetchHierarchies: async () => {
		set({ isLoading: true });
		const hierarchies = await fetchHierarchies();
		if (hierarchies)
			set({
				hierarchies,
				hierarchiesByGroup: Object.fromEntries(hierarchies.map((hierarchy) => [hierarchy.groupId, hierarchy])),
			});
		set({ isLoading: false });
	},
	fetchPersons: async () => {
		set({ isLoading: true });
		const persons = await fetchPersons();
		if (persons) set({ persons, personsById: Object.fromEntries(persons.map((person) => [person.id, person])) });
		set({ isLoading: false });
	},
	fetchGroupTypes: async () => {
		set({ isLoading: true });
		const groupTypes = await fetchGroupTypes();
		if (groupTypes)
			set({
				groupTypes,
				groupTypesById: Object.fromEntries(groupTypes.map((groupType) => [groupType.id, groupType])),
			});
		set({ isLoading: false });
	},
	fetchGroupRoles: async () => {
		set({ isLoading: true });
		const groupRoles = await fetchGroupRoles();
		if (groupRoles)
			set({
				groupRoles,
				groupRolesByType: _.groupBy(groupRoles, 'groupTypeId'),
			});
		set({ isLoading: false });
	},
	setSelectedRoles: (roles: string | string[]) =>
		set({ selectedRoles: typeof roles === 'string' ? [Number(roles)] : roles.map(Number) }),
}));
