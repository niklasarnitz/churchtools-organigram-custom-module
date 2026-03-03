import { GraphView } from './GraphView';
import { Loader2 } from 'lucide-react';
import { Logger } from '../globals/Logger';
import { TopBar } from './TopBar';
import { useAppStore } from '../state/useAppStore';
import { useGroupRoles } from '../queries/useGroupRoles';
import { useGroupTypes } from '../queries/useGroupTypes';
import { useGroups } from '../queries/useGroups';
import { useHierarchies } from '../queries/useHierarchies';
import { usePersons } from '../queries/usePersons';
import React, { useEffect, useRef } from 'react';

export const MainComponent = React.memo(() => {
    const renderCount = useRef(0);
    renderCount.current++;

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

    Logger.log(`[MainComponent] render #${renderCount.current} | isLoading=${isLoading}`, {
        groups: { isLoading: groupsQuery.isLoading, isPending: groupsQuery.isPending, isError: groupsQuery.isError, error: groupsQuery.error?.message, status: groupsQuery.status, fetchStatus: groupsQuery.fetchStatus, dataUpdatedAt: groupsQuery.dataUpdatedAt },
        types: { isLoading: groupTypesQuery.isLoading, isPending: groupTypesQuery.isPending, isError: groupTypesQuery.isError, error: groupTypesQuery.error?.message, status: groupTypesQuery.status, fetchStatus: groupTypesQuery.fetchStatus, dataUpdatedAt: groupTypesQuery.dataUpdatedAt },
        roles: { isLoading: groupRolesQuery.isLoading, isPending: groupRolesQuery.isPending, isError: groupRolesQuery.isError, error: groupRolesQuery.error?.message, status: groupRolesQuery.status, fetchStatus: groupRolesQuery.fetchStatus, dataUpdatedAt: groupRolesQuery.dataUpdatedAt },
        hierarchies: { isLoading: hierarchiesQuery.isLoading, isPending: hierarchiesQuery.isPending, isError: hierarchiesQuery.isError, error: hierarchiesQuery.error?.message, status: hierarchiesQuery.status, fetchStatus: hierarchiesQuery.fetchStatus, dataUpdatedAt: hierarchiesQuery.dataUpdatedAt },
        persons: { isLoading: personsQuery.isLoading, isPending: personsQuery.isPending, isError: personsQuery.isError, error: personsQuery.error?.message, status: personsQuery.status, fetchStatus: personsQuery.fetchStatus, dataUpdatedAt: personsQuery.dataUpdatedAt },
    });

    // Effects
    useEffect(() => {
        Logger.log(`[MainComponent] setExcludedRoles effect fired | groupRoles?.length=${groupRoles?.length} | excludedRoles.length=${excludedRoles.length}`);
        if (groupRoles && groupRoles.length > 0 && excludedRoles.length === 0) {
            const newExcluded = groupRoles
                .filter((role) => !role.isLeader)
                .map((role) => String(role.id));
            Logger.log(`[MainComponent] Setting excludedRoles to ${newExcluded.length} items:`, newExcluded);
            setExcludedRoles(newExcluded);
        }
    }, [groupRoles, excludedRoles.length, setExcludedRoles]);

    useEffect(() => {
        Logger.log('[MainComponent] MOUNTED');
        return () => Logger.log('[MainComponent] UNMOUNTED');
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
