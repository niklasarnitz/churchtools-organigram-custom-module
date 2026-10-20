import { afterEach, expect, test } from 'bun:test';
import { createJSONStorage } from 'zustand/middleware';

import { LayoutAlgorithm } from '../types/LayoutAlgorithm';
import { useAppStore } from './useAppStore';

const initial = useAppStore.getState();
let saved: null | string = null;
useAppStore.persist.setOptions({
	storage: createJSONStorage(() => ({
		getItem: () => saved,
		removeItem: () => {
			saved = null;
		},
		setItem: (_key, value) => {
			saved = value;
		},
	})),
});

afterEach(() => {
	useAppStore.setState(initial, true);
	saved = null;
});

test('reload restores only the view, including an intentionally empty role filter', async () => {
	const state = useAppStore.getState();
	state.setAllSettings({
		excludedRoles: [],
		groupIdToStartWith: '42',
		layoutAlgorithm: LayoutAlgorithm.SUNBURST,
		sunburstColorMode: 'group',
	});
	state.setRadialRingDistance(470);
	state.setCollapsedNodeIds(['43', '45']);
	state.setIsSidebarOpen(false);
	state.setSelectedPresetName('Team 2');
	state.setCamera({ x: 123, y: -47, zoom: 0.73 });
	state.setIsExporting(true);
	state.beginLayoutCalculation();
	const stored = saved;
	state.endLayoutCalculation();
	expect(stored).not.toContain('isExporting');
	expect(stored).not.toContain('isLayoutCalculating');
	expect(stored).not.toContain('baseUrl');
	expect(stored).not.toContain('pendingExport');
	useAppStore.setState(initial, true);
	saved = stored;
	await useAppStore.persist.rehydrate();
	expect(useAppStore.getState()).toMatchObject({
		camera: { x: 123, y: -47, zoom: 0.73 },
		collapsedNodeIds: ['43', '45'],
		committedFilters: {
			excludedRoles: [],
			groupIdToStartWith: '42',
			layoutAlgorithm: LayoutAlgorithm.SUNBURST,
			sunburstColorMode: 'group',
		},
		hasSavedView: true,
		isExporting: false,
		isLayoutCalculating: false,
		isSidebarOpen: false,
		radialRingDistance: 470,
		roleFiltersInitialized: true,
		selectedPresetName: 'Team 2',
	});
});

test('a new tab or malformed saved view keeps defaults and permits role initialization', async () => {
	await useAppStore.persist.rehydrate();
	expect(useAppStore.getState().hasSavedView).toBe(false);
	expect(useAppStore.getState().roleFiltersInitialized).toBe(false);
	saved = 'not json';
	await useAppStore.persist.rehydrate();
	expect(useAppStore.getState().layoutAlgorithm).toBe(LayoutAlgorithm.elkLayeredTB);
	expect(useAppStore.getState().camera).toBeUndefined();
});
