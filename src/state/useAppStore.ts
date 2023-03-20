import { create } from 'zustand';
import { fetchGroupMembers } from '../api/routes/fetchGroupMembers';
import { fetchGroups } from '../api/routes/fetchGroups';
import { fetchHierarchies } from '../api/routes/fetchHierarchies';
import { fetchPersons } from '../api/routes/fetchPersons';
import type { Group } from '../models/Group';
import type { GroupMember } from '../models/GroupMember';
import type { Hierarchy } from '../models/Hierarchy';
import type { Person } from '../models/Person';
import type { Relation } from './../models/Relation';

type GroupState = {
	persons: Person[];
	personsById: Record<number, Person>;
	groups: Group[];
	groupsById: Record<number, Group>;
	// Record<groupId, GroupMember[]>
	groupMembers: Record<number, GroupMember[]>;
	hierarchies: Hierarchy[];
	hierarchiesByGroup: Record<number, Hierarchy>;
	isLoading: boolean;
	fetchGroups: (withMembers?: boolean) => Promise<void>;
	fetchHierarchies: () => Promise<void>;
	fetchPersons: () => Promise<void>;
	relations: Relation[];
	addRelation: (relation: Relation) => void;
};

export const useAppStore = create<GroupState>((set, get) => ({
	isLoading: false,
	persons: [] as Person[],
	personsById: {} as Record<number, Person>,
	groups: [] as Group[],
	groupsById: {} as Record<number, Group>,
	groupMembers: {} as Record<number, GroupMember[]>,
	hierarchies: [] as Hierarchy[],
	hierarchiesByGroup: {} as Record<number, Hierarchy>,
	relations: [] as Relation[],
	fetchGroups: async (withMembers: boolean = true) => {
		set({ isLoading: true });
		const groups = await fetchGroups();

		if (groups) set({ groups, groupsById: Object.fromEntries(groups.map((group) => [group.id, group])) });

		if (withMembers && groups) {
			for (const group of groups) {
				const groupMembers = await fetchGroupMembers(group.id);

				if (groupMembers) {
					set((state) => ({
						groupMembers: {
							...state.groupMembers,
							[group.id]: groupMembers,
						},
					}));
				}
			}
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
	addRelation: (relation: Relation) => {
		set((state) => ({
			relations: [...state.relations, relation],
		}));
	},
}));
