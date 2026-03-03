import React, { useMemo } from "react";
import { Handle, Position } from "reactflow";

import type { getColorForGroupType } from '../../globals/Colors';
import type { Group } from '../../types/Group';
import type { GroupMember } from "../../types/GroupMember";
import type { GroupRole } from "../../types/GroupRole";
import type { Person } from "../../types/Person";

import { useAppStore } from "../../state/useAppStore";
import { Badge } from '../ui/badge';

export interface PreviewGraphNodeData {
	color: ReturnType<typeof getColorForGroupType>;
	group: Group;
	groupTypeName: string;
	id: number;
	members: GroupMember[];
    metadata: string;
    personsById: Record<number, Person>;
    roles: GroupRole[];
    title: string;
}

export interface PreviewGraphNodeProps {
	data: PreviewGraphNodeData;
}

export const PreviewGraphNode = React.memo(({ data }: PreviewGraphNodeProps) => {
    const showGroupTypes = useAppStore((s) => s.showGroupTypes);

	const backgroundColor = useMemo(() => data.color.shades[100], [data.color.shades]);
    const borderColor = useMemo(() => data.color.shades[300], [data.color.shades]);

    const renderedRoles = useMemo(() => {
        return data.roles
            .flatMap((role) => {
                const personsInRole = data.members.filter(m => m.groupTypeRoleId === role.id);
                if (personsInRole.length === 0) return [];

                return [(
                    <div className="mb-2" key={role.id}>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {role.name}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {personsInRole.map(member => {
                                const person = data.personsById[member.personId];
                                const name = `${person.firstName} ${person.lastName}`;
                                return (
                                    <Badge className="text-[10px]" key={member.personId} variant="secondary">
                                        {name}
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                )];
            });
    }, [data.roles, data.members, data.personsById]);

	return (
		<div 
            className="flex min-w-[220px] max-w-[300px] flex-col overflow-hidden rounded-xl border-2 bg-white dark:bg-slate-900 shadow-lg transition-shadow hover:shadow-xl"
            style={{ borderColor }}
        >
			<Handle 
                className="z-10 !size-3 border-2 border-white dark:border-slate-900 !bg-slate-400 dark:!bg-slate-500" 
                position={Position.Left} 
                type="target" 
            />
			
            <div 
                className="flex flex-col gap-1 border-b-2 px-4 py-3"
                style={{ backgroundColor, borderColor }}
            >
                <h3 className="m-0 text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
                    {data.title}
                </h3>
                {showGroupTypes && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 opacity-80">
                        {data.groupTypeName}
                    </span>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-4">
                {renderedRoles.length > 0 ? (
                    <div className="flex flex-col">
                        {renderedRoles}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Keine Rollenbesetzung hinterlegt.
                    </p>
                )}
            </div>

			<Handle 
                className="z-10 !size-3 border-2 border-white dark:border-slate-900 !bg-slate-400 dark:!bg-slate-500" 
                position={Position.Right} 
                type="source" 
            />
		</div>
	);
});
