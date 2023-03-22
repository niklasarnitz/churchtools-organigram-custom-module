import { Button, ButtonDropdown, ButtonGroup, Loading, Select } from '@geist-ui/core'
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

	const [graphDirection, setGraphDirection] = useState<'LR' | 'TB'>('LR');

	const [graphData, setGraphData] = useState<GraphData | undefined>()

	const didPressDownloadGraphML = useCallback(() => {
		Logger.log('Updating GraphML data.');

		const localGraphData = createData(hierarchies, groupsById, groups, groupMembers, selectedRoles)
		// eslint-disable-next-line no-console

		if (localGraphData) {
			Logger.log('Downloading generated GraphML file.');
			downloadTextFile(generateGraphMLData(localGraphData),
				`Organigramm-${moment().format('DD-MM-YYYY-hh:mm:ss')}.graphml`,
				document,
			);
		}

		setGraphData(localGraphData);

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
					className="w-[17rem]"
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

	const setLayoutHorizontal = useCallback(() => {
		setGraphDirection('LR');
	}, []);

	const setLayoutVertical = useCallback(() => {
		setGraphDirection('TB');
	}, []);

	// Effects
	useEffect(() => {
		setLocalIsLoading(true);
		Promise.all([fetchPersons(), fetchGroups(true), fetchHierarchies(), fetchGroupTypes(), fetchGroupRoles()]).then(
			() => {
				setLocalIsLoading(false);
				setGraphData(createData(hierarchies, groupsById, groups, groupMembers, selectedRoles));
				setSelectedRoles(useAppStore.getState().groupRoles.filter((value) => !value.isLeader).map((value) => String(value.id)));
			},
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setGraphData(createData(hierarchies, groupsById, groups, groupMembers, selectedRoles));
	}, [groupMembers, groups, groupsById, hierarchies, selectedRoles]);

	return (
		<div className='m-2 flex h-full w-full'>
			<nav
				className='w-[18rem] shrink-0 bg-white pr-3'
			>
				{renderGroupTypes()}
				{!isLoading && (<>
					<ButtonGroup>
						<Button onClick={setLayoutHorizontal} type={graphDirection === 'LR' ? 'success' : undefined}>Horizontal</Button>
						<Button onClick={setLayoutVertical} type={graphDirection === 'TB' ? 'success' : undefined}>Vertikal</Button>
					</ButtonGroup>
					<ButtonDropdown className='mt-3'>
						<ButtonDropdown.Item main onClick={didPressDownloadGraphML}>
							Export als GraphML Datei
						</ButtonDropdown.Item>
						<ButtonDropdown.Item>Export als FooBar</ButtonDropdown.Item>
					</ButtonDropdown>
				</>
				)}

			</nav>
			<main
				className=' w-[calc(100%-18rem)] flex-1 grow'
			>
				{isLoading && <Loading>Daten werden geladen.</Loading>}
				{
					!isLoading && graphData && <div className='h-screen'>
						<PreviewGraph relations={graphData.relations} nodes={graphData.nodes} displayDirection={graphDirection} />
					</div>
				}
			</main>
		</div>
	);
}

export default App;
