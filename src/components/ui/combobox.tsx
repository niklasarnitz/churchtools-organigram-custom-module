import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
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

export interface ComboboxOption {
	label: string;
	value: string;
}

export interface ComboboxProps {
	className?: string;
	onValueChange: (value: string) => void;
	options: ComboboxOption[];
	placeholder?: string;
	value?: string;
}

export function Combobox({ className, onValueChange, options, placeholder, value }: ComboboxProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className={cn('w-full justify-between font-normal', className)}
					role="combobox"
					variant="outline"
				>
					<span className="truncate">
						{value
							? options.find((option) => option.value === value)?.label
							: (placeholder ?? 'Auswählen...')}
					</span>
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
										onValueChange(option.value === value ? '' : option.value);
										setOpen(false);
									}}
									value={option.label}
								>
									<Check
										className={cn(
											'mr-2 h-4 w-4',
											value === option.value ? 'opacity-100' : 'opacity-0',
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
