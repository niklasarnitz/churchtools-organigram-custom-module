import _ from 'lodash';
import React, { useCallback } from 'react';

import { useGroups } from '../../queries/useGroups';
import { useAppStore } from '../../state/useAppStore';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export const StartGroupSelect = React.memo(() => {
    const { data: groups } = useGroups();
    const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
    const setGroupIdToStartWith = useAppStore((s) => s.setGroupIdToStartWith);

    const clearGroupIdToStartWith = useCallback(() => {
        setGroupIdToStartWith();
    }, [setGroupIdToStartWith]);

    const handleSelectChange = useCallback((val: string) => {
        setGroupIdToStartWith(val);
    }, [setGroupIdToStartWith]);

    if (!groups) return <></>;

    return (
        <div className="flex flex-col">
            <h5 className="mb-1 text-sm font-semibold">Gruppe, mit der gestartet werden soll</h5>

            <Select onValueChange={handleSelectChange} value={groupIdToStartWith ?? ''}>
                <SelectTrigger>
                    <SelectValue placeholder="Keine Gruppe ausgewählt" />
                </SelectTrigger>
                <SelectContent>
                    {_.sortBy(groups, (g) => g.name).map((group) => (
                        <SelectItem key={group.id} value={String(group.id)}>
                            {group.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {groupIdToStartWith && (
                <Button
                    className="mt-2 w-full"
                    onClick={clearGroupIdToStartWith}
                    size="sm"
                    variant="outline"
                >
                    Auswahl löschen
                </Button>
            )}
        </div>
    );
});
