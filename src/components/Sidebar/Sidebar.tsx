import { Button, ButtonDropdown, Description, Loading } from '@geist-ui/core';
import { ChevronDown, ChevronUp } from '@geist-ui/icons';
import { ExclusionFilters } from './ExclusionFilters';
import { StartGroupSelect } from './StartGroupSelect';
import { Strings } from '../../globals/Strings';
import { UnmountClosed } from 'react-collapse';
import { downloadTextFile } from '../../helpers/downloadTextFile';
import { useAppStore } from '../../state/useAppStore';
import { useGenerateGraphMLData } from '../../selectors/useGenerateGraphMLData';
import { useGroupsById } from '../../selectors/useGroupsById';
import React, { useCallback, useState } from 'react';
import moment from 'moment';

export const Sidebar = React.memo(({ isLoading }: { isLoading: boolean }) => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const { groupIdToStartWith } = useAppStore();
    const groupsById = useGroupsById();
    const generateGraphMLData = useGenerateGraphMLData();

    const didPressToggleHelp = useCallback(() => {
        setIsHelpOpen(!isHelpOpen);
    }, [isHelpOpen]);

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

    const GeistButton = Button as any;

    if (isLoading) return <Loading>Daten werden geladen.</Loading>;

    return (
        <div className="h-full overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-4 shadow-sm">
            <StartGroupSelect />
            <div className="my-4 border-t border-slate-200" />
            <ExclusionFilters />
            
            <div className="mt-6 flex flex-col gap-4">
                <ButtonDropdown className="w-full">
                    <ButtonDropdown.Item main onClick={didPressDownloadGraphML}>
                        Export als GraphML Datei
                    </ButtonDropdown.Item>
                </ButtonDropdown>

                <GeistButton
                    iconRight={isHelpOpen ? <ChevronUp /> : <ChevronDown />}
                    onClick={didPressToggleHelp}
                    scale={1/2}
                >
                    {isHelpOpen ? Strings.hideHelp : Strings.showHelp}
                </GeistButton>

                <UnmountClosed isOpened={isHelpOpen}>
                    <Description
                        title={Strings.helpTitle}
                        content={Strings.helpText}
                        paddingTop={1}
                    />
                </UnmountClosed>

                <div className="mt-2 text-xs text-slate-500">
                    <Description
                        title={Strings.versionTitle}
                        content={process.env.REACT_APP_VERSION}
                    />
                    <Description
                        title={Strings.aboutTitle}
                        content={Strings.aboutText}
                        paddingTop={1}
                    />
                </div>
            </div>
        </div>
    );
});
