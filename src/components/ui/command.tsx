import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

const Command = React.forwardRef<
	React.ComponentRef<typeof CommandPrimitive>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
	<CommandPrimitive
		className={cn(
			'flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50',
			className,
		)}
		ref={ref}
		{...props}
	/>
));
Command.displayName = CommandPrimitive.displayName;

const CommandInput = React.forwardRef<
	React.ComponentRef<typeof CommandPrimitive.Input>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
	<div className="flex items-center border-b px-3 dark:border-slate-800" cmdk-input-wrapper="">
		<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
		<CommandPrimitive.Input
			className={cn(
				'flex h-10 w-full rounded-md bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100 dark:placeholder:text-slate-400',
				className,
			)}
			ref={ref}
			{...props}
		/>
	</div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
	React.ComponentRef<typeof CommandPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.List
		className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
		ref={ref}
		{...props}
	/>
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
	React.ComponentRef<typeof CommandPrimitive.Empty>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
	<CommandPrimitive.Empty className="py-6 text-center text-sm" ref={ref} {...props} />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
	React.ComponentRef<typeof CommandPrimitive.Group>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Group
		className={cn(
			'overflow-hidden p-1 text-slate-950 dark:text-slate-50 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500 dark:[&_[cmdk-group-heading]]:text-slate-400',
			className,
		)}
		ref={ref}
		{...props}
	/>
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
	React.ComponentRef<typeof CommandPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Separator
		className={cn('-mx-1 h-px bg-slate-200 dark:bg-slate-800', className)}
		ref={ref}
		{...props}
	/>
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
	React.ComponentRef<typeof CommandPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Item
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-slate-900 outline-none data-[disabled='true']:pointer-events-none data-[selected='true']:bg-slate-100 data-[selected='true']:text-slate-900 data-[disabled='true']:opacity-50 dark:text-slate-100 dark:data-[selected='true']:bg-slate-800 dark:data-[selected='true']:text-slate-50",
			className,
		)}
		ref={ref}
		{...props}
	/>
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn('ml-auto text-xs tracking-widest text-slate-500 dark:text-slate-400', className)}
			{...props}
		/>
	);
};
CommandShortcut.displayName = 'CommandShortcut';

export {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
};
