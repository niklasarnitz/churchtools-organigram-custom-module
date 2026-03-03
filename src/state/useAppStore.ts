import { churchtoolsClient } from '@churchtools/churchtools-client';
import { create } from 'zustand';

import type { UserSettings } from '../hooks/useUserSettings';

import { LayoutAlgorithm } from '../types/LayoutAlgorithm';

export interface PendingExport {
	fileName: string;
	type: 'graphml' | 'svg';
}

interface GroupState {
	baseUrl: string | undefined;
	excludedGroups: number[];
	excludedGroupTypes: number[];
	excludedRoles: number[];

	groupIdToStartWith: string | undefined;
	hideIndirectSubgroups: boolean;
	includedGroups: number[];
	isExporting: boolean;
	layoutAlgorithm: LayoutAlgorithm;
	maxDepth: number | undefined;

	pendingExport: PendingExport | undefined;

	setAllSettings: (settings: Partial<UserSettings>) => void;
	setBaseUrl: (url: string | undefined) => void;
	setExcludedGroups: (groups: string | string[]) => void;
	setExcludedGroupTypes: (groups: string | string[]) => void;

	setExcludedRoles: (roles: string | string[]) => void;

	setGroupIdToStartWith: (groupId?: number | string) => void;
	setHideIndirectSubgroups: (hide: boolean) => void;
	setIncludedGroups: (groups: string | string[]) => void;
	setIsExporting: (isExporting: boolean) => void;
	setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => void;
	setMaxDepth: (depth: number | undefined) => void;

	setPendingExport: (pendingExport: PendingExport | undefined) => void;

	setShowGroupTypes: (show: boolean) => void;
	setShowOnlyDirectChildren: (show: boolean) => void;
	// Display Options
	showGroupTypes: boolean;
	showOnlyDirectChildren: boolean;
}

export const useAppStore = create<GroupState>((set) => ({
	baseUrl: undefined,
	excludedGroups: [] as number[],
	excludedGroupTypes: [] as number[],
	excludedRoles: [] as number[],

	groupIdToStartWith: undefined,
	hideIndirectSubgroups: false,
	includedGroups: [] as number[],

	isExporting: false,

	layoutAlgorithm: LayoutAlgorithm.elkLayeredTB,
	maxDepth: undefined,

	pendingExport: undefined,

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

	setExcludedGroupTypes: (groups: string | string[]) => {
		set({ excludedGroupTypes: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) });
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

	setShowGroupTypes: (show: boolean) => {
		set({ showGroupTypes: show });
	},

	setShowOnlyDirectChildren: (showOnlyDirectChildren: boolean) => {
		set({ showOnlyDirectChildren });
	},

	showGroupTypes: true,
	showOnlyDirectChildren: false,
}));
