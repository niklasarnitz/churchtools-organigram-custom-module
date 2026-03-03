import _ from 'lodash';
import React, { useCallback, useMemo } from 'react';

import { useGroups } from '../../queries/useGroups';
import { useAppStore } from '../../state/useAppStore';
import { Button } from '../ui/button';
import { Combobox } from '../ui/combobox';

export const StartGroupSelect = React.memo(() => {
	const { data: groups } = useGroups();
	const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
	const setGroupIdToStartWith = useAppStore((s) => s.setGroupIdToStartWith);

	const clearGroupIdToStartWith = useCallback(() => {
		setGroupIdToStartWith();
	}, [setGroupIdToStartWith]);

	const handleSelectChange = useCallback(
		(val: string) => {
			setGroupIdToStartWith(val);
		},
		[setGroupIdToStartWith],
	);

	const options = useMemo(
		() =>
			_.sortBy(groups ?? [], (g) => g.name).map((group) => ({
				label: group.name,
				value: String(group.id),
			})),
		[groups],
	);

	if (!groups) return <></>;

	return (
		<div className="flex flex-col">
			<h5 className="mb-1 text-sm font-semibold">Gruppe, mit der gestartet werden soll</h5>

			<Combobox
				onValueChange={handleSelectChange}
				options={options}
				placeholder="Keine Gruppe ausgewählt"
				value={groupIdToStartWith ?? ''}
			/>

			{groupIdToStartWith && (
				<Button className="mt-2 w-full" onClick={clearGroupIdToStartWith} size="sm" variant="outline">
					Auswahl löschen
				</Button>
			)}
		</div>
	);
});
