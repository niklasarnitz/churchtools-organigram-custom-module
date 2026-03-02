import { MultiSelect } from '../ui/multi-select';
import { Switch } from '../ui/switch';
import { useAppStore } from '../../state/useAppStore';
import { useGroupRoles } from '../../queries/useGroupRoles';
import { useGroupTypes } from '../../queries/useGroupTypes';
import { useGroupTypesById } from '../../selectors/useGroupTypesById';
import { useGroups } from '../../queries/useGroups';
import React, { useCallback, useMemo } from 'react';
import _ from 'lodash';

export const ExclusionFilters = React.memo(() => {
    const { data: groups } = useGroups();
    const { data: groupTypes } = useGroupTypes();
    const { data: groupRoles } = useGroupRoles();
    const groupTypesById = useGroupTypesById();

    const {
        excludedGroups,
        setExcludedGroups,
        excludedGroupTypes,
        setExcludedGroupTypes,
        excludedRoles,
        setExcludedRoles,
        showGroupTypes,
        setShowGroupTypes
    } = useAppStore();

    const showGroupTypesDidChange = useCallback((checked: boolean) => {
        setShowGroupTypes(checked);
    }, [setShowGroupTypes]);

    const groupTypeOptions = useMemo(() =>
        _.sortBy(groupTypes ?? [], (g) => g?.sortKey).map((groupType) => ({
            value: String(groupType.id),
            label: groupType?.name,
        })),
    [groupTypes]);

    const groupOptions = useMemo(() =>
        _.sortBy(
            (groups ?? []).filter((group) => !excludedGroupTypes.includes(group.information.groupTypeId)),
            (g) => g?.name,
        ).map((group) => ({
            value: String(group.id),
            label: group?.name,
        })),
    [groups, excludedGroupTypes]);

    const roleOptions = useMemo(() =>
        _.sortBy(
            (groupRoles ?? []).filter((groupRole) => !excludedGroupTypes.includes(groupRole.groupTypeId)),
            (groupRole) => `${groupTypesById[groupRole.groupTypeId]?.name} - ${groupRole.name}`,
        ).map((groupRole) => ({
            value: String(groupRole.id),
            label: `${groupTypesById[groupRole.groupTypeId]?.name} - ${groupRole.name}`,
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
                    options={groupTypeOptions}
                    value={excludedGroupTypes.map(String)}
                    onChange={handleGroupTypesChange}
                    placeholder="Keine exkludierten Gruppentypen ausgewählt"
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold">Zu exkludierende Gruppen</h5>
                <MultiSelect
                    options={groupOptions}
                    value={excludedGroups.map(String)}
                    onChange={handleGroupsChange}
                    placeholder="Keine exkludierten Gruppen ausgewählt"
                />
            </div>

            <div className="flex flex-col">
                <h5 className="mb-1 text-sm font-semibold">Zu exkludierende Gruppenrollen</h5>
                <MultiSelect
                    options={roleOptions}
                    value={excludedRoles.map(String)}
                    onChange={handleRolesChange}
                    placeholder="Keine exkludierten Gruppenrollen ausgewählt"
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
