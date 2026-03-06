import { AlertTriangle, ChevronDown, ChevronUp, Download, History, Loader2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import changelog from '../../changelog.json';
import { Strings } from '../../globals/Strings';
import { downloadTextFile } from '../../helpers/downloadTextFile';
import { useGroups } from '../../queries/useGroups';
import { useHierarchies } from '../../queries/useHierarchies';
import { useGenerateGraphMLData } from '../../selectors/useGenerateGraphMLData';
import { useGenerateSVGData } from '../../selectors/useGenerateSVGData';
import { useGroupsById } from '../../selectors/useGroupsById';
import { useAppStore } from '../../state/useAppStore';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ExclusionFilters } from './ExclusionFilters';
import { LayoutSelect } from './LayoutSelect';
import { OrphanedGroupsWizard } from './OrphanedGroupsWizard';
import { PresetManager } from './PresetManager';
import { StartGroupSelect } from './StartGroupSelect';

export const Sidebar = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
    const groupsById = useGroupsById();
    const generateGraphMLData = useGenerateGraphMLData();
    const generateSVGData = useGenerateSVGData();
    const { data: groups } = useGroups();
    const { data: hierarchies } = useHierarchies();

    const isExporting = useAppStore((s) => s.isExporting);

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
            .filter((group) => !hierarchyGroupIds.has(group.id))
            .map((group) => group.name)
            .sort((a, b) => a.localeCompare(b));
    }, [groups, hierarchies]);

    const getFileName = useCallback(
        (extension: string) => {
            const groupName = groupIdToStartWith ? groupsById[Number(groupIdToStartWith)]?.name : undefined;
            const dateStr = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date());

            return groupName
                ? `Gruppenorganigramm-${groupName}-${dateStr}.${extension}`
                : `Organigramm-${dateStr}.${extension}`;
        },
        [groupIdToStartWith, groupsById],
    );

    const didPressDownloadGraphML = useCallback(() => {
        downloadTextFile(generateGraphMLData(), getFileName('graphml'), document);
    }, [generateGraphMLData, getFileName]);

    const didPressDownloadSVG = useCallback(() => {
        downloadTextFile(generateSVGData(), getFileName('svg'), document);
    }, [generateSVGData, getFileName]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                Daten werden geladen.
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-md border border-slate-100 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Organigramm</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <PresetManager />
                <div className="my-4 border-t border-slate-200 dark:border-slate-700" />
                <StartGroupSelect />
                <LayoutSelect />
                <div className="my-4 border-t border-slate-200 dark:border-slate-700" />
                <ExclusionFilters />

                <div className="mt-4 flex flex-col gap-4">
                {orphanedGroups.length > 0 && (
                    <div className="rounded-md bg-amber-50 p-4 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                        <div className="flex items-center gap-2 font-semibold">
                            <AlertTriangle className="size-4" />
                            <span>Verwaiste Gruppen ({orphanedGroups.length})</span>
                        </div>
                        <p className="mt-1 text-xs opacity-90">
                            Diese Gruppen haben keine Verbindung zu anderen Gruppen im aktuellen Filter:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {orphanedGroups.slice(0, 10).map((name) => (
                                <span
                                    className="inline-flex items-center rounded border border-amber-200/50 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/40 dark:text-amber-300"
                                    key={name}
                                >
                                    {name}
                                </span>
                            ))}
                            {orphanedGroups.length > 10 && (
                                <span className="text-[10px] italic opacity-70">
                                    und {orphanedGroups.length - 10} weitere...
                                </span>
                            )}
                        </div>
                        <OrphanedGroupsWizard />
                    </div>
                )}

                <Button className="w-full" disabled={isExporting} onClick={didPressDownloadSVG} variant="outline">
                    <Download className="size-4" />
                    Export als SVG Datei
                </Button>
                <Button className="w-full" disabled={isExporting} onClick={didPressDownloadGraphML} variant="outline">
                    <Download className="size-4" />
                    Export als GraphML Datei
                </Button>

                <Collapsible onOpenChange={setIsHelpOpen} open={isHelpOpen}>
                    <CollapsibleTrigger asChild>
                        <Button className="w-full" size="sm" variant="ghost">
                            {isHelpOpen ? Strings.hideHelp : Strings.showHelp}
                            {isHelpOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="mt-2 space-y-1">
                            <h6 className="text-sm font-semibold">{Strings.helpTitle}</h6>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{Strings.helpText}</p>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <div className="mt-2 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-end justify-between">
                        <div>
                            <h6 className="font-semibold">{Strings.versionTitle}</h6>
                            <p>{import.meta.env.VITE_VERSION}</p>
                        </div>
                        <Dialog onOpenChange={setIsChangelogOpen} open={isChangelogOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-7 px-2 text-[10px]" size="sm" variant="outline">
                                    <History className="mr-1 size-3" />
                                    {Strings.showChangelog}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <History className="size-5" />
                                        {Strings.changelogTitle}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="max-h-[60vh] overflow-y-auto pr-2">
                                    {changelog.versions.map((v) => (
                                        <div className="mb-6 last:mb-0" key={v.version}>
                                            <div className="mb-2 flex items-baseline justify-between border-b border-slate-100 pb-1 dark:border-slate-800">
                                                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                                                    v{v.version}
                                                </span>
                                                <span className="text-[10px] text-slate-500">{v.date}</span>
                                            </div>
                                            <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                                                {v.changes.map((change, i) => (
                                                    <li className="leading-relaxed" key={i}>
                                                        {change}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div>
                        <h6 className="font-semibold">{Strings.aboutTitle}</h6>
                        <p>{Strings.aboutText}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
});
