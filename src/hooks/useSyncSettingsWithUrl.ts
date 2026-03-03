import { useEffect } from 'react';

import { useAppStore } from '../state/useAppStore';
import { LayoutAlgorithm } from '../types/LayoutAlgorithm';

const PARAM_START_GROUP = 'start';
const PARAM_LAYOUT = 'layout';
const PARAM_EXCLUDED_GROUPS = 'excludedGroups';
const PARAM_INCLUDED_GROUPS = 'includedGroups';
const PARAM_EXCLUDED_GROUP_TYPES = 'excludedGroupTypes';
const PARAM_EXCLUDED_ROLES = 'excludedRoles';
const PARAM_SHOW_GROUP_TYPES = 'showGroupTypes';
const PARAM_MAX_DEPTH = 'maxDepth';
const PARAM_DIRECT_CHILDREN = 'directChildren';
const PARAM_HIDE_INDIRECT = 'hideIndirect';

export const useSyncSettingsWithUrl = () => {
	const {
		excludedGroups,
		excludedGroupTypes,
		excludedRoles,
		groupIdToStartWith,
		hideIndirectSubgroups,
		includedGroups,
		layoutAlgorithm,
		maxDepth,
		setExcludedGroups,
		setExcludedGroupTypes,
		setExcludedRoles,
		setGroupIdToStartWith,
		setHideIndirectSubgroups,
		setIncludedGroups,
		setLayoutAlgorithm,
		setMaxDepth,
		setShowGroupTypes,
		setShowOnlyDirectChildren,
		showGroupTypes,
		showOnlyDirectChildren,
	} = useAppStore();

	// Initial load from URL
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);

		const start = params.get(PARAM_START_GROUP);
		if (start) setGroupIdToStartWith(start);

		const layout = params.get(PARAM_LAYOUT);
		if (layout && Object.values(LayoutAlgorithm).includes(layout as LayoutAlgorithm)) {
			setLayoutAlgorithm(layout as LayoutAlgorithm);
		}

		const exGroups = params.get(PARAM_EXCLUDED_GROUPS);
		if (exGroups) setExcludedGroups(exGroups.split(','));

		const inGroups = params.get(PARAM_INCLUDED_GROUPS);
		if (inGroups) setIncludedGroups(inGroups.split(','));

		const exTypes = params.get(PARAM_EXCLUDED_GROUP_TYPES);
		if (exTypes) setExcludedGroupTypes(exTypes.split(','));

		const exRoles = params.get(PARAM_EXCLUDED_ROLES);
		if (exRoles) setExcludedRoles(exRoles.split(','));

		const showTypes = params.get(PARAM_SHOW_GROUP_TYPES);
		if (showTypes !== null) setShowGroupTypes(showTypes === 'true');

		const depth = params.get(PARAM_MAX_DEPTH);
		if (depth) setMaxDepth(parseInt(depth, 10));

		const direct = params.get(PARAM_DIRECT_CHILDREN);
		if (direct !== null) setShowOnlyDirectChildren(direct === 'true');

		const indirect = params.get(PARAM_HIDE_INDIRECT);
		if (indirect !== null) setHideIndirectSubgroups(indirect === 'true');
	}, [
		setExcludedGroupTypes,
		setExcludedGroups,
		setExcludedRoles,
		setGroupIdToStartWith,
		setHideIndirectSubgroups,
		setIncludedGroups,
		setLayoutAlgorithm,
		setMaxDepth,
		setShowGroupTypes,
		setShowOnlyDirectChildren,
	]);

	// Update URL when state changes
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);

		if (groupIdToStartWith) params.set(PARAM_START_GROUP, groupIdToStartWith);
		else params.delete(PARAM_START_GROUP);

		params.set(PARAM_LAYOUT, layoutAlgorithm);

		if (excludedGroups.length > 0) params.set(PARAM_EXCLUDED_GROUPS, excludedGroups.join(','));
		else params.delete(PARAM_EXCLUDED_GROUPS);

		if (includedGroups.length > 0) params.set(PARAM_INCLUDED_GROUPS, includedGroups.join(','));
		else params.delete(PARAM_INCLUDED_GROUPS);

		if (excludedGroupTypes.length > 0) params.set(PARAM_EXCLUDED_GROUP_TYPES, excludedGroupTypes.join(','));
		else params.delete(PARAM_EXCLUDED_GROUP_TYPES);

		if (excludedRoles.length > 0) params.set(PARAM_EXCLUDED_ROLES, excludedRoles.join(','));
		else params.delete(PARAM_EXCLUDED_ROLES);

		params.set(PARAM_SHOW_GROUP_TYPES, showGroupTypes.toString());

		if (maxDepth !== undefined) params.set(PARAM_MAX_DEPTH, maxDepth.toString());
		else params.delete(PARAM_MAX_DEPTH);

		params.set(PARAM_DIRECT_CHILDREN, showOnlyDirectChildren.toString());
		params.set(PARAM_HIDE_INDIRECT, hideIndirectSubgroups.toString());

		const newUrl = `${window.location.pathname}?${params.toString()}`;
		window.history.replaceState({}, '', newUrl);
	}, [
		groupIdToStartWith,
		layoutAlgorithm,
		excludedGroups,
		includedGroups,
		excludedGroupTypes,
		excludedRoles,
		showGroupTypes,
		maxDepth,
		showOnlyDirectChildren,
		hideIndirectSubgroups,
	]);
};
