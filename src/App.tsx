import "@fontsource/lato";
import { ButtonDropdown, Loading, Select } from '@geist-ui/core'
import { Logger } from './globals/Logger';
import { createData } from './helpers/createRelatedData';
import { downloadTextFile } from './helpers/downloadTextFile';
import { generateGraphMLData } from './helpers/dataConverters/GraphMLConverter';
import { useAppStore } from './state/useAppStore';
import React, { useCallback, useEffect, useState } from 'react';
import _ from 'lodash';
import moment from 'moment';

function App() {
	const fetchPersons = useAppStore((s) => s.fetchPersons);
	const fetchGroups = useAppStore((s) => s.fetchGroups);
	const fetchHierarchies = useAppStore((s) => s.fetchHierarchies);
	const fetchGroupTypes = useAppStore((s) => s.fetchGroupTypes);
	const fetchGroupRoles = useAppStore((s) => s.fetchGroupRoles);

	const hierarchies = useAppStore((s) => s.hierarchies);
	const groupsById = useAppStore((s) => s.groupsById);
	const groups = useAppStore((s) => s.groups);
	const groupMembers = useAppStore((s) => s.groupMembers);
	const selectedRoles = useAppStore((s) => s.selectedRoles);

	const setSelectedRoles = useAppStore((s) => s.setSelectedRoles);

	const groupRoles = useAppStore((s) => s.groupRoles);
	const groupTypesById = useAppStore((s) => s.groupTypesById);

	const reducerIsLoading = useAppStore((s) => s.isLoading);
	const [localIsLoading, setLocalIsLoading] = useState(false);

	const isLoading = reducerIsLoading || localIsLoading;



	const didPressDownloadGraphML = useCallback(() => {
		Logger.log('Updating GraphML data.');

		const localGraphData = createData(hierarchies, groupsById, groups, groupMembers, selectedRoles)
		// eslint-disable-next-line no-console

		if (localGraphData) {
			Logger.log('Downloading generated GraphML file.');
			downloadTextFile(generateGraphMLData(localGraphData, selectedRoles),
				`Organigramm-${moment().format('DD-MM-YYYY-hh:mm:ss')}.graphml`,
				document,
			);
		}
	}, [groupMembers, groups, groupsById, hierarchies, selectedRoles]);

	// Callbacks
	const renderGroupTypes = useCallback(() => {
		return (
			<div className="flex-col">
				<h5>Zu exkludierende Gruppenrollen</h5>
				<Select
					placeholder="Keine exkludierten Gruppenrollen ausgewählt"
					value={selectedRoles.map(String)}
					multiple
					onChange={setSelectedRoles}
					className="w-1/2"
				>
					{_.sortBy(
						groupRoles,
						(groupRole) => `${groupTypesById[groupRole.groupTypeId]?.name} - ${groupRole.name}`,
					).map((groupRole) => {
						return (
							<Select.Option key={groupRole.id} value={String(groupRole.id)}>
								{`${groupTypesById[groupRole.groupTypeId]?.name} - ${groupRole.name}`}
							</Select.Option>
						);
					})}
				</Select>
			</div >
		);
	}, [groupRoles, groupTypesById, selectedRoles, setSelectedRoles]);

	// Effects
	useEffect(() => {
		setLocalIsLoading(true);
		Promise.all([fetchPersons(), fetchGroups(true), fetchHierarchies(), fetchGroupTypes(), fetchGroupRoles()]).then(
			() => {
				setLocalIsLoading(false);
				setSelectedRoles(useAppStore.getState().groupRoles.filter((value) => !value.isLeader).map((value) => String(value.id)));
			},
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className='h-[100vh] w-full bg-slate-100'>
			<div className='flex h-full w-full flex-col items-center justify-start p-4'>
				<div className="flex w-full items-center justify-between gap-6 border-0 border-b border-solid px-6 py-3.5 text-lg">
					<div className="flex grow gap-6 divide-x font-bold">
						<div className="flex h-7 items-baseline gap-4">
							<span>ChurchTools Organigramm</span>
						</div>
					</div>
				</div>
				<div className="w-1/2">
					{renderGroupTypes()}
					{!isLoading && (<>
						<ButtonDropdown className='mt-3'>
							<ButtonDropdown.Item main onClick={didPressDownloadGraphML}>
								Export als GraphML Datei
							</ButtonDropdown.Item>
							<ButtonDropdown.Item>Export als FooBar</ButtonDropdown.Item>
						</ButtonDropdown>
					</>
					)}
					{isLoading && <Loading>Daten werden geladen.</Loading>}
				</div>
			</div>
		</div>
	);
}

export default App;
