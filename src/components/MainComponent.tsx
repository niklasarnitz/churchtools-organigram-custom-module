import { GraphView } from './GraphView';
import { Loader2 } from 'lucide-react';
import { TopBar } from './TopBar';
import { useAppStore } from '../state/useAppStore';
import { useGroupRoles } from '../queries/useGroupRoles';
import { useGroupTypes } from '../queries/useGroupTypes';
import { useGroups } from '../queries/useGroups';
import { useHierarchies } from '../queries/useHierarchies';
import { usePersons } from '../queries/usePersons';
import React, { useEffect } from 'react';

export const MainComponent = React.memo(() => {
    // Zustand
    const excludedRoles = useAppStore((s) => s.excludedRoles);
    const setExcludedRoles = useAppStore((s) => s.setExcludedRoles);

    // Queries
    const { isLoading: isGroupsLoading } = useGroups();
    const { isLoading: isGroupTypesLoading } = useGroupTypes();
    const { data: groupRoles, isLoading: isGroupRolesLoading } = useGroupRoles();
    const { isLoading: isHierarchiesLoading } = useHierarchies();
    const { isLoading: isPersonsLoading } = usePersons();

    // Helper values
    const isLoading =
        isGroupsLoading ||
        isGroupTypesLoading ||
        isGroupRolesLoading ||
        isHierarchiesLoading ||
        isPersonsLoading;

    // Effects
    useEffect(() => {
        if (groupRoles && groupRoles.length > 0 && excludedRoles.length === 0) {
            setExcludedRoles(
                groupRoles
                    .filter((role) => !role.isLeader)
                    .map((role) => String(role.id)),
            );
        }
    }, [groupRoles, excludedRoles.length, setExcludedRoles]);

    return (
        <div className="flex h-screen flex-col overflow-hidden p-4">
            <TopBar />
            <div className="relative w-full grow">
                {isLoading ? (
                    <div className="flex size-full items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
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
