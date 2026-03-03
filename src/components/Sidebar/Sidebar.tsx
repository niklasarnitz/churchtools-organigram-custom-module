import { AlertTriangle, ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import { useReactFlow } from 'reactflow';

import { Strings } from '../../globals/Strings';
import { downloadTextFile } from '../../helpers/downloadTextFile';
import { exportReactFlowToSVG } from '../../helpers/exportSvg';
import { useGroups } from '../../queries/useGroups';
import { useHierarchies } from '../../queries/useHierarchies';
import { useGenerateGraphMLData } from '../../selectors/useGenerateGraphMLData';
import { useGroupsById } from '../../selectors/useGroupsById';
import { useAppStore } from '../../state/useAppStore';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ExclusionFilters } from './ExclusionFilters';
import { LayoutSelect } from './LayoutSelect';
import { OrphanedGroupsWizard } from './OrphanedGroupsWizard';
import { StartGroupSelect } from './StartGroupSelect';

export const Sidebar = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
    const groupsById = useGroupsById();
    const generateGraphMLData = useGenerateGraphMLData();
    const { data: groups } = useGroups();
    const { data: hierarchies } = useHierarchies();
    const { getNodes } = useReactFlow();

    const isExporting = useAppStore((s) => s.isExporting);
    const setIsExporting = useAppStore((s) => s.setIsExporting);
    const pendingExport = useAppStore((s) => s.pendingExport);

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


    const getFileName = useCallback((extension: string) => {
        const groupName = groupIdToStartWith
            ? groupsById[Number(groupIdToStartWith)]?.name
            : undefined;

        return groupName
            ? `Gruppenorganigramm-${groupName}-${moment().format('LD')}.${extension}`
            : `Organigramm-${moment().format('LD')}.${extension}`;
    }, [groupIdToStartWith, groupsById]);

    const didPressDownloadGraphML = useCallback(() => {
        downloadTextFile(generateGraphMLData(), getFileName('graphml'), document);
    }, [generateGraphMLData, getFileName]);

    const didPressDownloadSVG = useCallback(async () => {
        setIsExporting(true);
        try {
            const nodes = getNodes();
            if (nodes.length === 0) return;

            const minX = Math.min(...nodes.map((n) => n.position.x));
            const minY = Math.min(...nodes.map((n) => n.position.y));
            const maxX = Math.max(...nodes.map((n) => n.position.x + (n.width ?? 0)));
            const maxY = Math.max(...nodes.map((n) => n.position.y + (n.height ?? 0)));

            const width = maxX - minX + 100; // Add some padding
            const height = maxY - minY + 100;

            const translateX = -minX + 50;
            const translateY = -minY + 50;

            await exportReactFlowToSVG(width, height, getFileName('svg'), translateX, translateY);
        } finally {
            setIsExporting(false);
        }
    }, [getNodes, getFileName, setIsExporting]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                Daten werden geladen.
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 shadow-sm">
            <StartGroupSelect />
            <LayoutSelect />
            <div className="my-4 border-t border-slate-200 dark:border-slate-700" />
            <ExclusionFilters />

            <div className="mt-6 flex flex-col gap-4">
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
                                    className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/50"
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

                <Button
                    className="w-full"
                    disabled={isExporting}
                    onClick={didPressDownloadGraphML}
                    variant="outline"
                >
                    {isExporting && pendingExport?.type === 'graphml' ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Download className="size-4" />
                    )}
                    Export als GraphML Datei
                </Button>

                <Button
                    className="w-full"
                    disabled={isExporting}
                    onClick={didPressDownloadSVG}
                    variant="outline"
                >
                    {isExporting && (!pendingExport || pendingExport.type === 'svg') ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Download className="size-4" />
                    )}
                    Export als SVG Datei
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
                    <div>
                        <h6 className="font-semibold">{Strings.versionTitle}</h6>
                        <p>{import.meta.env.VITE_VERSION}</p>
                    </div>
                    <div>
                        <h6 className="font-semibold">{Strings.aboutTitle}</h6>
                        <p>{Strings.aboutText}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
