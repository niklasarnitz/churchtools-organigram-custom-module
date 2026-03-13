import _ from 'lodash';
import React, { useCallback, useMemo } from 'react';

import { useGroupRoles } from '../../queries/useGroupRoles';
import { useGroups } from '../../queries/useGroups';
import { useGroupTypes } from '../../queries/useGroupTypes';
import { usePersonMasterData } from '../../queries/usePersonMasterData';
import { useGroupTypesById } from '../../selectors/useGroupTypesById';
import { useAppStore } from '../../state/useAppStore';
import { GroupStatus } from '../../types/GroupStatus';
import { Combobox } from '../ui/combobox';
import { MultiSelect } from '../ui/multi-select';
import { Switch } from '../ui/switch';

const depthOptions = [
    { label: 'Alle Ebenen', value: 'none' },
    { label: '1 Ebene', value: '1' },
    { label: '2 Ebenen', value: '2' },
    { label: '3 Ebenen', value: '3' },
    { label: '4 Ebenen', value: '4' },
    { label: '5 Ebenen', value: '5' },
]

const groupStatusOptions = [
    { label: 'Aktiv', value: String(GroupStatus.ACTIVE) },
    { label: 'In Gründung', value: String(GroupStatus.PENDING) },
    { label: 'Archiviert', value: String(GroupStatus.ARCHIVED) },
    { label: 'Beendet', value: String(GroupStatus.FINISHED) },
]

export const ExclusionFilters = React.memo(() => {
    const { data: groups } = useGroups();
    const { data: groupTypes } = useGroupTypes();
    const { data: groupRoles } = useGroupRoles();
    const { data: masterData } = usePersonMasterData();
    const groupTypesById = useGroupTypesById();

    const excludedGroups = useAppStore((s) => s.excludedGroups);
    const setExcludedGroups = useAppStore((s) => s.setExcludedGroups);
    const excludedGroupTypes = useAppStore((s) => s.excludedGroupTypes);
    const setExcludedGroupTypes = useAppStore((s) => s.setExcludedGroupTypes);
    const excludedRoles = useAppStore((s) => s.excludedRoles);
    const setExcludedRoles = useAppStore((s) => s.setExcludedRoles);
    const includedGroupStatuses = useAppStore((s) => s.includedGroupStatuses);
    const setIncludedGroupStatuses = useAppStore((s) => s.setIncludedGroupStatuses);
    const filteredCampusIds = useAppStore((s) => s.filteredCampusIds);
    const setFilteredCampusIds = useAppStore((s) => s.setFilteredCampusIds);
    const filteredAgeGroupIds = useAppStore((s) => s.filteredAgeGroupIds);
    const setFilteredAgeGroupIds = useAppStore((s) => s.setFilteredAgeGroupIds);
    const filteredGroupCategoryIds = useAppStore((s) => s.filteredGroupCategoryIds);
    const setFilteredGroupCategoryIds = useAppStore((s) => s.setFilteredGroupCategoryIds);
    const showGroupTypes = useAppStore((s) => s.showGroupTypes);
    const setShowGroupTypes = useAppStore((s) => s.setShowGroupTypes);
    const maxDepth = useAppStore((s) => s.maxDepth);
    const setMaxDepth = useAppStore((s) => s.setMaxDepth);
    const showOnlyDirectChildren = useAppStore((s) => s.showOnlyDirectChildren);
    const setShowOnlyDirectChildren = useAppStore((s) => s.setShowOnlyDirectChildren);
    const showParentGroups = useAppStore((s) => s.showParentGroups);
    const setShowParentGroups = useAppStore((s) => s.setShowParentGroups);
    const hideIndirectSubgroups = useAppStore((s) => s.hideIndirectSubgroups);
    const setHideIndirectSubgroups = useAppStore((s) => s.setHideIndirectSubgroups);

    const handleMaxDepthChange = useCallback(
        (value: string) => {
            setMaxDepth(value === 'none' ? undefined : parseInt(value, 10));
        },
        [setMaxDepth],
    );

    const groupTypeOptions = useMemo(
        () =>
            _.sortBy(groupTypes ?? [], (g) => g.sortKey).map((groupType) => ({
                label: groupType.name,
                value: String(groupType.id),
            })),
        [groupTypes],
    );

    const filteredGroupOptions = useMemo(
        () =>
            _.sortBy(
                (groups ?? []).filter((group) => !excludedGroupTypes.includes(group.information.groupTypeId)),
                (g) => g.name,
            ).map((group) => ({
                label: group.name,
                value: String(group.id),
            })),
        [groups, excludedGroupTypes],
    );

    const roleOptions = useMemo(
        () =>
            _.sortBy(
                (groupRoles ?? []).filter((groupRole) => !excludedGroupTypes.includes(groupRole.groupTypeId)),
                (groupRole) => `${groupTypesById[groupRole.groupTypeId]?.name ?? 'Unknown'} - ${groupRole.name}`,
            ).map((groupRole) => ({
                label: `${groupTypesById[groupRole.groupTypeId]?.name ?? 'Unknown'} - ${groupRole.name}`,
                value: String(groupRole.id),
            })),
        [groupRoles, excludedGroupTypes, groupTypesById],
    );

    const handleGroupTypesChange = useCallback(
        (values: string[]) => {
            setExcludedGroupTypes(values.length > 0 ? values : []);
        },
        [setExcludedGroupTypes],
    );

    const handleGroupsChange = useCallback(
        (values: string[]) => {
            setExcludedGroups(values.length > 0 ? values : []);
        },
        [setExcludedGroups],
    );

    const handleRolesChange = useCallback(
        (values: string[]) => {
            setExcludedRoles(values.length > 0 ? values : []);
        },
        [setExcludedRoles],
    );

    const handleGroupStatusChange = useCallback(
        (values: string[]) => {
            setIncludedGroupStatuses(values.length > 0 ? (values.map(Number) as GroupStatus[]) : []);
        },
        [setIncludedGroupStatuses],
    );

    const campusOptions = useMemo(
        () =>
            _.sortBy(masterData?.campuses ?? [], (c) => c.sortKey).map((campus) => ({
                label: campus.name,
                value: String(campus.id),
            })),
        [masterData?.campuses],
    );

    const ageGroupOptions = useMemo(
        () =>
            _.sortBy(masterData?.ageGroups ?? [], (a) => a.sortKey).map((ageGroup) => ({
                label: ageGroup.name,
                value: String(ageGroup.id),
            })),
        [masterData?.ageGroups],
    );

    const groupCategoryOptions = useMemo(
        () =>
            _.sortBy(masterData?.groupCategories ?? [], (c) => c.sortKey).map((category) => ({
                label: category.name,
                value: String(category.id),
            })),
        [masterData?.groupCategories],
    );

    const handleCampusChange = useCallback(
        (values: string[]) => {
            setFilteredCampusIds(values.map(Number));
        },
        [setFilteredCampusIds],
    );

    const handleAgeGroupChange = useCallback(
        (values: string[]) => {
            setFilteredAgeGroupIds(values.map(Number));
        },
        [setFilteredAgeGroupIds],
    );

    const handleGroupCategoryChange = useCallback(
        (values: string[]) => {
            setFilteredGroupCategoryIds(values.map(Number));
        },
        [setFilteredGroupCategoryIds],
    );

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Gruppentypen ausschließen</h5>
                <MultiSelect
                    onChange={handleGroupTypesChange}
                    options={groupTypeOptions}
                    placeholder="Keine Gruppentypen ausgeschlossen"
                    value={excludedGroupTypes.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Gruppen ausschließen</h5>
                <MultiSelect
                    onChange={handleGroupsChange}
                    options={filteredGroupOptions}
                    placeholder="Keine Gruppen ausgeschlossen"
                    value={excludedGroups.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">
                    Gruppenrollen ausschließen
                </h5>
                <MultiSelect
                    onChange={handleRolesChange}
                    options={roleOptions}
                    placeholder="Keine Gruppenrollen ausgeschlossen"
                    value={excludedRoles.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold text-green-700 dark:text-green-400">
                    Gruppenstatus auswählen
                </h5>
                <MultiSelect
                    onChange={handleGroupStatusChange}
                    options={groupStatusOptions}
                    placeholder="Alle Status anzeigen"
                    value={includedGroupStatuses.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold text-green-700 dark:text-green-400">Standort filtern</h5>
                <MultiSelect
                    onChange={handleCampusChange}
                    options={campusOptions}
                    placeholder="Alle Standorte"
                    value={filteredCampusIds.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold text-green-700 dark:text-green-400">Altersgruppe filtern</h5>
                <MultiSelect
                    onChange={handleAgeGroupChange}
                    options={ageGroupOptions}
                    placeholder="Alle Altersgruppen"
                    value={filteredAgeGroupIds.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold text-green-700 dark:text-green-400">Kategorie filtern</h5>
                <MultiSelect
                    onChange={handleGroupCategoryChange}
                    options={groupCategoryOptions}
                    placeholder="Alle Kategorien"
                    value={filteredGroupCategoryIds.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mt-2 mb-1 border-t pt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Darstellungsoptionen
                </h5>
                <div className="flex flex-col gap-y-3 pt-1">
                    <div className="flex flex-row items-center gap-x-2">
                        <Switch checked={showGroupTypes} onCheckedChange={setShowGroupTypes} />
                        <span className="text-sm">Gruppentypen anzeigen</span>
                    </div>

                    <div className="flex flex-row items-center gap-x-2">
                        <Switch checked={showOnlyDirectChildren} onCheckedChange={setShowOnlyDirectChildren} />
                        <span className="text-sm">Nur direkte Untergruppen</span>
                    </div>

                    <div className="flex flex-row items-center gap-x-2">
                        <Switch checked={showParentGroups} onCheckedChange={setShowParentGroups} />
                        <span className="text-sm">Obergruppen anzeigen</span>
                    </div>

                    <div className="flex flex-row items-center gap-x-2">
                        <Switch checked={hideIndirectSubgroups} onCheckedChange={setHideIndirectSubgroups} />
                        <span className="text-sm">Indirekte Gruppenzweige ausblenden</span>
                    </div>

                    <div className="flex flex-col gap-y-1">
                        <span className="text-sm font-medium">Maximale Tiefe</span>
                        <Combobox
                            onValueChange={handleMaxDepthChange}
                            options={depthOptions}
                            placeholder="Tiefe wählen"
                            value={maxDepth?.toString() ?? 'none'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});
