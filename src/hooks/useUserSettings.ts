import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { GroupStatus } from '../types/GroupStatus';
import type { LayoutAlgorithm } from '../types/LayoutAlgorithm';

import { getUserSettings, saveUserSettings } from '../helpers/kvStore';

export interface UserSettings {
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
	showGroupTypes: boolean;
	showOnlyDirectChildren: boolean;
}

export interface Preset {
	name: string;
	settings: UserSettings;
}

interface PresetStorage {
	presets: Preset[];
}

const SETTINGS_KEY = 'presets';
const CATEGORY_SHORTY = 'presets';
const CATEGORY_NAME = 'Presets';

export const usePresets = () => {
	const queryClient = useQueryClient();

	const { data: storage, isLoading } = useQuery({
		queryFn: () => getUserSettings<PresetStorage>(CATEGORY_SHORTY, CATEGORY_NAME),
		queryKey: [SETTINGS_KEY],
	});

	const mutation = useMutation({
		mutationFn: (presets: Preset[]) => saveUserSettings(CATEGORY_SHORTY, CATEGORY_NAME, { presets }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] });
		},
	});

	return {
		isLoading,
		presets: storage?.presets ?? [],
		savePresets: mutation.mutate,
	};
};
