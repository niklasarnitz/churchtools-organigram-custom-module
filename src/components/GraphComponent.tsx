import '@react-sigma/core/lib/react-sigma.min.css';
import { Hierarchy } from '../models/Hierarchy';
import { SigmaContainer, useLoadGraph } from '@react-sigma/core';
import { createRelatedData } from '../helpers/createRelatedData';
import { useAppStore } from '../state/useAppStore';
import Graph from 'graphology';
import React, { useEffect, useMemo, useState } from 'react';
import type { Relation } from '../models/Relation';

// eslint-disable-next-line unicorn/prevent-abbreviations
export type LoadGraphProps = {
	relations: Relation[]
}

export const LoadGraph = ({ relations }: LoadGraphProps) => {
	const loadGraph = useLoadGraph();
	const groups = useAppStore((s) => s.groups);
	const persons = useAppStore((s) => s.persons);

	useEffect(() => {
		const graph = new Graph();

		for (const group of groups) {
			graph.addNode(group.guid, { x: 0, y: 0, size: 15, label: group.name, color: '#FA4F40' });
		}

		for (const person of persons) {
			graph.addNode(person.guid, { x: 0, y: 0, size: 15, label: `${person.firstName} ${person.lastName}`, color: '#FA4F40' });
		}

		for (const relation of relations) {
			graph.addEdgeWithKey(`${relation.source.guid}->${relation.target.guid}`, relation.source.guid, relation.target.guid);
		}

		graph.addNode('first', { x: 0, y: 0, size: 15, label: 'My first node', color: '#FA4F40' });
		loadGraph(graph);
	}, [groups, loadGraph, persons, relations]);

	// eslint-disable-next-line unicorn/no-null
	return null;
};

export const DisplayGraph = () => {
	const personsById = useAppStore((s) => s.personsById);
	const groups = useAppStore((s) => s.groups);
	const groupsById = useAppStore((s) => s.groupsById);
	const groupMembers = useAppStore((s) => s.groupMembers);
	const hierarchies = useAppStore((s) => s.hierarchies);
	const [relations, setRelations] = useState([] as Relation[]);

	const fetchPersons = useAppStore((s) => s.fetchPersons);
	const fetchGroups = useAppStore((s) => s.fetchGroups);
	const fetchHierarchies = useAppStore((s) => s.fetchHierarchies);

	const relatedData = useMemo(
		() => createRelatedData(personsById, groups, groupsById, groupMembers, hierarchies),
		[groupMembers, groups, groupsById, hierarchies, personsById],
	);

	useEffect(() => {
		fetchPersons();
		fetchHierarchies();
		fetchGroups(true).then(() => {
			setRelations(createRelatedData(personsById, groups, groupsById, groupMembers, hierarchies));
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<div className="h-screen w-full">
			<SigmaContainer>
				<LoadGraph relations={relations} />
			</SigmaContainer>
		</div>
	);
};
