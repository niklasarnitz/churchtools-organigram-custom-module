import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../state/useAppStore';
import { type PreviewGraphNodeData } from '../types/GraphNode';
import { type Node } from '../types/GraphTypes';

interface FloatingHeaderProps {
    nodes: Node[];
}

export const FloatingHeader = React.memo(({ nodes }: FloatingHeaderProps) => {
    const [open, setOpen] = useState(false);
    const setFocusNodeId = useAppStore((s) => s.setFocusNodeId);

    // Toggle the menu when ⌘K is pressed
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };

        document.addEventListener('keydown', down);
        return () => {
            document.removeEventListener('keydown', down);
        };
    }, []);

    const handleSelect = useCallback(
        (id: string) => {
            setOpen(false);
            if (!id) return;
            setFocusNodeId(id);
        },
        [setFocusNodeId],
    );

    const sortedNodes = useMemo(() => {
        return (nodes as Node<PreviewGraphNodeData>[]).slice().sort((a, b) => a.data.title.localeCompare(b.data.title));
    }, [nodes]);

    return (
        <div className="absolute top-6 left-1/2 z-50 flex w-full max-w-2xl -translate-x-1/2 items-center gap-4 px-4">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 font-bold shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
                <span className="text-blue-600 dark:text-blue-400">Organigramm</span>
            </div>
            <div className="group relative flex-1">
                <button
                    className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 text-sm text-slate-500 shadow-lg backdrop-blur-md transition-all hover:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-900"
                    onClick={() => {
                        setOpen(true);
                    }}
                >
                    <Search className="size-4" />
                    <span>Gruppe suchen...</span>
                    <kbd className="ml-auto flex items-center gap-1 rounded bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:bg-slate-800">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </button>

                <Command.Dialog
                    className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/20 pt-[20vh] backdrop-blur-sm"
                    label="Global Search"
                    onOpenChange={setOpen}
                    open={open}
                >
                    <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center border-b border-slate-100 px-4 dark:border-slate-800">
                            <Search className="mr-2 size-4 shrink-0 opacity-50" />
                            <Command.Input
                                autoFocus
                                className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Gruppe eingeben..."
                            />
                        </div>
                        <Command.List className="max-h-[300px] overflow-y-auto p-2">
                            <Command.Empty className="py-6 text-center text-sm text-slate-500">
                                Keine Gruppe gefunden.
                            </Command.Empty>
                            {sortedNodes.map((node) => (
                                <Command.Item
                                    className="flex cursor-default items-center rounded-lg px-3 py-2 text-sm text-slate-900 outline-none select-none aria-selected:bg-blue-50 aria-selected:text-blue-900 dark:text-slate-100 dark:aria-selected:bg-blue-900/20 dark:aria-selected:text-blue-400"
                                    key={node.id}
                                    onSelect={() => {
                                        handleSelect(node.id);
                                    }}
                                    value={node.data.title}
                                >
                                    {node.data.title}
                                    <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">
                                        {node.data.groupTypeName}
                                    </span>
                                </Command.Item>
                            ))}
                        </Command.List>
                    </div>
                </Command.Dialog>
            </div>
        </div>
    );
});
