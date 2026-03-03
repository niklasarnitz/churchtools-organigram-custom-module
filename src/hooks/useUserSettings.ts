import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LayoutAlgorithm } from '../types/LayoutAlgorithm';

import { getUserSettings, saveUserSettings } from '../helpers/kvStore';

export interface UserSettings {
	excludedGroups: number[];
	excludedGroupTypes: number[];
	excludedRoles: number[];
	groupIdToStartWith: string | undefined;
	layoutAlgorithm: LayoutAlgorithm;
	showGroupTypes: boolean;
}

const SETTINGS_KEY = 'userSettings';
const CATEGORY_SHORTY = 'settings';
const CATEGORY_NAME = 'User Settings';

export const useUserSettings = () => {
	const queryClient = useQueryClient();

	const { data: settings, isLoading } = useQuery({
		queryFn: () => getUserSettings<UserSettings>(CATEGORY_SHORTY, CATEGORY_NAME),
		queryKey: [SETTINGS_KEY],
	});

	const mutation = useMutation({
		mutationFn: (newSettings: UserSettings) => saveUserSettings(CATEGORY_SHORTY, CATEGORY_NAME, newSettings),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] });
		},
	});

	return {
		isLoading,
		saveSettings: mutation.mutate,
		settings,
	};
};
