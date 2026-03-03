import type { URecord } from '@ainias42/js-helper';

import React, { useMemo } from 'react';
import { Handle, Position } from 'reactflow';

import { oklchToHex, type getColorForGroupType } from '../../globals/Colors';
import type { Group } from '../../types/Group';
import type { GroupMember } from '../../types/GroupMember';
import type { GroupRole } from '../../types/GroupRole';
import type { Person } from '../../types/Person';

import { useAppStore } from '../../state/useAppStore';
import { LayoutAlgorithm } from '../../types/LayoutAlgorithm';
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

	const nodeStyle = useMemo(
		() =>
			({
				'--node-bg-dark': oklchToHex(data.color.shades[900]),
				'--node-bg-light': oklchToHex(data.color.shades[100]),
				'--node-border-dark': oklchToHex(data.color.shades[700]),
				'--node-border-light': oklchToHex(data.color.shades[300]),
			}) as React.CSSProperties,
		[data.color.shades],
	);

	const renderedRoles = useMemo(() => {
		return data.roles.flatMap((role) => {
			const personsInRole = data.members.filter((m) => m.groupTypeRoleId === role.id);
			if (personsInRole.length === 0) return [];

			return [
				<div className="mb-2" key={role.id}>
					<span className="text-md font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
						{role.name}
					</span>
					<div className="mt-1 flex flex-wrap gap-1">
						{personsInRole.map((member) => {
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
				</div>,
			];
		});
	}, [data.roles, data.members, data.personsById]);

	const hasMembers = renderedRoles.length > 0;
	const isVertical =
		layoutAlgorithm === LayoutAlgorithm.elkLayeredTB ||
		layoutAlgorithm === LayoutAlgorithm.elkMrTree ||
		layoutAlgorithm === LayoutAlgorithm.elkRadial;
	return (
		<div
			className="flex max-w-[300px] min-w-[220px] flex-col overflow-hidden rounded-xl border-2 border-[var(--node-border-light)] bg-white shadow-lg transition-shadow hover:shadow-xl dark:border-[var(--node-border-dark)] dark:bg-slate-900"
			style={nodeStyle}
		>
			<Handle
				className="z-10 !size-3 border-2 border-white !bg-slate-400 dark:border-slate-900 dark:!bg-slate-500"
				position={isVertical ? Position.Top : Position.Left}
				type="target"
			/>

			<div
				className={`flex flex-col items-center justify-center gap-1 border-[var(--node-border-light)] bg-[var(--node-bg-light)] px-4 py-3 dark:border-[var(--node-border-dark)] dark:bg-[var(--node-bg-dark)] ${hasMembers ? 'border-b-2' : ''}`}
			>
				<h3 className="m-0 text-center text-base leading-tight font-bold text-slate-900 dark:text-slate-100">
					{data.title}
				</h3>
				{showGroupTypes && (
					<span className="text-md text-center font-bold tracking-widest text-slate-500 uppercase opacity-80 dark:text-slate-400">
						{data.groupTypeName}
					</span>
				)}
			</div>
			{hasMembers && (
				<div className="bg-white p-4 dark:bg-slate-900">
					<div className="flex flex-col">{renderedRoles}</div>
				</div>
			)}

			<Handle
				className="z-10 !size-3 border-2 border-white !bg-slate-400 dark:border-slate-900 dark:!bg-slate-500"
				position={isVertical ? Position.Bottom : Position.Right}
				type="source"
			/>
		</div>
	);
});
