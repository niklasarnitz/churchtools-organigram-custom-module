import { Check, ChevronDown, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

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
	const containerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => { document.removeEventListener('mousedown', handleClickOutside); };
	}, []);

	const toggleValue = React.useCallback((val: string) => {
		if (value.includes(val)) {
			onChange(value.filter((v) => v !== val));
		} else {
			onChange([...value, val]);
		}
	}, [value, onChange]);

	const toggleOpen = React.useCallback(() => {
		setOpen((prev) => !prev);
	}, []);

	const selectedLabels = options
		.filter((o) => value.includes(o.value))
		.map((o) => o.label);

	return (
		<div className={cn('relative', className)} ref={containerRef}>
			<button
				className="flex min-h-9 w-full items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white dark:ring-offset-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-300"
				onClick={toggleOpen}
				type="button"
			>
				<span className="flex flex-1 flex-wrap gap-1 text-left">
					{selectedLabels.length > 0 ? (
						selectedLabels.map((label, i) => (
							<span
								className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs"
								key={value[i]}
							>
								{label}
								<TagRemoveButton onRemove={toggleValue} val={value[i]} />
							</span>
						))
					) : (
						<span className="text-slate-500 dark:text-slate-400">{placeholder}</span>
					)}
				</span>
				<ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
			</button>

			{open && (
				<div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-md">
					{options.map((option) => (
						<OptionButton
							isSelected={value.includes(option.value)}
							key={option.value}
							onToggle={toggleValue}
							option={option}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function OptionButton({ isSelected, onToggle, option }: { isSelected: boolean; onToggle: (val: string) => void; option: MultiSelectOption; }) {
	const handleClick = React.useCallback(() => {
		onToggle(option.value);
	}, [option.value, onToggle]);

	return (
		<button
			className={cn(
				'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-slate-100 dark:hover:bg-slate-800',
				isSelected && 'bg-slate-50 dark:bg-slate-800',
			)}
			key={option.value}
			onClick={handleClick}
			type="button"
		>
			<span>{option.label}</span>
			{isSelected && (
				<span className="absolute right-2 flex size-3.5 items-center justify-center">
					<Check className="size-4" />
				</span>
			)}
		</button>
	);
}

function TagRemoveButton({ onRemove, val }: { onRemove: (val: string) => void; val: string; }) {
	const handleClick = React.useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onRemove(val);
		},
		[val, onRemove],
	);

	return (
		<X
			className="size-3 cursor-pointer hover:text-slate-700"
			onClick={handleClick}
		/>
	);
}
