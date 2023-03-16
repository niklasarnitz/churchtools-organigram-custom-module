import '@react-sigma/core/lib/react-sigma.min.css';
import { Logger } from '../globals/Logger';
import { SigmaContainer, useLoadGraph } from '@react-sigma/core';
import { createRelatedData } from '../helpers/createRelatedData';
import { useAppStore } from '../state/useAppStore';
import Graph from 'graphology';
import React, { useEffect, useState } from 'react';
import type { Group } from '../models/Group';
import type { Person } from '../models/Person';
import type { Relation } from '../models/Relation';

export type LoadGraphDataType = {
	relations: Relation[];
	persons: Person[];
	groups: Group[];
}

// eslint-disable-next-line unicorn/prevent-abbreviations
export type LoadGraphProps = {
	data: LoadGraphDataType
}

export const LoadGraph = ({ data }: LoadGraphProps) => {
	const loadGraph = useLoadGraph();

	useEffect(() => {
		const graph = new Graph();

		for (const group of data.groups) {
			try {
				graph.addNode(group.guid, { x: 0, y: 0, size: 15, label: group.name, color: '#FA4F40' });
			} catch (error) {
				Logger.error(error);
			}
		}

		for (const person of data.persons) {
			try {
				graph.addNode(person.guid, { x: 0, y: 0, size: 15, label: `${person.firstName} ${person.lastName}`, color: '#FA4F40' });

			} catch (error) {
				Logger.error(error);
			}
		}

		for (const relation of data.relations) {
			try {
				graph.addEdgeWithKey(`${relation.source.guid}->${relation.target.guid}`, relation.source.guid, relation.target.guid);
			} catch (error) {
				Logger.error(error);
			}
		}

		loadGraph(graph);
	}, [data.groups, data.persons, data.relations, loadGraph]);

	// eslint-disable-next-line unicorn/no-null
	return null;
};

export const DisplayGraph = () => {
	const personsById = useAppStore((s) => s.personsById);
	const persons = useAppStore((s) => s.persons);
	const groups = useAppStore((s) => s.groups);
	const groupsById = useAppStore((s) => s.groupsById);
	const groupMembers = useAppStore((s) => s.groupMembers);
	const hierarchies = useAppStore((s) => s.hierarchies);
	const [isLoading, setIsLoading] = useState(false);

	const fetchPersons = useAppStore((s) => s.fetchPersons);
	const fetchGroups = useAppStore((s) => s.fetchGroups);
	const fetchHierarchies = useAppStore((s) => s.fetchHierarchies);

	const [data, setData] = useState<LoadGraphDataType | undefined>();

	useEffect(() => {
		setIsLoading(true);
		Promise.all([fetchPersons(), fetchHierarchies(), fetchGroups(true)]).then(() => {
			setData({
				relations: createRelatedData(personsById, groups, groupsById, groupMembers, hierarchies),
				persons: persons,
				groups: groups,
			})
			setIsLoading(false);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	if (isLoading || !data) {
		return <div>Loading...</div>
	}

	return (
		<div className="h-screen w-full">
			<SigmaContainer>
				<LoadGraph data={data} />
			</SigmaContainer>
		</div>
	);
};
