import type { PreviewGraphNodeData } from '../types/GraphNode';

import { TreeVisitor } from './treeTransformer';

export interface PositionedNode extends PreviewGraphNodeData {
	depth: number;
	scale: number;
	x: number;
	y: number;
}

export interface RadialLayoutConfig {
	clockwise: boolean;
	nodeScaleByDepth: Partial<Record<number, number>>;
	ringDistance: number;
	startAngle: number;
}

/**
 * Calculates radial positions for nodes arranged in rays from root
 *
 * Algorithm:
 * 1. Each direct child of root gets its own ray/angle
 * 2. For each ray, flatten the subtree in DFS order
 * 3. All nodes on the ray are positioned sequentially along the ray
 * 4. Parent-child relationships are preserved within each ray
 */
export function calculateRadialPositions(
	flattenedNodes: PreviewGraphNodeData[],
	config: RadialLayoutConfig,
	rootNode: PreviewGraphNodeData,
	parentMap: Map<number, PreviewGraphNodeData>,
	nodeSizes?: Map<string, { height: number; width: number }>,
	childrenMap?: Map<number, PreviewGraphNodeData[]>,
	visibleNodeIds?: Set<number>,
): PositionedNode[] {
	if (flattenedNodes.length === 0) {
		return [];
	}

	if (!childrenMap) {
		// Fallback: reconstruct childrenMap from parentMap
		childrenMap = new Map();
		for (const [childId, parent] of parentMap) {
			if (!childrenMap.has(parent.id)) {
				childrenMap.set(parent.id, []);
			}
			const childNode = flattenedNodes.find((n) => n.id === childId);
			if (childNode) {
				childrenMap.get(parent.id)?.push(childNode);
			}
		}
	}

	// Get direct children of root
	const rootDirectChildren = childrenMap.get(rootNode.id) ?? [];
	const totalDirectChildren = rootDirectChildren.length;

	// Assign angles to each direct child ray
	const childAngleMap = new Map<number, number>();
	for (let i = 0; i < totalDirectChildren; i++) {
		const child = rootDirectChildren[i];
		let angle: number;
		if (config.clockwise) {
			angle = config.startAngle + (i / totalDirectChildren) * 2 * Math.PI;
		} else {
			angle = config.startAngle - (i / totalDirectChildren) * 2 * Math.PI;
		}
		childAngleMap.set(child.id, angle);
	}

	// Position all nodes
	const positionedNodes: PositionedNode[] = [];

	// Transform tree using visitor pattern
	const visitor = new TreeVisitor();
	const transformedRays = visitor.visit(rootNode, childrenMap, visibleNodeIds);

	// For each ray, position nodes sequentially along the ray angle
	for (const directChild of rootDirectChildren) {
		const rayAngle = childAngleMap.get(directChild.id) ?? 0;
		const rayNodes = transformedRays.get(directChild.id) ?? [];

		// Position each node on this ray sequentially
		let cumulativeRadius = config.ringDistance; // Start at ringDistance from root

		for (const transformedNode of rayNodes) {
			const node = transformedNode.node;
			const depth = transformedNode.depthInRay;

			// Scale based on depth
			const scale = config.nodeScaleByDepth[Math.min(depth, 3)] ?? config.nodeScaleByDepth[3] ?? 1;

			// Position along ray: use cumulative radius
			const nodeRadius = cumulativeRadius;

			// Convert polar to cartesian (same angle for all nodes on ray)
			const x = nodeRadius * Math.cos(rayAngle);
			const y = nodeRadius * Math.sin(rayAngle);

			positionedNodes.push({
				...node,
				depth,
				scale,
				x,
				y,
			});

			// Add ringDistance for next node spacing
			cumulativeRadius += config.ringDistance;
		}
	}

	return positionedNodes;
}

/**
 * Flattens a tree hierarchy to a flat list, excluding the root node
 * (deprecated - kept for compatibility but not used in new ray-based layout)
 */
export function flattenTree(
	rootNode: PreviewGraphNodeData,
	childrenMap: Map<number, PreviewGraphNodeData[]>,
): PreviewGraphNodeData[] {
	const flattened: PreviewGraphNodeData[] = [];
	const queue: PreviewGraphNodeData[] = [...(childrenMap.get(rootNode.id) ?? [])];

	while (queue.length > 0) {
		const node = queue.shift();
		if (!node) break;
		flattened.push(node);

		const children = childrenMap.get(node.id) ?? [];
		queue.push(...children);
	}

	return flattened;
}
