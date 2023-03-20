import { CssBaseline, GeistProvider, Loading, Select, Text } from '@geist-ui/core';
import { Logger } from './globals/Logger';
import { createData } from './helpers/createRelatedData';
import { downloadTextFile } from './helpers/downloadTextFile';
import { generateGraphMLFile } from './helpers/exporters/GraphMLExporter';
import { useAppStore } from './state/useAppStore';
import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';

function App() {
	const fetchPersons = useAppStore(s => s.fetchPersons)
	const fetchGroups = useAppStore(s => s.fetchGroups)
	const fetchHierarchies = useAppStore(s => s.fetchHierarchies)
	const fetchGroupTypes = useAppStore(s => s.fetchGroupTypes)
	const fetchGroupRoles = useAppStore(s => s.fetchGroupRoles)

	const groupRoles = useAppStore(s => s.groupRoles)
	const groupTypesById = useAppStore(s => s.groupTypesById)

	const reducerIsLoading = useAppStore(s => s.isLoading);
	const [localIsLoading, setLocalIsLoading] = useState(false);
	const [selectedRoles, setSelectedRoles] = useState<string | string[]>([]);

	const isLoading = reducerIsLoading || localIsLoading;

	const didPressDownloadGraphML = useCallback(() => {
		Logger.log('Starting generation of GraphML file.')
		const rolesToExclude = (selectedRoles as string[]).map(Number);

		const graphMLData = generateGraphMLFile(createData(rolesToExclude));

		Logger.log('Downloading generated GraphML file.')
		downloadTextFile(graphMLData, `Organigramm-${moment().format('DD-MM-YYYY')}.graphml`, document);
	}, [selectedRoles]);

	// Callbacks
	const renderGroupTypes = useCallback(() => {
		return (
			<div className="flex-col">
				<Text h3>Zu exkludierende Gruppenrollen</Text>
				<Select
					placeholder='Select a group type'
					value={selectedRoles}
					multiple
					initialValue={groupRoles.map((groupRole) => String(groupRole.id))}
					onChange={setSelectedRoles}
				>
					{groupRoles.map((groupRole) => {
						return (
							<Select.Option key={groupRole.id} value={String(groupRole.id)}>
								{`${groupTypesById[groupRole.groupTypeId]?.name} - ${groupRole.name}`}
							</Select.Option>
						);
					})}
				</Select>
			</div >
		);
	}, [groupRoles, groupTypesById, selectedRoles]);

	// Effects
	useEffect(() => {
		setLocalIsLoading(true);
		Promise.all([
			fetchPersons(),
			fetchGroups(true),
			fetchHierarchies(),
			fetchGroupTypes(),
			fetchGroupRoles(),
		]).then(() => {
			setLocalIsLoading(false);
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<GeistProvider>
			<CssBaseline />
			<div className='h-full w-full flex-col'>
				{isLoading && <Loading />}
				{renderGroupTypes()}
				<button onClick={didPressDownloadGraphML}>Download GraphML</button>
			</div>
		</GeistProvider>
	);
}

export default App;
