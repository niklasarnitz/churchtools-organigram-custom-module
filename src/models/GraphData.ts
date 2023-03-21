import type { DataNode } from './DataNode';
import type { Relation } from './Relation';

export type GraphData = {
	relations: Relation[];
	nodes: DataNode[];
};
