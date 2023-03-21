import { ButtonDropdown, CssBaseline, GeistProvider, Loading, Select, Text } from '@geist-ui/core';
import { Logger } from './globals/Logger';
import { PreviewGraph } from './components/PreviewGraph';
import { createData } from './helpers/createRelatedData';
import { downloadTextFile } from './helpers/downloadTextFile';
import { generateGraphMLData } from './helpers/dataConverters/GraphMLConverter';
import { useAppStore } from './state/useAppStore';
import React, { useCallback, useEffect, useState } from 'react';
import _ from 'lodash';
import moment from 'moment';
import type { GraphData } from './models/GraphData';

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

	const [graphData, setGraphData] = useState<GraphData | undefined>()

	const didPressDownloadGraphML = useCallback(() => {
		Logger.log('Downloading generated GraphML file.');
		Logger.log('Updating GraphML data.');
		const localGraphData = createData(hierarchies, groupsById, groups, groupMembers, selectedRoles)
		setGraphData(localGraphData);

		if (graphData) {
			downloadTextFile(generateGraphMLData(localGraphData),
				`Organigramm-${moment().format('DD-MM-YYYY-hh:mm:ss')}.graphml`,
				document,
			);
		}

	}, [graphData, groupMembers, groups, groupsById, hierarchies, selectedRoles]);

	// Callbacks
	const renderGroupTypes = useCallback(() => {
		return (
			<div className="flex-col">
				<Text h5>Zu exkludierende Gruppenrollen</Text>
				<Select
					placeholder="Keine exkludierten Gruppenrollen ausgewählt"
					value={selectedRoles.map(String)}
					multiple
					onChange={setSelectedRoles}
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
			</div>
		);
	}, [groupRoles, groupTypesById, selectedRoles, setSelectedRoles]);

	// Effects
	useEffect(() => {
		setLocalIsLoading(true);
		Promise.all([fetchPersons(), fetchGroups(true), fetchHierarchies(), fetchGroupTypes(), fetchGroupRoles()]).then(
			() => {
				setLocalIsLoading(false);
				setGraphData(createData(hierarchies, groupsById, groups, groupMembers, selectedRoles));
				setSelectedRoles(groupRoles.filter((value) => !value.isLeader).map((groupRole) => String(groupRole.id)))
			},
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setGraphData(createData(hierarchies, groupsById, groups, groupMembers, selectedRoles));
	}, [groupMembers, groups, groupsById, hierarchies, selectedRoles]);

	return (
		<GeistProvider>
			<CssBaseline />
			<div className='m-2 flex'>
				<nav
					className='w-64 shrink-0 bg-white pr-3'
				>
					{renderGroupTypes()}
					{!isLoading && (
						<ButtonDropdown className='mt-3'>
							<ButtonDropdown.Item main onClick={didPressDownloadGraphML}>
								Export als GraphML Datei
							</ButtonDropdown.Item>
							<ButtonDropdown.Item>Export als FooBar</ButtonDropdown.Item>
						</ButtonDropdown>
					)}
					{isLoading && <Loading>Daten werden geladen.</Loading>}
				</nav>
				<main
					className='w-[calc(100%-16rem)] flex-1 p-3'
				>
					{!isLoading && graphData && (
						<div className="h-full min-h-full">
							<Text h3>Export Vorschau</Text>
							<PreviewGraph graphData={graphData} />
						</div>
					)}
				</main>
			</div>
		</GeistProvider>
	);
}

export default App;
