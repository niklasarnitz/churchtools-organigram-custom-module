import type { PreviewGraphNodeData } from '../types/GraphNode';

/**
 * Transformed node that represents a flattened ray in the radial layout
 * A ray contains all descendants of a direct child in DFS order
 */
export interface TransformedRayNode {
	depthInRay: number; // Position in the ray (1 = first, directly after root)
	node: PreviewGraphNodeData;
}

/**
 * Visitor pattern to transform the tree into rays
 * Each direct child of root becomes a ray, containing all its descendants in DFS order
 *
 * Supports DAG (nodes with multiple parents):
 * Each unique path from root to a node is tracked separately,
 * so nodes with multiple parents appear once per path with correct depth
 */
export class TreeVisitor {
	private rays = new Map<number, TransformedRayNode[]>();

	/**
	 * Get debug information about the transformed tree
	 */
	public getDebugInfo(): string {
		let debug = '=== TREE VISITOR DEBUG ===\n';
		for (const [rayId, nodes] of this.rays) {
			debug += `Ray ${String(rayId)} (${nodes[0]?.node.title ?? ''}):\n`;
			for (const transformedNode of nodes) {
				debug += `  Depth ${String(transformedNode.depthInRay)}: ${String(transformedNode.node.id)} (${transformedNode.node.title})\n`;
			}
		}
		return debug;
	}

	/**
	 * Visit the tree and transform it into rays
	 * Returns a map where:
	 *   - Key: direct child ID
	 *   - Value: array of nodes in DFS order for that ray
	 *
	 * Nodes are sequentially numbered by their order of appearance (1, 2, 3, ...)
	 * regardless of hierarchical depth
	 */
	public visit(
		rootNode: PreviewGraphNodeData,
		childrenMap: Map<number, PreviewGraphNodeData[]>,
		visibleNodeIds?: Set<number>, // Set of IDs that should be included in output
	): Map<number, TransformedRayNode[]> {
		this.rays.clear();

		const directChildren = childrenMap.get(rootNode.id) ?? [];

		// Visit each direct child as a separate ray
		// Each ray represents a path from root through one direct child
		for (const directChild of directChildren) {
			const rayNodes: TransformedRayNode[] = [];
			const visitedInRay = new Set<number>(); // Track nodes visited in THIS ray to detect cycles
			const depthCounter = { count: 0 }; // Mutable counter for visible nodes
			this.visitNodeInRay(directChild, childrenMap, rayNodes, depthCounter, visitedInRay, visibleNodeIds);
			this.rays.set(directChild.id, rayNodes);
		}

		return this.rays;
	}

	/**
	 * Recursively visit nodes in DFS order along a single ray
	 * Visible nodes are sequentially numbered (1, 2, 3, ...)
	 *
	 * @param node Current node being visited
	 * @param childrenMap Map of children for each node (includes hidden nodes)
	 * @param rayNodes Accumulator for visible nodes in this ray
	 * @param depthCounter Mutable counter { count } for visible node numbering
	 * @param visitedInRay Set of already-visited node IDs in this ray (for cycle detection)
	 * @param visibleNodeIds Optional set of node IDs that should be included in output
	 */
	private visitNodeInRay(
		node: PreviewGraphNodeData,
		childrenMap: Map<number, PreviewGraphNodeData[]>,
		rayNodes: TransformedRayNode[],
		depthCounter: { count: number },
		visitedInRay: Set<number>,
		visibleNodeIds?: Set<number>,
	): void {
		// Detect cycles: if we've already visited this node in this ray, skip it
		if (visitedInRay.has(node.id)) {
			return;
		}

		visitedInRay.add(node.id);

		// Check if this node is visible
		const isVisible = !visibleNodeIds || visibleNodeIds.has(node.id);

		// Only add VISIBLE nodes to the ray, incrementing their sequential number
		if (isVisible) {
			depthCounter.count++;
			rayNodes.push({
				depthInRay: depthCounter.count,
				node,
			});
		}

		const children = childrenMap.get(node.id) ?? [];

		// Recursively visit all children (traverse through hidden ones)
		for (const child of children) {
			this.visitNodeInRay(child, childrenMap, rayNodes, depthCounter, visitedInRay, visibleNodeIds);
		}
	}
}
