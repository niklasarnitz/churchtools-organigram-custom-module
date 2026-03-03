import { Loader2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import { Logger } from '../globals/Logger';
import { useUserSettings } from '../hooks/useUserSettings';
import { useGroupMembers } from '../queries/useGroupMembers';
import { useGroupRoles } from '../queries/useGroupRoles';
import { useGroups } from '../queries/useGroups';
import { useGroupTypes } from '../queries/useGroupTypes';
import { useHierarchies } from '../queries/useHierarchies';
import { usePersons } from '../queries/usePersons';
import { useAppStore } from '../state/useAppStore';
import { FloatingHeader } from './FloatingHeader';
import { GraphView } from './GraphView';

export const MainComponent = React.memo(() => {
    // Zustand
    const excludedRoles = useAppStore((s) => s.excludedRoles);
    const setExcludedRoles = useAppStore((s) => s.setExcludedRoles);
    const excludedGroups = useAppStore((s) => s.excludedGroups);
    const excludedGroupTypes = useAppStore((s) => s.excludedGroupTypes);
    const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
    const layoutAlgorithm = useAppStore((s) => s.layoutAlgorithm);
    const showGroupTypes = useAppStore((s) => s.showGroupTypes);
    const setAllSettings = useAppStore((s) => s.setAllSettings);

    // Queries
    const groupsQuery = useGroups();
    const groupTypesQuery = useGroupTypes();
    const groupRolesQuery = useGroupRoles();
    const groupMembersQuery = useGroupMembers();
    const hierarchiesQuery = useHierarchies();
    const personsQuery = usePersons();
    const { isLoading: isSettingsLoading, saveSettings, settings: persistedSettings } = useUserSettings();

    const groupRoles = groupRolesQuery.data;
    const isInitialLoad = useRef(true);

    // Helper values
    const isLoading =
        groupsQuery.isLoading ||
        groupTypesQuery.isLoading ||
        groupRolesQuery.isLoading ||
        groupMembersQuery.isLoading ||
        hierarchiesQuery.isLoading ||
        personsQuery.isLoading ||
        isSettingsLoading;

    // Apply persisted settings once they are loaded
    useEffect(() => {
        if (persistedSettings && isInitialLoad.current) {
            Logger.log('[MainComponent] Applying persisted settings', persistedSettings);
            setAllSettings(persistedSettings);
            isInitialLoad.current = false;
        } else if (!isSettingsLoading) {
            isInitialLoad.current = false;
        }
    }, [persistedSettings, isSettingsLoading, setAllSettings]);

    // Persist settings whenever they change (after initial load)
    useEffect(() => {
        if (isInitialLoad.current) return;

        const settingsToSave = {
            excludedGroups,
            excludedGroupTypes,
            excludedRoles,
            groupIdToStartWith,
            layoutAlgorithm,
            showGroupTypes,
        };

        Logger.log('[MainComponent] Persisting settings', settingsToSave);
        saveSettings(settingsToSave);
    }, [
        excludedGroups,
        excludedGroupTypes,
        excludedRoles,
        groupIdToStartWith,
        layoutAlgorithm,
        showGroupTypes,
        saveSettings
    ]);

    // Default excluded roles logic (only if no roles are excluded yet and settings aren't loaded)
    useEffect(() => {
        if (isInitialLoad.current || isSettingsLoading) return;
        
        if (groupRoles && groupRoles.length > 0 && excludedRoles.length === 0) {
            const newExcluded = groupRoles
                .filter((role) => !role.isLeader)
                .map((role) => String(role.id));
            Logger.log(`[MainComponent] Setting default excludedRoles to ${String(newExcluded.length)} items:`, newExcluded);
            setExcludedRoles(newExcluded);
        }
    }, [groupRoles, excludedRoles.length, setExcludedRoles, isSettingsLoading]);

    useEffect(() => {
        Logger.log('[MainComponent] MOUNTED');
        return () => { Logger.log('[MainComponent] UNMOUNTED'); };
    }, []);

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50">
            {!isLoading && <FloatingHeader />}
            <div className="relative w-full grow">
                {isLoading ? (
                    <div className="flex size-full items-center justify-center">
                        <div className="flex flex-col items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                            <Loader2 className="size-8 animate-spin text-blue-600" />
                            <span>Organigramm wird vorbereitet...</span>
                        </div>
                    </div>
                ) : (
                    <GraphView isLoading={isLoading} />
                )}
            </div>
        </div>
    );
});
