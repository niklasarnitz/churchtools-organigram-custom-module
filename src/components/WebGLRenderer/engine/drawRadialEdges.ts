/**
 * Draws radial edges between nodes using Bezier curves
 * Creates organic-looking connections with control points toward the center
 */
function drawRadialEdges(
	ctx: CanvasRenderingContext2D,
	nodes: { id: string; x: number; y: number }[],
	edges: { source: string; target: string }[],
	isDarkMode: boolean,
): void {
	// Set up line styling
	ctx.lineWidth = 1.5;
	ctx.globalAlpha = 0.3;

	// Choose color based on dark/light mode
	const strokeColor = isDarkMode ? '#cbd5e1' : '#64748b';
	ctx.strokeStyle = strokeColor;

	// Create a map for fast node lookup
	const nodeMap = new Map(nodes.map((node) => [node.id, node]));

	// Draw each edge
	for (const edge of edges) {
		const sourceNode = nodeMap.get(edge.source);
		const targetNode = nodeMap.get(edge.target);

		// Skip if either node is not found
		if (!sourceNode || !targetNode) {
			continue;
		}

		const x1 = sourceNode.x;
		const y1 = sourceNode.y;
		const x2 = targetNode.x;
		const y2 = targetNode.y;

		// Calculate center point
		const centerX = (x1 + x2) / 2;
		const centerY = (y1 + y2) / 2;

		// Calculate control points toward the center with 0.7 factor
		const controlX = centerX * 0.7;
		const controlY = centerY * 0.7;

		// Draw Bezier curve
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.quadraticCurveTo(controlX, controlY, x2, y2);
		ctx.stroke();
	}

	// Reset global alpha to default
	ctx.globalAlpha = 1.0;
}

export { drawRadialEdges };
