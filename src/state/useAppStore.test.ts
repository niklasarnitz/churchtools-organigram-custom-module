import { expect, test } from 'bun:test';

import { LayoutAlgorithm } from '../types/LayoutAlgorithm';
import { createAppStore } from './useAppStore';

function memoryStorage(initial: null | string = null) {
	let value = initial;
	return {
		getItem: () => value,
		removeItem: () => {
			value = null;
		},
		setItem: (_name: string, next: string) => {
			value = next;
		},
	};
}

test('reload restores display settings and camera, but not transient operations', () => {
	const storage = memoryStorage();
	const first = createAppStore(storage);
	const actions = first.getState();
	actions.setLayoutAlgorithm(LayoutAlgorithm.FLAT_RADIAL);
	actions.setSunburstColorMode('group');
	actions.setRadialRingDistance(510);
	actions.setGroupIdToStartWith(42);
	actions.setShowParentGroups(true);
	actions.setShowOnlyDirectChildren(true);
	actions.setHideIndirectSubgroups(true);
	actions.setShowGroupTypes(false);
	actions.setShowLeaders(false);
	actions.setMaxDepth(4);
	actions.setExcludedRoles([]);
	actions.setExcludedGroups(['9']);
	actions.setFilteredCampusIds([2]);
	actions.setCollapsedNodeIds(['43']);
	actions.setSelectedPresetName('Älteste');
	actions.setIsSidebarOpen(false);
	actions.setCamera({ x: 125, y: -80, zoom: 1.7 });
	actions.beginLayoutCalculation();
	actions.setIsExporting(true);
	actions.setFocusNodeId('44');
	actions.setPendingExport({ fileName: 'test', type: 'svg' });

	const restored = createAppStore(storage).getState();
	expect(restored.committedFilters).toEqual(first.getState().committedFilters);
	expect(restored.layoutAlgorithm).toBe(LayoutAlgorithm.FLAT_RADIAL);
	expect(restored.sunburstColorMode).toBe('group');
	expect(restored.radialRingDistance).toBe(510);
	expect(restored.camera).toEqual({ x: 125, y: -80, zoom: 1.7 });
	expect(restored.collapsedNodeIds).toEqual(['43']);
	expect(restored.isSidebarOpen).toBe(false);
	expect(restored.selectedPresetName).toBe('Älteste');
	expect(restored.roleFiltersInitialized).toBe(true);
	expect(restored.excludedRoles).toEqual([]);
	expect(restored.isExporting).toBe(false);
	expect(restored.isLayoutCalculating).toBe(false);
	expect(restored.pendingExport).toBeUndefined();
	expect(restored.focusNodeId).toBeUndefined();
	expect(restored.baseUrl).toBeUndefined();
});

test('changing filters invalidates the previous camera and cleared values survive reload', () => {
	const storage = memoryStorage();
	const first = createAppStore(storage);
	first.getState().setGroupIdToStartWith(42);
	first.getState().setMaxDepth(3);
	first.getState().setCamera({ x: 12, y: 40, zoom: 2 });
	first.getState().setGroupIdToStartWith(undefined);
	first.getState().setMaxDepth(undefined);
	const restored = createAppStore(storage);
	expect(restored.getState().camera).toBeUndefined();
	expect(restored.getState().groupIdToStartWith).toBeUndefined();
	expect(restored.getState().committedFilters?.maxDepth).toBeUndefined();
	restored.getState().setShowParentGroups(true);
	expect(restored.getState().committedFilters?.showParentGroups).toBe(true);
});

test('switching every Sunburst color mode preserves zoom and position, including after reload', () => {
	const storage = memoryStorage();
	const store = createAppStore(storage);
	store.getState().setLayoutAlgorithm(LayoutAlgorithm.SUNBURST);
	const camera = { x: 137, y: -92, zoom: 2.3 };
	store.getState().setCamera(camera);

	for (const mode of ['group', 'groupType', 'segment'] as const) {
		store.getState().setSunburstColorMode(mode);
		expect(store.getState().committedFilters?.sunburstColorMode).toBe(mode);
		expect(store.getState().camera).toEqual(camera);
		const restored = createAppStore(storage).getState();
		expect(restored.camera).toEqual(camera);
		expect(restored.committedFilters?.sunburstColorMode).toBe(mode);
	}
});

test('missing or malformed storage leaves the initial view usable', () => {
	for (const initial of [null, '{broken json']) {
		const store = createAppStore(memoryStorage(initial));
		expect(store.getState().roleFiltersInitialized).toBe(false);
		expect(store.getState().layoutAlgorithm).toBe(LayoutAlgorithm.elkLayeredTB);
		store.getState().setSunburstColorMode('group');
		expect(store.getState().committedFilters?.sunburstColorMode).toBe('group');
	}
});
