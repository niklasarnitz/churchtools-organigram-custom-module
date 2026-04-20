import type { PreviewGraphNodeData } from '../types/GraphNode';
import { TreeVisitor } from './treeTransformer';
import type { TransformedRayNode } from './treeTransformer';

export interface RadialLayoutConfig {
	ringDistance: number;
	startAngle: number;
	clockwise: boolean;
	nodeScaleByDepth: Record<number, number>;
}

export interface PositionedNode extends PreviewGraphNodeData {
	x: number;
	y: number;
	depth: number;
	scale: number;
}

/**
 * Flattens a tree hierarchy to a flat list, excluding the root node
 * (deprecated - kept for compatibility but not used in new ray-based layout)
 */
export function flattenTree(rootNode: PreviewGraphNodeData, childrenMap: Map<number, PreviewGraphNodeData[]>): PreviewGraphNodeData[] {
	const flattened: PreviewGraphNodeData[] = [];
	const queue: PreviewGraphNodeData[] = [...(childrenMap.get(rootNode.id) || [])];

	while (queue.length > 0) {
		const node = queue.shift()!;
		flattened.push(node);

		const children = childrenMap.get(node.id) || [];
		queue.push(...children);
	}

	return flattened;
}

/**
 * Flattens a subtree in DFS order (depth-first)
 * Used to get all descendants of a node in tree traversal order
 * Returns nodes with their depth within the subtree
 */
interface NodeWithSubtreeDepth extends PreviewGraphNodeData {
	__subtreeDepth?: number;
}

function flattenSubtreeDFS(node: PreviewGraphNodeData, childrenMap: Map<number, PreviewGraphNodeData[]>, depth: number = 1): NodeWithSubtreeDepth[] {
	const result: NodeWithSubtreeDepth[] = [{ ...node, __subtreeDepth: depth }];
	const children = childrenMap.get(node.id) || [];
	for (const child of children) {
		result.push(...flattenSubtreeDFS(child, childrenMap, depth + 1));
	}
	return result;
}

/**
 * Calculates the depth of a node relative to the root node
 */
function calculateNodeDepth(
	node: PreviewGraphNodeData,
	rootNode: PreviewGraphNodeData,
	parentMap: Map<number, PreviewGraphNodeData>,
): number {
	let depth = 0;
	let current = node;

	while (current.id !== rootNode.id) {
		const parent = parentMap.get(current.id);
		if (!parent) {
			break;
		}
		depth++;
		current = parent;
	}

	return depth;
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
				childrenMap.get(parent.id)!.push(childNode);
			}
		}
	}

	// Debug: Check children map structure
	if (typeof window !== 'undefined' && (window as any).__DEBUG_RADIAL) {
		console.log(`=== CHILDREN MAP DEBUG (${childrenMap.size} parents) ===`);
		for (const [parentId, children] of childrenMap) {
			const parentNode = flattenedNodes.find((n) => n.id === parentId) || (parentId === rootNode.id ? rootNode : null);
			console.log(`Parent: ${parentId} (${parentNode?.title}), Children: ${children.length}`);
			if (children.length > 0) {
				for (const child of children) {
					console.log(`  - ${child.id} (${child.title})`);
				}
			}
		}
	}

	// Get direct children of root
	const rootDirectChildren = childrenMap.get(rootNode.id) || [];
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

	// Calculate max depth for debugging
	let maxDepth = 0;
	for (const node of flattenedNodes) {
		const depth = calculateNodeDepth(node, rootNode, parentMap);
		maxDepth = Math.max(maxDepth, depth);
	}

	if (typeof window !== 'undefined' && (window as any).__DEBUG_RADIAL) {
		console.log(`=== FLAT RADIAL LAYOUT ===`);
		console.log(`Total nodes: ${flattenedNodes.length}, Max depth: ${maxDepth}, RingDistance: ${(flattenedNodes[0] as any).ringDistance || 'N/A'}`);
		console.log(`Root: ${rootNode.id} (${rootNode.title})`);
		console.log(`Direct children: ${rootDirectChildren.length}`);
	}

	// Transform tree using visitor pattern
	const visitor = new TreeVisitor();
	const transformedRays = visitor.visit(rootNode, childrenMap, visibleNodeIds);

	if (typeof window !== 'undefined' && (window as any).__DEBUG_RADIAL) {
		console.log(visitor.getDebugInfo());
	}

	// For each ray, position nodes sequentially along the ray angle
	for (let rayIndex = 0; rayIndex < rootDirectChildren.length; rayIndex++) {
		const directChild = rootDirectChildren[rayIndex];
		const rayAngle = childAngleMap.get(directChild.id) || 0;
		const rayNodes = transformedRays.get(directChild.id) || [];

		if (typeof window !== 'undefined' && (window as any).__DEBUG_RADIAL) {
			console.log(`\n=== RAY ${rayIndex}: ${directChild.title} (${rayNodes.length} nodes) ===`);
		}

		// Position each node on this ray sequentially
		let cumulativeRadius = config.ringDistance; // Start at ringDistance from root

		for (let nodeIndex = 0; nodeIndex < rayNodes.length; nodeIndex++) {
			const transformedNode = rayNodes[nodeIndex];
			const node = transformedNode.node;
			const depth = transformedNode.depthInRay;

			// Scale based on depth
			const scale = config.nodeScaleByDepth[Math.min(depth, 3)] ?? config.nodeScaleByDepth[3] ?? 1;

			// Position along ray: use cumulative radius
			const nodeRadius = cumulativeRadius;

			// Convert polar to cartesian (same angle for all nodes on ray)
			const x = nodeRadius * Math.cos(rayAngle);
			const y = nodeRadius * Math.sin(rayAngle);

			// Debug log
			if (typeof window !== 'undefined' && (window as any).__DEBUG_RADIAL) {
				console.log(`  [${nodeIndex}] Node: ${node.id} (${node.title}), Angle: ${(rayAngle * 180 / Math.PI).toFixed(1)}°, Radius: ${nodeRadius}`);
			}

			positionedNodes.push({
				...node,
				x,
				y,
				depth,
				scale,
			});

			// Add ringDistance for next node spacing
			cumulativeRadius += config.ringDistance;
		}
	}

	return positionedNodes;
}
