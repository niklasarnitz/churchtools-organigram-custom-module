import { churchtoolsClient } from '@churchtools/churchtools-client';
import { create } from 'zustand';

import type { UserSettings } from '../hooks/useUserSettings';

import { GroupStatus } from '../types/GroupStatus';
import { LayoutAlgorithm } from '../types/LayoutAlgorithm';
import { type RendererType } from '../types/RendererType';

export interface CommittedFilters {
	excludedGroups: number[];
	excludedGroupTypes: number[];
	excludedRoles: number[];
	filteredAgeGroupIds: number[];
	filteredCampusIds: number[];
	filteredGroupCategoryIds: number[];
	groupIdToStartWith: string | undefined;
	hideIndirectSubgroups: boolean;
	includedGroups: number[];
	includedGroupStatuses: GroupStatus[];
	layoutAlgorithm: LayoutAlgorithm;
	maxDepth: number | undefined;
	renderer: RendererType;
	showGroupTypes: boolean;
	showOnlyDirectChildren: boolean;
	showParentGroups: boolean;
}

export interface PendingExport {
	fileName: string;
	type: 'graphml' | 'svg';
}

interface GroupState {
	baseUrl: string | undefined;
	commitFilters: () => void;
	committedFilters: CommittedFilters | undefined;
	excludedGroups: number[];
	excludedGroupTypes: number[];
	excludedRoles: number[];
	filteredAgeGroupIds: number[];
	filteredCampusIds: number[];
	filteredGroupCategoryIds: number[];

	focusNodeId: string | undefined;
	groupIdToStartWith: string | undefined;
	hideIndirectSubgroups: boolean;
	includedGroups: number[];
	includedGroupStatuses: GroupStatus[];
	isExporting: boolean;
	isSidebarOpen: boolean;

	layoutAlgorithm: LayoutAlgorithm;
	maxDepth: number | undefined;
	pendingExport: PendingExport | undefined;

	renderer: RendererType;
	setAllSettings: (settings: Partial<UserSettings>) => void;
	setBaseUrl: (url: string | undefined) => void;
	setExcludedGroups: (groups: string | string[]) => void;
	setExcludedGroupTypes: (groups: string | string[]) => void;
	setExcludedRoles: (roles: string | string[]) => void;
	setFilteredAgeGroupIds: (ids: number[]) => void;
	setFilteredCampusIds: (ids: number[]) => void;
	setFilteredGroupCategoryIds: (ids: number[]) => void;
	setFocusNodeId: (id: string | undefined) => void;

	setGroupIdToStartWith: (groupId?: number | string) => void;

	setHideIndirectSubgroups: (hide: boolean) => void;
	setIncludedGroups: (groups: string | string[]) => void;
	setIncludedGroupStatuses: (statuses: GroupStatus[]) => void;
	setIsExporting: (isExporting: boolean) => void;
	setIsSidebarOpen: (isOpen: boolean) => void;
	setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => void;
	setMaxDepth: (depth: number | undefined) => void;

	setPendingExport: (pendingExport: PendingExport | undefined) => void;
	setRenderer: (renderer: RendererType) => void;

	setShowGroupTypes: (show: boolean) => void;
	setShowOnlyDirectChildren: (show: boolean) => void;
	setShowParentGroups: (show: boolean) => void;
	// Display Options
	showGroupTypes: boolean;
	showOnlyDirectChildren: boolean;
	showParentGroups: boolean;
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
		includedGroups: state.includedGroups,
		includedGroupStatuses: state.includedGroupStatuses,
		layoutAlgorithm: state.layoutAlgorithm,
		maxDepth: state.maxDepth,
		renderer: state.renderer,
		showGroupTypes: state.showGroupTypes,
		showOnlyDirectChildren: state.showOnlyDirectChildren,
		showParentGroups: state.showParentGroups,
	};
}

export const useAppStore = create<GroupState>((set) => {
	const setAndCommit = (updates: Partial<GroupState>) => {
		set((state) => {
			const newState = { ...state, ...updates };
			return { ...updates, committedFilters: snapshotFilters(newState as GroupState) };
		});
	};

	return {
		baseUrl: undefined,
		commitFilters: () => {
			set((state) => ({ committedFilters: snapshotFilters(state) }));
		},
		committedFilters: undefined,
		excludedGroups: [] as number[],
		excludedGroupTypes: [] as number[],
		excludedRoles: [] as number[],
		filteredAgeGroupIds: [] as number[],
		filteredCampusIds: [] as number[],
		filteredGroupCategoryIds: [] as number[],

		focusNodeId: undefined,
		groupIdToStartWith: undefined,
		hideIndirectSubgroups: false,

		includedGroups: [] as number[],

		includedGroupStatuses: [GroupStatus.ACTIVE] as GroupStatus[],
		isExporting: false,
		isSidebarOpen: true,

		layoutAlgorithm: LayoutAlgorithm.elkLayeredTB,
		maxDepth: undefined,

		pendingExport: undefined,

		renderer: 'webgl' as RendererType,

		setAllSettings: (settings: Partial<UserSettings>) => {
			setAndCommit(settings);
		},

		setBaseUrl: (url: string | undefined) => {
			churchtoolsClient.setBaseUrl(url ?? '');
			set({ baseUrl: url });
		},

		setExcludedGroups: (groups: string | string[]) => {
			setAndCommit({ excludedGroups: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) });
		},

		setExcludedGroupTypes: (groups: string | string[]) => {
			setAndCommit({ excludedGroupTypes: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) });
		},

		setExcludedRoles: (roles: string | string[]) => {
			setAndCommit({ excludedRoles: typeof roles === 'string' ? [Number(roles)] : roles.map(Number) });
		},

		setFilteredAgeGroupIds: (filteredAgeGroupIds: number[]) => {
			setAndCommit({ filteredAgeGroupIds });
		},

		setFilteredCampusIds: (filteredCampusIds: number[]) => {
			setAndCommit({ filteredCampusIds });
		},

		setFilteredGroupCategoryIds: (filteredGroupCategoryIds: number[]) => {
			setAndCommit({ filteredGroupCategoryIds });
		},

		setFocusNodeId: (id: string | undefined) => {
			set({ focusNodeId: id });
		},

		setGroupIdToStartWith: (groupIdToStartWith: number | string | undefined) => {
			setAndCommit({ groupIdToStartWith: groupIdToStartWith?.toString() });
		},

		setHideIndirectSubgroups: (hideIndirectSubgroups: boolean) => {
			setAndCommit({ hideIndirectSubgroups });
		},

		setIncludedGroups: (groups: string | string[]) => {
			setAndCommit({ includedGroups: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) });
		},

		setIncludedGroupStatuses: (includedGroupStatuses: GroupStatus[]) => {
			setAndCommit({ includedGroupStatuses });
		},

		setIsExporting: (isExporting: boolean) => {
			set({ isExporting });
		},

		setIsSidebarOpen: (isSidebarOpen: boolean) => {
			set({ isSidebarOpen });
		},

		setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => {
			setAndCommit({ layoutAlgorithm: algorithm });
		},

		setMaxDepth: (maxDepth: number | undefined) => {
			setAndCommit({ maxDepth });
		},

		setPendingExport: (pendingExport: PendingExport | undefined) => {
			set({ pendingExport });
		},

		setRenderer: (renderer: RendererType) => {
			setAndCommit({ renderer });
		},

		setShowGroupTypes: (show: boolean) => {
			setAndCommit({ showGroupTypes: show });
		},

		setShowOnlyDirectChildren: (showOnlyDirectChildren: boolean) => {
			setAndCommit({ showOnlyDirectChildren });
		},

		setShowParentGroups: (showParentGroups: boolean) => {
			setAndCommit({ showParentGroups });
		},

		showGroupTypes: true,
		showOnlyDirectChildren: false,
		showParentGroups: false,
	};
});
