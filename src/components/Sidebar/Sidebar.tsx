import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ExclusionFilters } from './ExclusionFilters';
import { StartGroupSelect } from './StartGroupSelect';
import { Strings } from '../../globals/Strings';
import { downloadTextFile } from '../../helpers/downloadTextFile';
import { useAppStore } from '../../state/useAppStore';
import { useGenerateGraphMLData } from '../../selectors/useGenerateGraphMLData';
import { useGroupsById } from '../../selectors/useGroupsById';
import React, { useCallback, useState } from 'react';
import moment from 'moment';

export const Sidebar = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const groupIdToStartWith = useAppStore((s) => s.groupIdToStartWith);
    const groupsById = useGroupsById();
    const generateGraphMLData = useGenerateGraphMLData();

    const didPressDownloadGraphML = useCallback(() => {
        const groupName = groupIdToStartWith
            ? (groupsById[Number(groupIdToStartWith)]
                ? groupsById[Number(groupIdToStartWith)].name
                : undefined)
            : undefined;

        const fileName = groupName
            ? `Gruppenorganigramm-${groupName}-${moment().format('LD')}.graphml`
            : `Organigramm-${moment().format('LD')}.graphml`;

        downloadTextFile(generateGraphMLData(), fileName, document);
    }, [groupIdToStartWith, groupsById, generateGraphMLData]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Daten werden geladen.
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-4 shadow-sm">
            <StartGroupSelect />
            <div className="my-4 border-t border-slate-200" />
            <ExclusionFilters />
            
            <div className="mt-6 flex flex-col gap-4">
                <Button variant="outline" className="w-full" onClick={didPressDownloadGraphML}>
                    <Download className="size-4" />
                    Export als GraphML Datei
                </Button>

                <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full">
                            {isHelpOpen ? Strings.hideHelp : Strings.showHelp}
                            {isHelpOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="mt-2 space-y-1">
                            <h6 className="text-sm font-semibold">{Strings.helpTitle}</h6>
                            <p className="text-sm text-slate-600">{Strings.helpText}</p>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <div className="mt-2 space-y-2 text-xs text-slate-500">
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
