import { Button, Select } from '@geist-ui/core';
import { useAppStore } from '../../state/useAppStore';
import { useGroups } from '../../queries/useGroups';
import React, { useCallback } from 'react';
import _ from 'lodash';

export const StartGroupSelect = React.memo(() => {
    const { data: groups } = useGroups();
    const { groupIdToStartWith, setGroupIdToStartWith } = useAppStore();

    const clearGroupIdToStartWith = useCallback(() => {
        setGroupIdToStartWith();
    }, [setGroupIdToStartWith]);

    const handleSelectChange = useCallback((val: any) => {
        setGroupIdToStartWith(Array.isArray(val) ? val[0] : val);
    }, [setGroupIdToStartWith]);

    if (!groups) return <></>;

    const GeistSelect = Select as any;
    const GeistButton = Button as any;

    return (
        <div className="flex-col">
            <h5>Gruppe, mit der gestartet werden soll</h5>

            <GeistSelect
                placeholder={<p>Keine Gruppe ausgewählt</p>}
                value={groupIdToStartWith ?? ''}
                onChange={handleSelectChange}
                width="100%"
            >
                {_.sortBy(groups, (g) => g?.name).map((group) => {
                    return (
                        <Select.Option key={group.id} value={String(group.id)}>
                            {group?.name}
                        </Select.Option>
                    );
                })}
            </GeistSelect>
            {groupIdToStartWith && (
                <GeistButton 
                    className="mt-2" 
                    onClick={clearGroupIdToStartWith} 
                    scale={1/2} 
                    width="100%"
                >
                    Auswahl löschen
                </GeistButton>
            )}
        </div>
    );
});
