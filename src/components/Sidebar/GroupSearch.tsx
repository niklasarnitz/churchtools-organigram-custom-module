import _ from 'lodash';
import { Search, X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { type Node, useReactFlow } from 'reactflow';

import type { PreviewGraphNodeData } from '../PreviewGraph/PreviewGraphNode';

import { useGenerateReflowData } from '../../selectors/useGenerateReflowData';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export const GroupSearch = React.memo(() => {
    const { nodes } = useGenerateReflowData();
    const { fitView } = useReactFlow();
    const [searchValue, setSearchValue] = useState<string>('');

    const sortedNodes = useMemo(() => {
        return _.sortBy(nodes as Node<PreviewGraphNodeData>[], (n) => n.data.title);
    }, [nodes]);

    const handleSelectChange = useCallback((id: string) => {
        setSearchValue(id);
        if (id) {
            fitView({
                duration: 800,
                nodes: [{ id }],
                padding: 2,
            });
        }
    }, [fitView]);

    const clearSearch = useCallback(() => {
        setSearchValue('');
    }, []);

    if (nodes.length === 0) return null;

    return (
        <div className="mt-4 flex flex-col">
            <h5 className="mb-1 text-sm font-semibold flex items-center gap-2">
                <Search className="size-4" />
                Gruppe im Graph suchen
            </h5>

            <div className="flex gap-2">
                <Select onValueChange={handleSelectChange} value={searchValue}>
                    <SelectTrigger className="grow">
                        <SelectValue placeholder="Gruppe suchen..." />
                    </SelectTrigger>
                    <SelectContent>
                        {sortedNodes.map((node) => (
                            <SelectItem key={node.id} value={node.id}>
                                {node.data.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {searchValue && (
                    <Button
                        onClick={clearSearch}
                        size="icon"
                        variant="ghost"
                    >
                        <X className="size-4" />
                    </Button>
                )}
            </div>
        </div>
    );
});
