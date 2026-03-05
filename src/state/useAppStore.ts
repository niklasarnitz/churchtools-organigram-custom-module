import { churchtoolsClient } from '@churchtools/churchtools-client';
import { create } from 'zustand';

import type { UserSettings } from '../hooks/useUserSettings';

import { GroupStatus } from '../types/GroupStatus';
import { LayoutAlgorithm } from '../types/LayoutAlgorithm';
import { type RendererType } from '../types/RendererType';

export interface PendingExport {
	fileName: string;
	type: 'graphml' | 'svg';
}

export interface CommittedFilters {
	excludedGroups: number[];
	excludedGroupTypes: number[];
	excludedRoles: number[];
	filteredAgeGroupIds: number[];
	filteredCampusIds: number[];
	filteredGroupCategoryIds: number[];
	groupIdToStartWith: string | undefined;
	hideIndirectSubgroups: boolean;
	includedGroupStatuses: GroupStatus[];
	includedGroups: number[];
	layoutAlgorithm: LayoutAlgorithm;
	maxDepth: number | undefined;
	renderer: RendererType;
	showGroupTypes: boolean;
	showOnlyDirectChildren: boolean;
}

interface GroupState {
	baseUrl: string | undefined;
	committedFilters: CommittedFilters | undefined;
	excludedGroups: number[];
	excludedGroupTypes: number[];
	filteredAgeGroupIds: number[];
	filteredCampusIds: number[];
	filteredGroupCategoryIds: number[];
	includedGroupStatuses: GroupStatus[];
	excludedRoles: number[];

	groupIdToStartWith: string | undefined;
	hideIndirectSubgroups: boolean;
	includedGroups: number[];
	isExporting: boolean;
	layoutAlgorithm: LayoutAlgorithm;
	maxDepth: number | undefined;

	focusNodeId: string | undefined;
	pendingExport: PendingExport | undefined;
	renderer: RendererType;

	commitFilters: () => void;
	setFocusNodeId: (id: string | undefined) => void;
	setAllSettings: (settings: Partial<UserSettings>) => void;
	setBaseUrl: (url: string | undefined) => void;
	setExcludedGroups: (groups: string | string[]) => void;
	setExcludedGroupTypes: (groups: string | string[]) => void;
	setFilteredAgeGroupIds: (ids: number[]) => void;
	setFilteredCampusIds: (ids: number[]) => void;
	setFilteredGroupCategoryIds: (ids: number[]) => void;
	setIncludedGroupStatuses: (statuses: GroupStatus[]) => void;

	setExcludedRoles: (roles: string | string[]) => void;

	setGroupIdToStartWith: (groupId?: number | string) => void;
	setHideIndirectSubgroups: (hide: boolean) => void;
	setIncludedGroups: (groups: string | string[]) => void;
	setIsExporting: (isExporting: boolean) => void;
	setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => void;
	setMaxDepth: (depth: number | undefined) => void;

	setPendingExport: (pendingExport: PendingExport | undefined) => void;
	setRenderer: (renderer: RendererType) => void;

	setShowGroupTypes: (show: boolean) => void;
	setShowOnlyDirectChildren: (show: boolean) => void;
	// Display Options
	showGroupTypes: boolean;
	showOnlyDirectChildren: boolean;
}

function snapshotFilters(state: GroupState): CommittedFilters {
	return {
		excludedGroups: state.excludedGroups,
		excludedGroupTypes: state.excludedGroupTypes,
		excludedRoles: state.excludedRoles,
		filteredAgeGroupIds: state.filteredAgeGroupIds,
		filteredCampusIds: state.filteredCampusIds,
		filteredGroupCategoryIds: state.filteredGroupCategoryIds,
		groupIdToStartWith: state.groupIdToStartWith,
		hideIndirectSubgroups: state.hideIndirectSubgroups,
		includedGroupStatuses: state.includedGroupStatuses,
		includedGroups: state.includedGroups,
		layoutAlgorithm: state.layoutAlgorithm,
		maxDepth: state.maxDepth,
		renderer: state.renderer,
		showGroupTypes: state.showGroupTypes,
		showOnlyDirectChildren: state.showOnlyDirectChildren,
	};
}

export const useAppStore = create<GroupState>((set) => ({
	baseUrl: undefined,
	committedFilters: undefined,
	excludedGroups: [] as number[],
	excludedGroupTypes: [] as number[],
	filteredAgeGroupIds: [] as number[],
	filteredCampusIds: [] as number[],
	filteredGroupCategoryIds: [] as number[],
	includedGroupStatuses: [GroupStatus.ACTIVE] as GroupStatus[],
	excludedRoles: [] as number[],

	groupIdToStartWith: undefined,
	hideIndirectSubgroups: false,
	includedGroups: [] as number[],

	isExporting: false,

	layoutAlgorithm: LayoutAlgorithm.elkLayeredTB,
	maxDepth: undefined,

	focusNodeId: undefined,
	pendingExport: undefined,

	renderer: 'webgl' as RendererType,

	commitFilters: () => {
		set((state) => ({ committedFilters: snapshotFilters(state) }));
	},

	setFocusNodeId: (id: string | undefined) => {
		set({ focusNodeId: id });
	},

	setAllSettings: (settings: Partial<UserSettings>) => {
		set((state) => ({ ...state, ...settings }));
	},

	setBaseUrl: (url: string | undefined) => {
		churchtoolsClient.setBaseUrl(url ?? '');
		set({ baseUrl: url });
	},

	setExcludedGroups: (groups: string | string[]) => {
		set({ excludedGroups: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) });
	},

	setIncludedGroupStatuses: (includedGroupStatuses: GroupStatus[]) => {
		set({ includedGroupStatuses });
	},

	setExcludedGroupTypes: (groups: string | string[]) => {
		set({ excludedGroupTypes: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) });
	},

	setFilteredAgeGroupIds: (filteredAgeGroupIds: number[]) => {
		set({ filteredAgeGroupIds });
	},

	setFilteredCampusIds: (filteredCampusIds: number[]) => {
		set({ filteredCampusIds });
	},

	setFilteredGroupCategoryIds: (filteredGroupCategoryIds: number[]) => {
		set({ filteredGroupCategoryIds });
	},

	setExcludedRoles: (roles: string | string[]) => {
		set({ excludedRoles: typeof roles === 'string' ? [Number(roles)] : roles.map(Number) });
	},

	setGroupIdToStartWith: (groupIdToStartWith: number | string | undefined) => {
		set({ groupIdToStartWith: groupIdToStartWith?.toString() });
	},

	setHideIndirectSubgroups: (hideIndirectSubgroups: boolean) => {
		set({ hideIndirectSubgroups });
	},

	setIncludedGroups: (groups: string | string[]) => {
		set({ includedGroups: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) });
	},

	setIsExporting: (isExporting: boolean) => {
		set({ isExporting });
	},

	setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => {
		set({ layoutAlgorithm: algorithm });
	},

	setMaxDepth: (maxDepth: number | undefined) => {
		set({ maxDepth });
	},

	setPendingExport: (pendingExport: PendingExport | undefined) => {
		set({ pendingExport });
	},

	setRenderer: (renderer: RendererType) => {
		set({ renderer });
	},

	setShowGroupTypes: (show: boolean) => {
		set({ showGroupTypes: show });
	},

	setShowOnlyDirectChildren: (showOnlyDirectChildren: boolean) => {
		set({ showOnlyDirectChildren });
	},

	showGroupTypes: true,
	showOnlyDirectChildren: false,
}));
