import { Select, Toggle } from '@geist-ui/core';
import { useAppStore } from '../../state/useAppStore';
import { useGroupRoles } from '../../queries/useGroupRoles';
import { useGroupTypes } from '../../queries/useGroupTypes';
import { useGroupTypesById } from '../../selectors/useGroupTypesById';
import { useGroups } from '../../queries/useGroups';
import React, { useCallback } from 'react';
import _ from 'lodash';

export const ExclusionFilters = React.memo(() => {
    const { data: groups } = useGroups();
    const { data: groupTypes } = useGroupTypes();
    const { data: groupRoles } = useGroupRoles();
    const groupTypesById = useGroupTypesById();
    const GeistSelect = Select as any;

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

    const showGroupTypesDidChange = useCallback(() => {
        setShowGroupTypes(!showGroupTypes);
    }, [setShowGroupTypes, showGroupTypes]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex-col">
                <h5>Zu exkludierende Gruppentypen</h5>
                <GeistSelect
                    placeholder={<p>Keine exkludierten Gruppentypen ausgewählt</p>}
                    value={excludedGroupTypes.map(String)}
                    multiple
                    onChange={setExcludedGroupTypes}
                    width="100%"
                >
                    {_.sortBy(groupTypes ?? [], (g) => g?.sortKey).map((groupType) => (
                        <Select.Option key={groupType.id} value={String(groupType.id)}>
                            {groupType?.name}
                        </Select.Option>
                    ))}
                </GeistSelect>
            </div>

            <div className="flex-col">
                <h5>Zu exkludierende Gruppen</h5>
                <GeistSelect
                    placeholder={<p>Keine exkludierten Gruppen ausgewählt</p>}
                    value={excludedGroups.map(String)}
                    multiple
                    onChange={setExcludedGroups}
                    width="100%"
                >
                    {_.sortBy(
                        (groups ?? []).filter((group) => !excludedGroupTypes.includes(group.information.groupTypeId)),
                        (g) => g?.name,
                    ).map((group) => (
                        <Select.Option key={group.id} value={String(group.id)}>
                            {group?.name}
                        </Select.Option>
                    ))}
                </GeistSelect>
            </div>

            <div className="flex-col">
                <h5>Zu exkludierende Gruppenrollen</h5>
                <GeistSelect
                    placeholder={<p>Keine exkludierten Gruppenrollen ausgewählt</p>}
                    value={excludedRoles.map(String)}
                    multiple
                    onChange={setExcludedRoles}
                    width="100%"
                >
                    {_.sortBy(
                        (groupRoles ?? []).filter((groupRole) => !excludedGroupTypes.includes(groupRole.groupTypeId)),
                        (groupRole) => `${groupTypesById[groupRole.groupTypeId]?.name} - ${groupRole.name}`,
                    ).map((groupRole) => (
                        <Select.Option key={groupRole.id} value={String(groupRole.id)}>
                            {`${groupTypesById[groupRole.groupTypeId]?.name} - ${groupRole.name}`}
                        </Select.Option>
                    ))}
                </GeistSelect>
            </div>

            <div className="flex-col">
                <h5>Darstellungsoptionen</h5>
                <div className="flex flex-row items-center gap-x-2">
                    <Toggle checked={showGroupTypes} onChange={showGroupTypesDidChange} />
                    Gruppentypen anzeigen
                </div>
            </div>
        </div>
    );
});
