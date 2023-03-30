import 'reactflow/dist/style.css';
import { Button, ButtonDropdown, Collapse, Description, Loading, Select, Toggle } from '@geist-ui/core';
import { Logger } from '../globals/Logger';
import { PreviewGraphNode } from './PreviewGraph/PreviewGraphNode';
import { downloadTextFile } from '../helpers/downloadTextFile';
import { generateGraphMLData } from '../helpers/dataConverters/GraphMLConverter';
import { generateReflowData } from '../helpers/dataConverters/ReflowConverter';
import { useAppStore } from '../state/useAppStore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, MiniMap, Panel } from 'reactflow';
import _ from 'lodash';
import moment from 'moment';
import type { Node } from 'reactflow';

export const MainComponent = React.memo(() => {
	// Zustand
	//  Fetch functions
	const fetchPersons = useAppStore((s) => s.fetchPersons);
	const fetchGroups = useAppStore((s) => s.fetchGroups);
	const fetchGroupTypes = useAppStore((s) => s.fetchGroupTypes);
	const fetchGroupRoles = useAppStore((s) => s.fetchGroupRoles);
	const fetchHierarchies = useAppStore((s) => s.fetchHierarchies);

	//  State variables
	const excludedRoles = useAppStore((s) => s.excludedRoles);
	const excludedGroupTypes = useAppStore((s) => s.excludedGroupTypes);
	const groupRoles = useAppStore((s) => s.groupRoles);
	const groupTypesById = useAppStore((s) => s.groupTypesById);
	const reducerIsLoading = useAppStore((s) => s.isLoading);
	const groupTypes = useAppStore((s) => s.groupTypes);
	const excludedGroups = useAppStore((s) => s.excludedGroups);
	const showGroupTypes = useAppStore((s) => s.showGroupTypes);
	const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
	const hierarchies = useAppStore((s) => s.hierarchies);
	const groupsById = useAppStore((s) => s.groupsById);
	const groups = useAppStore((s) => s.groups);

	//  State setters
	const setExcludedRoles = useAppStore((s) => s.setExcludedRoles);
	const setExcludedGroupTypes = useAppStore((s) => s.setExcludedGroupTypes);
	const setExcludedGroups = useAppStore((s) => s.setExcludedGroups);
	const setShowGroupTypes = useAppStore((s) => s.setShowGroupTypes);
	const setGroupIdToStartWith = useAppStore((s) => s.setGroupIdToStartWith);

	// Local state variables
	const [localIsLoading, setLocalIsLoading] = useState(false);
	const [data, setData] = useState(generateReflowData());

	// Helper values
	const isLoading = reducerIsLoading || localIsLoading;

	// Memoized
	const nodeTypes = useMemo(
		() => ({
			previewGraphNode: PreviewGraphNode,
		}),
		[],
	);

	// Callbacks
	const didPressDownloadGraphML = useCallback(() => {
		const groupName = groupIdToStartWith
			? (groupsById[Number(groupIdToStartWith)]
				? groupsById[Number(groupIdToStartWith)].name
				: undefined)
			: undefined;

		const fileName = groupIdToStartWith
			? `Gruppen-Organigramm-${groupName}-${moment().format('DD-MM-YYYY-hh:mm:ss')}.graphml`
			: `Organigramm-${moment().format('DD-MM-YYYY-hh:mm:ss')}.graphml`;

		Logger.log('Updating GraphML data.');

		Logger.log('Downloading generated GraphML file.');
		downloadTextFile(generateGraphMLData(), fileName, document);
	}, [groupIdToStartWith, groupsById]);

	const showGroupTypesDidChange = useCallback(() => {
		setShowGroupTypes(!showGroupTypes);
		Logger.log('showGroupTypesDidChange::' + !showGroupTypes);
	}, [setShowGroupTypes, showGroupTypes]);

	const clearGroupIdToStartWith = useCallback(() => {
		// eslint-disable-next-line unicorn/no-useless-undefined
		setGroupIdToStartWith(undefined);
	}, [setGroupIdToStartWith]);

	const onNodeClick = useCallback(
		(_: any, node: Node) => {
			Logger.log('onNodeClick::' + node.id);

			setGroupIdToStartWith(node.id);
			didPressDownloadGraphML();
			// eslint-disable-next-line unicorn/no-useless-undefined
			setGroupIdToStartWith(undefined);
		},
		[didPressDownloadGraphML, setGroupIdToStartWith],
	);

	const renderSelectExcludedGroups = useCallback(() => {
		return (
			<div className="flex-col">
				<h5>Zu exkludierende Gruppen</h5>
				<Select
					placeholder={<p>Keine exkludierten Gruppen ausgewählt</p>}
					value={excludedGroups.map(String)}
					multiple
					onChange={setExcludedGroups}
					width="100%"
				>
					{_.sortBy(
						useAppStore
							.getState()
							.groups.filter((group) => !excludedGroupTypes.includes(group.information.groupTypeId)),
						(g) => g?.name,
					).map((group) => {
						return (
							<Select.Option key={group.id} value={String(group.id)}>
								{group?.name}
							</Select.Option>
						);
					})}
				</Select>
			</div>
		);
	}, [excludedGroupTypes, excludedGroups, setExcludedGroups]);

	const renderSelectExcludedGroupTypes = useCallback(() => {
		return (
			<div className="flex-col">
				<h5>Zu exkludierende Gruppentypen</h5>
				<Select
					placeholder={<p>Keine exkludierten Gruppentypen ausgewählt</p>}
					value={excludedGroupTypes.map(String)}
					multiple
					onChange={setExcludedGroupTypes}
					width="100%"
				>
					{_.sortBy(groupTypes, (g) => g?.sortKey).map((groupType) => {
						return (
							<Select.Option key={groupType.id} value={String(groupType.id)}>
								{groupType?.name}
							</Select.Option>
						);
					})}
				</Select>
			</div>
		);
	}, [excludedGroupTypes, groupTypes, setExcludedGroupTypes]);

	const renderSelectExcludedGroupRoles = useCallback(() => {
		return (
			<div className="flex-col">
				<h5>Zu exkludierende Gruppenrollen</h5>
				<Select
					placeholder={<p>Keine exkludierten Gruppenrollen ausgewählt</p>}
					value={excludedRoles.map(String)}
					multiple
					onChange={setExcludedRoles}
					width="100%"
				>
					{_.sortBy(
						groupRoles.filter((groupRole) => !excludedGroupTypes.includes(Number(groupRole.type))),
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
	}, [excludedGroupTypes, excludedRoles, groupRoles, groupTypesById, setExcludedRoles]);

	const renderDisplayOptions = useCallback(() => {
		return (
			<div className="flex-col">
				<h5>Darstellungsoptionen</h5>
				<div className="flex flex-row items-center gap-x-2">
					<Toggle checked={showGroupTypes} onChange={showGroupTypesDidChange} />
					Gruppentypen anzeigen
				</div>
			</div>
		);
	}, [showGroupTypes, showGroupTypesDidChange]);

	const renderSelectGroupToStartWith = useCallback(() => {
		return (
			<div className="flex-col">
				<h5>Gruppe, mit der gestartet werden soll</h5>

				<Select
					placeholder={<p>Keine Gruppe ausgewählt</p>}
					value={groupIdToStartWith ?? ''}
					onChange={setGroupIdToStartWith}
					width="100%"
				>
					{_.sortBy(useAppStore.getState().groups, (g) => g?.name).map((group) => {
						return (
							<Select.Option key={group.id} value={String(group.id)}>
								{group?.name}
							</Select.Option>
						);
					})}
				</Select>
				{groupIdToStartWith && <Button onClick={clearGroupIdToStartWith}>Auswahl löschen</Button>}
			</div>
		);
	}, [clearGroupIdToStartWith, groupIdToStartWith, setGroupIdToStartWith]);

	// Effects
	useEffect(() => {
		const groupTypes = new Set(excludedGroupTypes.map((value) => groupTypesById[value]));

		const roles = useAppStore
			.getState()
			.groupRoles.filter((value) => !value.isLeader)
			.map((value) => String(value.id));

		setExcludedRoles(
			roles
				.filter((value) => {
					const groupRole = groupRoles.find((groupRole) => groupRole.id === Number(value));
					return groupRole && !groupTypes.has(groupTypesById[groupRole.groupTypeId]);
				})
				.map(String),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [excludedGroupTypes]);

	useEffect(() => {
		setLocalIsLoading(true);
		Promise.all([fetchPersons(), fetchGroups(true), fetchGroupTypes(), fetchGroupRoles(), fetchHierarchies()]).then(
			() => {
				setLocalIsLoading(false);
				setExcludedRoles(
					useAppStore
						.getState()
						.groupRoles.filter((value) => !value.isLeader)
						.map((value) => String(value.id)),
				);
			},
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setData(generateReflowData());
	}, [
		hierarchies,
		groups,
		groupsById,
		groupIdToStartWith,
		showGroupTypes,
		excludedRoles,
		excludedGroupTypes,
		excludedGroups,
	]);

	return (
		<div className="p-4">
			<div className="flex w-full items-center justify-between gap-6 border-0 border-b border-solid px-6 py-3.5 text-lg">
				<div className="flex grow gap-6 divide-x font-bold">
					<div className="flex h-7 items-baseline gap-4">
						<span>ChurchTools Organigramm</span>
					</div>
				</div>
			</div>
			{isLoading ? (
				<div className='h-full w-full flex-col items-center justify-center'>
					<Loading>Daten werden geladen.</Loading>
				</div>
			) : (
				<div className="h-[calc(100vh-12.25rem)] w-full">
					<ReactFlow
						nodes={data.nodes}
						edges={data.edges}
						nodesDraggable={false}
						zoomOnScroll
						panOnDrag
						fitView
						edgesFocusable={false}
						onNodeClick={onNodeClick}
						nodeTypes={nodeTypes}
					>
						<MiniMap />
						<Background />
						{!isLoading && (
							<Panel position="top-left" className="h-3/4 w-1/4">
								<div
									className="rounded-md border border-slate-100 bg-slate-50 p-2 shadow-sm"
								>
									{renderSelectGroupToStartWith()}
									{renderSelectExcludedGroupTypes()}
									{renderSelectExcludedGroups()}
									{renderSelectExcludedGroupRoles()}
									{renderDisplayOptions()}
									<ButtonDropdown className="mt-3">
										<ButtonDropdown.Item main onClick={didPressDownloadGraphML}>
											Export als GraphML Datei
										</ButtonDropdown.Item>
									</ButtonDropdown>
									<Description title="Section Title" content="Data about this section." className='pt-10' />
								</div>
							</Panel>
						)}
					</ReactFlow>
				</div>
			)}
		</div>
	);
});
