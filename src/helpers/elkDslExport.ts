import type { PreviewGraphNodeData } from '../types/GraphNode';
import type { Edge, Node } from '../types/GraphTypes';

/**
 * Exports ray structure for debugging
 */
export function exportRayStructure(
	nodePolarMap: Map<number, { angle: number; radius: number }>,
	childrenMap: Map<number, PreviewGraphNodeData[]>,
	nodeDataById: Map<number, PreviewGraphNodeData>,
): string {
	let output = '=== RAY STRUCTURE ===\n\n';

	// Group nodes by ray angle
	const rayMap = new Map<number, { angle: number; nodeId: number; radius: number; }[]>();

	for (const [nodeId, polar] of nodePolarMap) {
		// Round angle to nearest 0.1 radian to group nodes on same ray
		const roundedAngle = Math.round(polar.angle * 10) / 10;
		if (!rayMap.has(roundedAngle)) {
			rayMap.set(roundedAngle, []);
		}
		rayMap.get(roundedAngle)?.push({ angle: polar.angle, nodeId, radius: polar.radius });
	}

	// Sort rays by angle
	const sortedRays = Array.from(rayMap.entries()).sort((a, b) => a[0] - b[0]);

	for (const [angleKey, nodesOnRay] of sortedRays) {
		const angle = (angleKey * 180) / Math.PI;
		output += `Ray at ${angle.toFixed(1)}°:\n`;

		// Sort nodes on ray by radius (distance from root)
		const sorted = nodesOnRay.sort((a, b) => a.radius - b.radius);

		for (let i = 0; i < sorted.length; i++) {
			const node = sorted[i];
			const nodeData = nodeDataById.get(node.nodeId);
			const title = nodeData?.title ?? 'Unknown';
			output += `  [${String(i)}] Node ${String(node.nodeId)} (${title}) - Radius: ${node.radius.toFixed(0)}\n`;

			// Show parent-child on same ray
			if (i > 0) {
				const parentNode = sorted[i - 1];
				output += `      └─ Child of ${String(parentNode.nodeId)}\n`;
			}
		}

		output += '\n';
	}

	return output;
}

/**
 * Exports graph structure to ELK DSL format for debugging
 */
export function exportToElkDsl(nodes: Node<PreviewGraphNodeData>[], edges: Edge[]): string {
	let dsl = 'graph G {\n';
	dsl += '  layoutOptions {\n';
	dsl += '    elk.algorithm: radial\n';
	dsl += '    elk.direction: DOWN\n';
	dsl += '  }\n\n';

	// Export nodes
	for (const node of nodes) {
		const data = node.data;
		const title = data.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		dsl += `  node_${node.id} [label="${title}"]\n`;
	}

	dsl += '\n';

	// Export edges
	for (const edge of edges) {
		dsl += `  node_${edge.source} -> node_${edge.target}\n`;
	}

	dsl += '}\n';
	return dsl;
}
