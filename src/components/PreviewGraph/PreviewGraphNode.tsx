import type { URecord } from "@ainias42/js-helper";

import React, { useMemo } from "react";
import { Handle, Position } from "reactflow";

import type { getColorForGroupType } from '../../globals/Colors';
import type { Group } from '../../types/Group';
import type { GroupMember } from "../../types/GroupMember";
import type { GroupRole } from "../../types/GroupRole";
import type { Person } from "../../types/Person";

import { useAppStore } from "../../state/useAppStore";
import { LayoutAlgorithm } from "../../types/LayoutAlgorithm";
import { Badge } from '../ui/badge';

export interface PreviewGraphNodeData {
    color: ReturnType<typeof getColorForGroupType>;
    group: Group;
    groupTypeName: string;
    id: number;
    members: GroupMember[];
    metadata: string;
    personsById: URecord<number, Person>;
    roles: GroupRole[];
    title: string;
}

export interface PreviewGraphNodeProps {
    data: PreviewGraphNodeData;
}

export const PreviewGraphNode = React.memo(({ data }: PreviewGraphNodeProps) => {
    const showGroupTypes = useAppStore((s) => s.showGroupTypes);
    const layoutAlgorithm = useAppStore((s) => s.layoutAlgorithm);

    const nodeStyle = useMemo(() => ({
        '--node-bg-dark': data.color.shades[900],
        '--node-bg-light': data.color.shades[100],
        '--node-border-dark': data.color.shades[700],
        '--node-border-light': data.color.shades[300],
    } as React.CSSProperties), [data.color.shades]);

    const renderedRoles = useMemo(() => {
        return data.roles
            .flatMap((role) => {
                const personsInRole = data.members.filter(m => m.groupTypeRoleId === role.id);
                if (personsInRole.length === 0) return [];

                return [(
                    <div className="mb-2" key={role.id}>
                        <span className="text-md font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {role.name}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {personsInRole.map(member => {
                                const person = data.personsById[member.personId];
                                if (!person) {
                                    return (
                                        <Badge className="text-md" key={member.personId} variant="secondary">
                                            Unknown Person
                                        </Badge>
                                    );
                                }
                                const name = `${person.firstName} ${person.lastName}`;
                                return (
                                    <Badge className="text-md" key={member.personId} variant="secondary">
                                        {name}
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                )];
            });
    }, [data.roles, data.members, data.personsById]);

    const hasMembers = renderedRoles.length > 0;
    const isVertical =
        layoutAlgorithm === LayoutAlgorithm.elkLayeredTB ||
        layoutAlgorithm === LayoutAlgorithm.elkMrTree ||
        layoutAlgorithm === LayoutAlgorithm.elkRadial;
    return (
        <div
            className="flex min-w-[220px] max-w-[300px] flex-col overflow-hidden rounded-xl border-2 bg-white dark:bg-slate-900 shadow-lg transition-shadow hover:shadow-xl border-[var(--node-border-light)] dark:border-[var(--node-border-dark)]"
            style={nodeStyle}
        >
            <Handle
                className="z-10 !size-3 border-2 border-white dark:border-slate-900 !bg-slate-400 dark:!bg-slate-500"
                position={isVertical ? Position.Top : Position.Left}
                type="target"
            />

            <div
                className={`flex flex-col items-center justify-center gap-1 px-4 py-3 bg-[var(--node-bg-light)] border-[var(--node-border-light)] dark:bg-[var(--node-bg-dark)] dark:border-[var(--node-border-dark)] ${hasMembers ? 'border-b-2' : ''}`}
            >
                <h3 className="m-0 text-center text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
                    {data.title}
                </h3>
                {showGroupTypes && (
                    <span className="text-center text-md font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 opacity-80">
                        {data.groupTypeName}
                    </span>
                )}
            </div>
            {hasMembers && (
                <div className="bg-white dark:bg-slate-900 p-4">
                    <div className="flex flex-col">
                        {renderedRoles}
                    </div>
                </div>
            )}

            <Handle
                className="z-10 !size-3 border-2 border-white dark:border-slate-900 !bg-slate-400 dark:!bg-slate-500"
                position={isVertical ? Position.Bottom : Position.Right}
                type="source"
            />
        </div>
    );
});
