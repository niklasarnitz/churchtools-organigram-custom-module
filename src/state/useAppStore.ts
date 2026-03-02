import { churchtoolsClient } from '@churchtools/churchtools-client';
import { create } from 'zustand';
import { LayoutAlgorithm } from '../types/LayoutAlgorithm';
import type { Person } from '../types/Person';

type GroupState = {
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
};

export const useAppStore = create<GroupState>((set, get) => ({
    isLoading: false,
    persons: [] as Person[],

    excludedRoles: [] as number[],
    excludedGroupTypes: [] as number[],
    excludedGroups: [] as number[],

    showGroupTypes: false,

    groupIdToStartWith: undefined,

    layoutAlgorithm: LayoutAlgorithm.dagre,

    baseUrl: undefined,

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
