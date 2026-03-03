import type { GraphNode } from './GraphNode';
import type { Relation } from './Relation';

export interface GraphData {
	nodes: GraphNode[];
	relations: Relation[];
}
