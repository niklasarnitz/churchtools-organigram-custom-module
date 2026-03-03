import _ from 'lodash';
import React, { useCallback, useMemo } from 'react';

import { useGroupRoles } from '../../queries/useGroupRoles';
import { useGroups } from '../../queries/useGroups';
import { useGroupTypes } from '../../queries/useGroupTypes';
import { useGroupTypesById } from '../../selectors/useGroupTypesById';
import { useAppStore } from '../../state/useAppStore';
import { MultiSelect } from '../ui/multi-select';
import { Switch } from '../ui/switch';

export const ExclusionFilters = React.memo(() => {
    const { data: groups } = useGroups();
    const { data: groupTypes } = useGroupTypes();
    const { data: groupRoles } = useGroupRoles();
    const groupTypesById = useGroupTypesById();

    const excludedGroups = useAppStore((s) => s.excludedGroups);
    const setExcludedGroups = useAppStore((s) => s.setExcludedGroups);
    const excludedGroupTypes = useAppStore((s) => s.excludedGroupTypes);
    const setExcludedGroupTypes = useAppStore((s) => s.setExcludedGroupTypes);
    const excludedRoles = useAppStore((s) => s.excludedRoles);
    const setExcludedRoles = useAppStore((s) => s.setExcludedRoles);
    const showGroupTypes = useAppStore((s) => s.showGroupTypes);
    const setShowGroupTypes = useAppStore((s) => s.setShowGroupTypes);

    const showGroupTypesDidChange = useCallback((checked: boolean) => {
        setShowGroupTypes(checked);
    }, [setShowGroupTypes]);

    const groupTypeOptions = useMemo(() =>
        _.sortBy(groupTypes ?? [], (g) => g.sortKey).map((groupType) => ({
            label: groupType.name,
            value: String(groupType.id),
        })),
    [groupTypes]);

    const groupOptions = useMemo(() =>
        _.sortBy(
            (groups ?? []).filter((group) => !excludedGroupTypes.includes(group.information.groupTypeId)),
            (g) => g.name,
        ).map((group) => ({
            label: group.name,
            value: String(group.id),
        })),
    [groups, excludedGroupTypes]);

    const roleOptions = useMemo(() =>
        _.sortBy(
            (groupRoles ?? []).filter((groupRole) => !excludedGroupTypes.includes(groupRole.groupTypeId)),
            (groupRole) => `${groupTypesById[groupRole.groupTypeId].name} - ${groupRole.name}`,
        ).map((groupRole) => ({
            label: `${groupTypesById[groupRole.groupTypeId].name} - ${groupRole.name}`,
            value: String(groupRole.id),
        })),
    [groupRoles, excludedGroupTypes, groupTypesById]);

    const handleGroupTypesChange = useCallback((values: string[]) => {
        setExcludedGroupTypes(values.length > 0 ? values : []);
    }, [setExcludedGroupTypes]);

    const handleGroupsChange = useCallback((values: string[]) => {
        setExcludedGroups(values.length > 0 ? values : []);
    }, [setExcludedGroups]);

    const handleRolesChange = useCallback((values: string[]) => {
        setExcludedRoles(values.length > 0 ? values : []);
    }, [setExcludedRoles]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold">Zu exkludierende Gruppentypen</h5>
                <MultiSelect
                    onChange={handleGroupTypesChange}
                    options={groupTypeOptions}
                    placeholder="Keine exkludierten Gruppentypen ausgewählt"
                    value={excludedGroupTypes.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold">Zu exkludierende Gruppen</h5>
                <MultiSelect
                    onChange={handleGroupsChange}
                    options={groupOptions}
                    placeholder="Keine exkludierten Gruppen ausgewählt"
                    value={excludedGroups.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold">Zu exkludierende Gruppenrollen</h5>
                <MultiSelect
                    onChange={handleRolesChange}
                    options={roleOptions}
                    placeholder="Keine exkludierten Gruppenrollen ausgewählt"
                    value={excludedRoles.map(String)}
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold">Darstellungsoptionen</h5>
                <div className="flex flex-row items-center gap-x-2">
                    <Switch checked={showGroupTypes} onCheckedChange={showGroupTypesDidChange} />
                    <span className="text-sm">Gruppentypen anzeigen</span>
                </div>
            </div>
        </div>
    );
});
