import React, { useCallback, useState } from 'react';

import { Save, Trash2 } from 'lucide-react';

import { usePresets, type Preset, type UserSettings } from '../../hooks/useUserSettings';
import { useAppStore } from '../../state/useAppStore';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export const PresetManager = React.memo(() => {
	const [selectedPresetName, setSelectedPresetName] = useState('');
	const [newPresetName, setNewPresetName] = useState('');
	const [isSaveOpen, setIsSaveOpen] = useState(false);

	const { presets, savePresets } = usePresets();
	const setAllSettings = useAppStore((s) => s.setAllSettings);

	const snapshotSettings = useCallback((): UserSettings => {
		const s = useAppStore.getState();
		return {
			excludedGroups: s.excludedGroups,
			excludedGroupTypes: s.excludedGroupTypes,
			excludedRoles: s.excludedRoles,
			filteredAgeGroupIds: s.filteredAgeGroupIds,
			filteredCampusIds: s.filteredCampusIds,
			filteredGroupCategoryIds: s.filteredGroupCategoryIds,
			groupIdToStartWith: s.groupIdToStartWith,
			hideIndirectSubgroups: s.hideIndirectSubgroups,
			includedGroupStatuses: s.includedGroupStatuses,
			includedGroups: s.includedGroups,
			layoutAlgorithm: s.layoutAlgorithm,
			maxDepth: s.maxDepth,
			showGroupTypes: s.showGroupTypes,
			showOnlyDirectChildren: s.showOnlyDirectChildren,
		};
	}, []);

	const handleLoadPreset = useCallback(
		(name: string) => {
			const preset = presets.find((p) => p.name === name);
			if (preset) {
				setAllSettings(preset.settings);
				setSelectedPresetName(name);
			}
		},
		[presets, setAllSettings],
	);

	const handleSavePreset = useCallback(() => {
		const settings = snapshotSettings();
		const exists = presets.some((p) => p.name === newPresetName);
		const updatedPresets: Preset[] = exists
			? presets.map((p) => (p.name === newPresetName ? { ...p, settings } : p))
			: [...presets, { name: newPresetName, settings }];

		savePresets(updatedPresets);
		setIsSaveOpen(false);
		setSelectedPresetName(newPresetName);
	}, [newPresetName, presets, savePresets, snapshotSettings]);

	const handleDeletePreset = useCallback(() => {
		const filtered = presets.filter((p) => p.name !== selectedPresetName);
		savePresets(filtered);
		setSelectedPresetName('');
	}, [presets, savePresets, selectedPresetName]);

	const handleOpenSaveDialog = useCallback(
		(open: boolean) => {
			if (open) {
				setNewPresetName(selectedPresetName);
			}
			setIsSaveOpen(open);
		},
		[selectedPresetName],
	);

	return (
		<div className="flex flex-col gap-2">
			<h5 className="text-sm font-semibold">Presets</h5>
			<div className="flex items-center gap-2">
				<Select onValueChange={handleLoadPreset} value={selectedPresetName || undefined}>
					<SelectTrigger className="flex-1">
						<SelectValue placeholder="Preset wählen..." />
					</SelectTrigger>
					<SelectContent>
						{presets.map((preset) => (
							<SelectItem key={preset.name} value={preset.name}>
								{preset.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Dialog onOpenChange={handleOpenSaveDialog} open={isSaveOpen}>
					<DialogTrigger asChild>
						<Button size="icon" title="Speichern" variant="outline">
							<Save className="size-4" />
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Preset speichern</DialogTitle>
						</DialogHeader>
						<div className="flex flex-col gap-3">
							<input
								className="h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-slate-950 focus:outline-none dark:border-slate-700"
								onChange={(e) => setNewPresetName(e.target.value)}
								placeholder="Preset-Name"
								value={newPresetName}
							/>
							<Button disabled={!newPresetName.trim()} onClick={handleSavePreset}>
								Speichern
							</Button>
						</div>
					</DialogContent>
				</Dialog>

				<Button
					disabled={!selectedPresetName}
					onClick={handleDeletePreset}
					size="icon"
					title="Löschen"
					variant="outline"
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
		</div>
	);
});
