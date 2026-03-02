import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MultiSelectOption {
	value: string;
	label: string;
}

export interface MultiSelectProps {
	options: MultiSelectOption[];
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
}

function TagRemoveButton({ val, onRemove }: { val: string; onRemove: (val: string) => void }) {
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

function OptionButton({ option, isSelected, onToggle }: { option: MultiSelectOption; isSelected: boolean; onToggle: (val: string) => void }) {
	const handleClick = React.useCallback(() => {
		onToggle(option.value);
	}, [option.value, onToggle]);

	return (
		<button
			key={option.value}
			type="button"
			onClick={handleClick}
			className={cn(
				'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-slate-100',
				isSelected && 'bg-slate-50',
			)}
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

export function MultiSelect({ options, value, onChange, placeholder, className }: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
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
		<div ref={containerRef} className={cn('relative', className)}>
			<button
				type="button"
				onClick={toggleOpen}
				className="flex min-h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white focus:outline-none focus:ring-1 focus:ring-slate-950"
			>
				<span className="flex flex-1 flex-wrap gap-1 text-left">
					{selectedLabels.length > 0 ? (
						selectedLabels.map((label, i) => (
							<span
								key={value[i]}
								className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs"
							>
								{label}
								<TagRemoveButton val={value[i]} onRemove={toggleValue} />
							</span>
						))
					) : (
						<span className="text-slate-500">{placeholder}</span>
					)}
				</span>
				<ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
			</button>

			{open && (
				<div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-md">
					{options.map((option) => (
						<OptionButton
							key={option.value}
							option={option}
							isSelected={value.includes(option.value)}
							onToggle={toggleValue}
						/>
					))}
				</div>
			)}
		</div>
	);
}
