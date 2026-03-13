import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useGroups } from '../../queries/useGroups';
import { useHierarchies } from '../../queries/useHierarchies';
import { useUpdateHierarchy } from '../../queries/useUpdateHierarchy';
import { Button } from '../ui/button';
import { Combobox } from '../ui/combobox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { MultiSelect } from '../ui/multi-select';

export const OrphanedGroupsWizard = () => {
	const { data: groups } = useGroups();
	const { data: hierarchies } = useHierarchies();
	const updateHierarchy = useUpdateHierarchy();

	const [isOpen, setIsOpen] = useState(false);
	const [processedGroupIds, setProcessedGroupIds] = useState<Set<number>>(new Set());
	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedParentId, setSelectedParentId] = useState<string>('');
	const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>([]);

	const orphanedGroups = useMemo(() => {
		if (!groups || !hierarchies) return [];

		const hierarchyGroupIds = new Set<number>();
		for (const h of hierarchies) {
			if (h.children.length > 0) {
				hierarchyGroupIds.add(h.groupId);
				for (const childId of h.children) {
					hierarchyGroupIds.add(childId);
				}
			}
		}

		return groups
			.filter((group) => !hierarchyGroupIds.has(group.id) && !processedGroupIds.has(group.id))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [groups, hierarchies, processedGroupIds]);

	const currentGroup = orphanedGroups[currentIndex];

	const resetSelection = (index: number) => {
		setCurrentIndex(index);
		setSelectedParentId('');
		setSelectedChildrenIds([]);
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (open) {
			resetSelection(0);
			setProcessedGroupIds(new Set());
		}
	};

	const handleSave = async () => {
		await updateHierarchy.mutateAsync({
			childrenIds: selectedChildrenIds.map(Number),
			groupId: currentGroup.id,
			parentId: selectedParentId ? Number(selectedParentId) : undefined,
		});

		// Add to processed so it disappears immediately from our local list
		setProcessedGroupIds((prev) => new Set(prev).add(currentGroup.id));

		// If it was the last one, close the dialog.
		if (orphanedGroups.length <= 1) {
			setIsOpen(false);
		} else {
			// Stay at the same index, because the current group will be filtered out
			// and the next group will move into this index.
			// If we were at the very last index, we move to the new last index.
			const nextIndex = currentIndex >= orphanedGroups.length - 1 ? Math.max(0, currentIndex - 1) : currentIndex;
			resetSelection(nextIndex);
		}
	};

	const groupOptions = useMemo(() => {
		if (!groups) return [];
		return groups
			.filter((g) => g.id !== currentGroup.id)
			.map((g) => ({
				label: g.name,
				value: String(g.id),
			}))
			.sort((a, b) => a.label.localeCompare(b.label));
	}, [groups, currentGroup]);

	if (orphanedGroups.length === 0) return null;

	return (
		<Dialog onOpenChange={handleOpenChange} open={isOpen}>
			<DialogTrigger asChild>
				<Button className="mt-2 w-full" variant="secondary">
					<AlertTriangle className="mr-2 size-4" />
					Gruppen verbinden
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Verwaiste Gruppen zuordnen</DialogTitle>
					<DialogDescription className="mt-1.5">
						<span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
							Schritt {currentIndex + 1} von {orphanedGroups.length}
						</span>
						<br />
						Ordne die Gruppe{' '}
						<strong className="text-slate-900 dark:text-slate-100">{currentGroup.name}</strong> zu.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-6 py-4">
					<div className="grid gap-2">
						<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
							Übergeordnete Gruppe (Eltern)
						</label>
						<Combobox
							onValueChange={setSelectedParentId}
							options={groupOptions}
							placeholder="Übergeordnete Gruppe wählen..."
							value={selectedParentId}
						/>
						<p className="text-muted-foreground text-xs">
							Diese Gruppe wird die neue übergeordnete Gruppe von {currentGroup.name}.
						</p>
					</div>

					<div className="grid gap-2">
						<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
							Untergeordnete Gruppen (Kinder)
						</label>
						<MultiSelect
							onChange={setSelectedChildrenIds}
							options={groupOptions}
							placeholder="Untergeordnete Gruppen wählen..."
							value={selectedChildrenIds}
						/>
						<p className="text-muted-foreground text-xs">
							Diese Gruppen werden Kinder von {currentGroup.name}.
						</p>
					</div>
				</div>

				<DialogFooter className="flex flex-row items-center justify-between border-t border-slate-100 pt-4 sm:justify-between dark:border-slate-800">
					<div className="flex gap-2">
						<Button
							disabled={currentIndex === 0}
							onClick={() => {
								resetSelection(currentIndex - 1);
							}}
							size="sm"
							variant="outline"
						>
							<ChevronLeft className="mr-1 size-4" />
							Zurück
						</Button>
						<Button
							disabled={currentIndex === orphanedGroups.length - 1}
							onClick={() => {
								resetSelection(currentIndex + 1);
							}}
							size="sm"
							variant="ghost"
						>
							Überspringen
							<ChevronRight className="ml-1 size-4" />
						</Button>
					</div>
					<Button
						disabled={updateHierarchy.isPending}
						onClick={() => {
							void handleSave();
						}}
						size="sm"
					>
						{updateHierarchy.isPending ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Save className="mr-2 size-4" />
						)}
						Speichern & Weiter
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
