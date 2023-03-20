import { Logger } from './globals/Logger';
import { createRelatedData } from './helpers/createRelatedData';
import { downloadTextFile } from './helpers/downloadTextFile';
import { generateGraphMLFile } from './helpers/exporters/GraphMLExporter';
import { useAppStore } from './state/useAppStore';
import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import type { Relation } from './models/Relation';

function App() {
	const fetchPersons = useAppStore(s => s.fetchPersons)
	const fetchGroups = useAppStore(s => s.fetchGroups)
	const fetchHierarchies = useAppStore(s => s.fetchHierarchies)

	const [relatedData, setRelatedData] = useState<Relation[]>([]);

	const reducerIsLoading = useAppStore(s => s.isLoading);
	const [localIsLoading, setLocalIsLoading] = useState(false);

	const isLoading = reducerIsLoading || localIsLoading;

	const didPressDownloadGraphML = useCallback(() => {
		Logger.log('Starting generation of GraphML file.')

		const graphMLData = generateGraphMLFile(relatedData);

		Logger.log('Downloading generated GraphML file.')
		downloadTextFile(graphMLData, `Organigram-${moment().format('DD-MM-YYYY')}.graphml`, document);
	}, [relatedData]);


	// Effects
	useEffect(() => {
		setLocalIsLoading(true);
		Promise.all([
			fetchPersons(),
			fetchGroups(true),
			fetchHierarchies()
		]).then(() => {
			setRelatedData(createRelatedData())
			setLocalIsLoading(false);
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	if (isLoading) {
		return <div>Loading...</div>
	}

	return (
		<div className='h-full w-full'>
			<button onClick={didPressDownloadGraphML}>Download GraphML</button>
		</div>
	);
}

export default App;
