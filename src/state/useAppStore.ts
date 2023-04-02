import { LayoutAlgorithm } from '../models/LayoutAlgorithm';
import { churchtoolsClient } from '@churchtools/churchtools-client';
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
	groupMembersByGroup: Record<number, GroupMember[]>;
	hierarchies: Hierarchy[];
	hierarchiesByGroup: Record<number, Hierarchy>;
	isLoading: boolean;
	groupTypes: GroupType[];
	groupTypesById: Record<number, GroupType>;
	groupRoles: GroupRole[];
	groupRolesByType: Record<number, GroupRole[]>;

	excludedRoles: number[];
	setExcludedRoles: (roles: string | string[]) => void;

	excludedGroupTypes: number[];
	setExcludedGroupTypes: (groups: string | string[]) => void;

	excludedGroups: number[];
	setExcludedGroups: (groups: string | string[]) => void;

	// Display Options
	showGroupTypes: boolean;
	setShowGroupTypes: (show: boolean) => void;

	groupIdToStartWith: string | undefined;
	setGroupIdToStartWith: (groupId: string | string[] | undefined) => void;

	layoutAlgorithm: LayoutAlgorithm;
	setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => void;

	baseUrl: string | undefined;
	setBaseUrl: (url: string | undefined) => void;

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
	groupMembersByGroup: {} as Record<number, GroupMember[]>,
	hierarchies: [] as Hierarchy[],
	hierarchiesByGroup: {} as Record<number, Hierarchy>,
	groupTypes: [] as GroupType[],
	groupTypesById: {} as Record<number, GroupType>,
	groupRoles: [] as GroupRole[],
	groupRolesByType: {} as Record<number, GroupRole[]>,
	excludedRoles: [] as number[],
	excludedGroupTypes: [] as number[],
	excludedGroups: [] as number[],

	showGroupTypes: false,

	groupIdToStartWith: undefined,

	layoutAlgorithm: LayoutAlgorithm.dagre,

	baseUrl: undefined,

	fetchGroups: async (withMembers: boolean = true) => {
		set({ isLoading: true });
		const groups = await fetchGroups();

		if (groups) set({ groups, groupsById: Object.fromEntries(groups.map((group) => [group.id, group])) });

		if (withMembers) {
			const groupMembers = await fetchGroupMembers();

			if (groupMembers) {
				set({ groupMembers });

				const groupMembersByGroup = {} as Record<number, GroupMember[]>;

				for (const member of groupMembers) {
					if (!groupMembersByGroup[member.groupId]) groupMembersByGroup[member.groupId] = [];
					groupMembersByGroup[member.groupId].push(member);
				}

				set({ groupMembersByGroup });
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
	setExcludedRoles: (roles: string | string[]) =>
		set({ excludedRoles: typeof roles === 'string' ? [Number(roles)] : roles.map(Number) }),
	setExcludedGroupTypes: (groups: string | string[]) =>
		set({ excludedGroupTypes: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) }),
	setExcludedGroups: (groups: string | string[]) =>
		set({ excludedGroups: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) }),
	setShowGroupTypes: (show: boolean) => set({ showGroupTypes: show }),
	setGroupIdToStartWith: (groupIdToStartWith: string | string[] | undefined) =>
		typeof groupIdToStartWith === 'string' ? set({ groupIdToStartWith }) : set({ groupIdToStartWith: undefined }),

	setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => set({ layoutAlgorithm: algorithm }),
	setBaseUrl: (url: string | undefined) => {
		churchtoolsClient.setBaseUrl(url ?? '');
		set({ baseUrl: url });
	},
}));
