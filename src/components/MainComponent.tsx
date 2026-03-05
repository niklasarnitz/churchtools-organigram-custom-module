import { Loader2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import { Logger } from '../globals/Logger';
import { useGroupMembers } from '../queries/useGroupMembers';
import { useGroupRoles } from '../queries/useGroupRoles';
import { useGroups } from '../queries/useGroups';
import { useGroupTypes } from '../queries/useGroupTypes';
import { useHierarchies } from '../queries/useHierarchies';
import { usePersonMasterData } from '../queries/usePersonMasterData';
import { usePersons } from '../queries/usePersons';
import { useAppStore } from '../state/useAppStore';
import { GraphView } from './GraphView';
import { Sidebar } from './Sidebar/Sidebar';

export const MainComponent = React.memo(() => {
	// Zustand
	const setExcludedRoles = useAppStore((s) => s.setExcludedRoles);
	const committedFilters = useAppStore((s) => s.committedFilters);

	// Queries - these always load (needed for sidebar filter options)
	const groupsQuery = useGroups();
	const groupTypesQuery = useGroupTypes();
	const groupRolesQuery = useGroupRoles();
	const hierarchiesQuery = useHierarchies();
	const masterDataQuery = usePersonMasterData();

	// Queries - these only load after render is requested
	const groupMembersQuery = useGroupMembers();
	const personsQuery = usePersons();

	const groupRoles = groupRolesQuery.data;
	const hasAppliedDefaultRoles = useRef(false);

	// Base data needed for sidebar
	const isBaseLoading =
		groupsQuery.isLoading ||
		groupTypesQuery.isLoading ||
		groupRolesQuery.isLoading ||
		hierarchiesQuery.isLoading ||
		masterDataQuery.isLoading;

	// Full loading including members/persons (only relevant after render requested)
	const isGraphLoading =
		isBaseLoading ||
		groupMembersQuery.isLoading ||
		personsQuery.isLoading;

	// Always default excluded roles to non-leader roles on page load
	useEffect(() => {
		if (hasAppliedDefaultRoles.current) return;

		if (groupRoles && groupRoles.length > 0) {
			const newExcluded = groupRoles.filter((role) => !role.isLeader).map((role) => String(role.id));
			Logger.log(
				`[MainComponent] Setting default excludedRoles to ${String(newExcluded.length)} items:`,
				newExcluded,
			);
			setExcludedRoles(newExcluded);
			hasAppliedDefaultRoles.current = true;
		} else if (groupRolesQuery.isFetched) {
			hasAppliedDefaultRoles.current = true;
		}
	}, [groupRoles, groupRolesQuery.isFetched, setExcludedRoles]);

	useEffect(() => {
		Logger.log('[MainComponent] MOUNTED');
		return () => {
			Logger.log('[MainComponent] UNMOUNTED');
		};
	}, []);

	const showGraph = !!committedFilters && !isGraphLoading;

	return (
		<div className="flex h-screen w-full flex-col overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50">
			<div className="relative w-full grow">
				{/* Sidebar - always visible */}
				<div className="absolute top-4 left-4 z-10 h-[calc(100%-2rem)] w-80">
					<Sidebar isLoading={isBaseLoading} />
				</div>

				{isGraphLoading ? (
					<div className="flex size-full items-center justify-center">
						<div className="flex flex-col items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
							<Loader2 className="size-8 animate-spin text-blue-600" />
							<span>Organigramm wird vorbereitet...</span>
						</div>
					</div>
				) : showGraph ? (
					<GraphView />
				) : null}
			</div>
		</div>
	);
});
