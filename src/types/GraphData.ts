import type { GraphNode } from './GraphNode';
import type { Relation } from './Relation';

export type GraphData = {
	relations: Relation[];
	nodes: GraphNode[];
};
