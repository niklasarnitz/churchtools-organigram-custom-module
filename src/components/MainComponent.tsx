import { ButtonDropdown, Loading, Select } from "@geist-ui/core";
import { Logger } from "../globals/Logger";
import { downloadTextFile } from "../helpers/downloadTextFile";
import { generateGraphMLData } from "../helpers/dataConverters/GraphMLConverter";
import { useAppStore } from "../state/useAppStore";
import React, { useCallback, useEffect, useState } from "react";
import _ from "lodash";
import moment from "moment";

export const MainComponent = React.memo(() => {
	// Zustand
	//  Fetch functions
	const fetchPersons = useAppStore((s) => s.fetchPersons);
	const fetchGroups = useAppStore((s) => s.fetchGroups);
	const fetchHierarchies = useAppStore((s) => s.fetchHierarchies);
	const fetchGroupTypes = useAppStore((s) => s.fetchGroupTypes);
	const fetchGroupRoles = useAppStore((s) => s.fetchGroupRoles);

	//  State variables
	const excludedRoles = useAppStore((s) => s.excludedRoles);
	const excludedGroupTypes = useAppStore((s) => s.excludedGroupTypes);
	const groupRoles = useAppStore((s) => s.groupRoles);
	const groupTypesById = useAppStore((s) => s.groupTypesById);
	const reducerIsLoading = useAppStore((s) => s.isLoading);
	const groupTypes = useAppStore((s) => s.groupTypes);

	//  State setters
	const setExcludedRoles = useAppStore((s) => s.setExcludedRoles);
	const setExcludedGroupTypes = useAppStore((s) => s.setExcludedGroupTypes);

	// Local state variables
	const [localIsLoading, setLocalIsLoading] = useState(false);

	// Helper values
	const isLoading = reducerIsLoading || localIsLoading;

	// Callbacks
	const didPressDownloadGraphML = useCallback(() => {
		Logger.log('Updating GraphML data.');

		Logger.log('Downloading generated GraphML file.');
		downloadTextFile(generateGraphMLData(),
			`Organigramm-${moment().format('DD-MM-YYYY-hh:mm:ss')}.graphml`,
			document,
		);
	}, []);

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
					{_.sortBy(
						groupTypes,
						(g) => g?.sortKey,
					).map((groupType) => {
						return (
							<Select.Option key={groupType.id} value={String(groupType.id)}>
								{groupType?.name}
							</Select.Option>
						);
					})}
				</Select>
			</div >
		);
	}, [excludedGroupTypes, groupTypes, setExcludedGroupTypes])

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
			</div >
		);
	}, [excludedGroupTypes, excludedRoles, groupRoles, groupTypesById, setExcludedRoles]);

	// Effects
	useEffect(() => {
		const groupTypes = new Set(excludedGroupTypes.map((value) => groupTypesById[value]));

		const roles = useAppStore.getState().groupRoles.filter((value) => !value.isLeader).map((value) => String(value.id))

		setExcludedRoles(
			roles.filter((value) => {
				const groupRole = groupRoles.find((groupRole) => groupRole.id === Number(value));
				return groupRole && !groupTypes.has(groupTypesById[groupRole.groupTypeId]);
			}).map(String),
		)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [excludedGroupTypes]);

	useEffect(() => {
		setLocalIsLoading(true);
		Promise.all([fetchPersons(), fetchGroups(true), fetchHierarchies(), fetchGroupTypes(), fetchGroupRoles()]).then(
			() => {
				setLocalIsLoading(false);
				setExcludedRoles(useAppStore.getState().groupRoles.filter((value) => !value.isLeader).map((value) => String(value.id)));
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
					{renderSelectExcludedGroupTypes()}
					{renderSelectExcludedGroupRoles()}
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
})