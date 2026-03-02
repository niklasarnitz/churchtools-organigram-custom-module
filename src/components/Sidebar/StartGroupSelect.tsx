import { Button, Select } from '@geist-ui/core';
import { useAppStore } from '../../state/useAppStore';
import { useGroups } from '../../queries/useGroups';
import React, { useCallback } from 'react';
import _ from 'lodash';

export const StartGroupSelect = React.memo(() => {
    const { data: groups } = useGroups();
    const { groupIdToStartWith, setGroupIdToStartWith } = useAppStore();

    const clearGroupIdToStartWith = useCallback(() => {
        // eslint-disable-next-line unicorn/no-useless-undefined
        setGroupIdToStartWith(undefined);
    }, [setGroupIdToStartWith]);

    if (!groups) return <></>;

    return (
        <div className="flex-col">
            <h5>Gruppe, mit der gestartet werden soll</h5>

            <Select
                placeholder={<p>Keine Gruppe ausgewählt</p>}
                value={groupIdToStartWith ?? ''}
                onChange={setGroupIdToStartWith}
                width="100%"
            >
                {_.sortBy(groups, (g) => g?.name).map((group) => {
                    return (
                        <Select.Option key={group.id} value={String(group.id)}>
                            {group?.name}
                        </Select.Option>
                    );
                })}
            </Select>
            {groupIdToStartWith && (
                <Button 
                    className="mt-2" 
                    onClick={clearGroupIdToStartWith} 
                    scale={1/2} 
                    width="100%"
                >
                    Auswahl löschen
                </Button>
            )}
        </div>
    );
});
