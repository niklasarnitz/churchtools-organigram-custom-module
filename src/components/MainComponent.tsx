import { Loader2 } from 'lucide-react';
import React, { useEffect } from 'react';

import { Logger } from '../globals/Logger';
import { useGroupRoles } from '../queries/useGroupRoles';
import { useGroups } from '../queries/useGroups';
import { useGroupTypes } from '../queries/useGroupTypes';
import { useHierarchies } from '../queries/useHierarchies';
import { usePersons } from '../queries/usePersons';
import { useAppStore } from '../state/useAppStore';
import { GraphView } from './GraphView';
import { TopBar } from './TopBar';

export const MainComponent = React.memo(() => {
    // Zustand
    const excludedRoles = useAppStore((s) => s.excludedRoles);
    const setExcludedRoles = useAppStore((s) => s.setExcludedRoles);

    // Queries
    const groupsQuery = useGroups();
    const groupTypesQuery = useGroupTypes();
    const groupRolesQuery = useGroupRoles();
    const hierarchiesQuery = useHierarchies();
    const personsQuery = usePersons();

    const groupRoles = groupRolesQuery.data;

    // Helper values
    const isLoading =
        groupsQuery.isLoading ||
        groupTypesQuery.isLoading ||
        groupRolesQuery.isLoading ||
        hierarchiesQuery.isLoading ||
        personsQuery.isLoading;

    Logger.log(`[MainComponent] render | isLoading=${String(isLoading)}`, {
        groups: { dataUpdatedAt: groupsQuery.dataUpdatedAt, error: groupsQuery.error?.message, fetchStatus: groupsQuery.fetchStatus, isError: groupsQuery.isError, isLoading: groupsQuery.isLoading, isPending: groupsQuery.isPending, status: groupsQuery.status },
        hierarchies: { dataUpdatedAt: hierarchiesQuery.dataUpdatedAt, error: hierarchiesQuery.error?.message, fetchStatus: hierarchiesQuery.fetchStatus, isError: hierarchiesQuery.isError, isLoading: hierarchiesQuery.isLoading, isPending: hierarchiesQuery.isPending, status: hierarchiesQuery.status },
        persons: { dataUpdatedAt: personsQuery.dataUpdatedAt, error: personsQuery.error?.message, fetchStatus: personsQuery.fetchStatus, isError: personsQuery.isError, isLoading: personsQuery.isLoading, isPending: personsQuery.isPending, status: personsQuery.status },
        roles: { dataUpdatedAt: groupRolesQuery.dataUpdatedAt, error: groupRolesQuery.error?.message, fetchStatus: groupRolesQuery.fetchStatus, isError: groupRolesQuery.isError, isLoading: groupRolesQuery.isLoading, isPending: groupRolesQuery.isPending, status: groupRolesQuery.status },
        types: { dataUpdatedAt: groupTypesQuery.dataUpdatedAt, error: groupTypesQuery.error?.message, fetchStatus: groupTypesQuery.fetchStatus, isError: groupTypesQuery.isError, isLoading: groupTypesQuery.isLoading, isPending: groupTypesQuery.isPending, status: groupTypesQuery.status },
    });

    // Effects
    useEffect(() => {
        Logger.log(`[MainComponent] setExcludedRoles effect fired | groupRoles?.length=${String(groupRoles?.length)} | excludedRoles.length=${String(excludedRoles.length)}`);
        if (groupRoles && groupRoles.length > 0 && excludedRoles.length === 0) {
            const newExcluded = groupRoles
                .filter((role) => !role.isLeader)
                .map((role) => String(role.id));
            Logger.log(`[MainComponent] Setting excludedRoles to ${String(newExcluded.length)} items:`, newExcluded);
            setExcludedRoles(newExcluded);
        }
    }, [groupRoles, excludedRoles.length, setExcludedRoles]);

    useEffect(() => {
        Logger.log('[MainComponent] MOUNTED');
        return () => { Logger.log('[MainComponent] UNMOUNTED'); };
    }, []);

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-white p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
            <TopBar />
            <div className="relative w-full grow">
                {isLoading ? (
                    <div className="flex size-full items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Loader2 className="size-4 animate-spin" />
                            Daten werden geladen.
                        </div>
                    </div>
                ) : (
                    <GraphView isLoading={isLoading} />
                )}
            </div>
        </div>
    );
});
