import { churchtoolsClient } from '@churchtools/churchtools-client';
import { create } from 'zustand';

import { LayoutAlgorithm } from '../types/LayoutAlgorithm';

interface GroupState {
    baseUrl: string | undefined;
    excludedGroups: number[];

    excludedGroupTypes: number[];
    excludedRoles: number[];

    groupIdToStartWith: string | undefined;
    layoutAlgorithm: LayoutAlgorithm;

    setBaseUrl: (url: string | undefined) => void;
    setExcludedGroups: (groups: string | string[]) => void;

    setExcludedGroupTypes: (groups: string | string[]) => void;
    setExcludedRoles: (roles: string | string[]) => void;

    setGroupIdToStartWith: (groupId?: number | string  ) => void;
    setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => void;

    setShowGroupTypes: (show: boolean) => void;
    // Display Options
    showGroupTypes: boolean;
}

export const useAppStore = create<GroupState>((set) => ({
    baseUrl: undefined,
    excludedGroups: [] as number[],
    excludedGroupTypes: [] as number[],

    excludedRoles: [] as number[],

    groupIdToStartWith: undefined,

    layoutAlgorithm: LayoutAlgorithm.dagre,

    setBaseUrl: (url: string | undefined) => {
        churchtoolsClient.setBaseUrl(url ?? '');
        set({ baseUrl: url });
    },

    setExcludedGroups: (groups: string | string[]) =>
        { set({ excludedGroups: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) }); },
    setExcludedGroupTypes: (groups: string | string[]) =>
        { set({ excludedGroupTypes: typeof groups === 'string' ? [Number(groups)] : groups.map(Number) }); },
    setExcludedRoles: (roles: string | string[]) =>
        { set({ excludedRoles: typeof roles === 'string' ? [Number(roles)] : roles.map(Number) }); },
    setGroupIdToStartWith: (groupIdToStartWith: number | string | undefined) =>
        { set({ groupIdToStartWith: groupIdToStartWith?.toString() }); },
    setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => { set({ layoutAlgorithm: algorithm }); },

    setShowGroupTypes: (show: boolean) => { set({ showGroupTypes: show }); },
    showGroupTypes: false,
}));
