import { Check, ChevronsUpDown, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Badge } from './badge';
import { Button } from './button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface MultiSelectOption {
	label: string;
	value: string;
}

export interface MultiSelectProps {
	className?: string;
	onChange: (value: string[]) => void;
	options: MultiSelectOption[];
	placeholder?: string;
	value: string[];
}

export function MultiSelect({ className, onChange, options, placeholder, value }: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);

	const handleUnselect = React.useCallback(
		(val: string) => {
			onChange(value.filter((s) => s !== val));
		},
		[onChange, value],
	);

	const handleSelect = React.useCallback(
		(val: string) => {
			if (value.includes(val)) {
				onChange(value.filter((s) => s !== val));
			} else {
				onChange([...value, val]);
			}
		},
		[onChange, value],
	);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className={cn('h-auto min-h-9 w-full justify-between font-normal', className)}
					onClick={() => {
						setOpen(!open);
					}}
					role="combobox"
					variant="outline"
				>
					<div className="flex flex-wrap gap-1">
						{value.length > 0 ? (
							value.map((v) => {
								const option = options.find((o) => o.value === v);
								return (
									<Badge
										key={v}
										onClick={(e) => {
											e.stopPropagation();
											handleUnselect(v);
										}}
										variant="secondary"
									>
										{option?.label ?? v}
										<X className="ml-1 h-3 w-3 hover:text-destructive" />
									</Badge>
								);
							})
						) : (
							<span className="text-slate-500 dark:text-slate-400">{placeholder ?? 'Auswählen...'}</span>
						)}
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
				<Command>
					<CommandInput placeholder="Suchen..." />
					<CommandList>
						<CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									onSelect={() => {
										handleSelect(option.value);
									}}
									value={option.label}
								>
									<Check
										className={cn(
											'mr-2 h-4 w-4',
											value.includes(option.value) ? 'opacity-100' : 'opacity-0',
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
