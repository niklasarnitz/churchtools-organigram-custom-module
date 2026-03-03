import { AlertTriangle, ChevronDown, ChevronUp, Download, FileText, Image, Loader2 } from 'lucide-react';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';

import { Strings } from '../../globals/Strings';
import { downloadTextFile } from '../../helpers/downloadTextFile';
import { useGenerateGraphMLData } from '../../selectors/useGenerateGraphMLData';
import { useGenerateReflowData } from '../../selectors/useGenerateReflowData';
import { useGroupsById } from '../../selectors/useGroupsById';
import { useAppStore } from '../../state/useAppStore';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ExclusionFilters } from './ExclusionFilters';
import { LayoutSelect } from './LayoutSelect';
import { StartGroupSelect } from './StartGroupSelect';

export const Sidebar = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
    const groupsById = useGroupsById();
    const generateGraphMLData = useGenerateGraphMLData();
    const data = useGenerateReflowData();

    const isExporting = useAppStore((s) => s.isExporting);
    const pendingExport = useAppStore((s) => s.pendingExport);
    const setPendingExport = useAppStore((s) => s.setPendingExport);

    const orphanedGroups = useMemo(() => {
        const edgeNodeIds = new Set<string>();
        for (const edge of data.edges) {
            edgeNodeIds.add(edge.source);
            edgeNodeIds.add(edge.target);
        }

        return data.nodes
            .filter((node) => !edgeNodeIds.has(node.id))
            .map((node) => groupsById[Number(node.id)].name)
            .filter(Boolean);
    }, [data.nodes, data.edges, groupsById]);

    const getFileName = useCallback((extension: string) => {
        const groupName = groupIdToStartWith
            ? groupsById[Number(groupIdToStartWith)].name
            : undefined;

        return groupName
            ? `Gruppenorganigramm-${groupName}-${moment().format('LD')}.${extension}`
            : `Organigramm-${moment().format('LD')}.${extension}`;
    }, [groupIdToStartWith, groupsById]);

    const didPressDownloadGraphML = useCallback(() => {
        downloadTextFile(generateGraphMLData(), getFileName('graphml'), document);
    }, [generateGraphMLData, getFileName]);

    const didPressDownloadPNG = useCallback(() => {
        setPendingExport({ fileName: getFileName('png'), type: 'png' });
    }, [getFileName, setPendingExport]);

    const didPressDownloadPDF = useCallback(() => {
        setPendingExport({ fileName: getFileName('pdf'), type: 'pdf' });
    }, [getFileName, setPendingExport]);

    const didPressDownloadSVG = useCallback(() => {
        setPendingExport({ fileName: getFileName('svg'), type: 'svg' });
    }, [getFileName, setPendingExport]);

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
                            <br />
                            <span className="italic">{orphanedGroups.join(', ')}</span>
                        </p>
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

                <div className="grid grid-cols-3 gap-2">
                    <Button 
                        className="grow" 
                        disabled={isExporting} 
                        onClick={didPressDownloadPNG} 
                        variant="outline"
                    >
                        {isExporting && pendingExport?.type === 'png' ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Image className="size-4" />
                        )}
                        PNG
                    </Button>
                    <Button 
                        className="grow" 
                        disabled={isExporting} 
                        onClick={didPressDownloadPDF} 
                        variant="outline"
                    >
                        {isExporting && pendingExport?.type === 'pdf' ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <FileText className="size-4" />
                        )}
                        PDF
                    </Button>
                    <Button 
                        className="grow" 
                        disabled={isExporting} 
                        onClick={didPressDownloadSVG} 
                        variant="outline"
                    >
                        {isExporting && pendingExport?.type === 'svg' ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <FileText className="size-4" />
                        )}
                        SVG
                    </Button>
                </div>

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
