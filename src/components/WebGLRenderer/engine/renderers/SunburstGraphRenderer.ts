import type { PreviewGraphNodeData } from '../../../../types/GraphNode';
import type { Node } from '../../../../types/GraphTypes';
import type { SunburstInteractionMeta, SunburstRenderData, SunburstSegmentLayout } from '../../../../types/Sunburst';
import type { Bounds, Camera, FocusTarget, NodeHit, WorldPoint } from '../types';

import { calculateTextOrientation, getTangentialLineOffset } from '../../../../helpers/sunburstTextOrientation';
import { worldToScreen } from '../cameraMath';
import { GraphRenderer } from './GraphRenderer';

export interface SunburstGraphData {
	nodes: Node<PreviewGraphNodeData>[];
	sunburstRenderData: SunburstRenderData;
}

const LABEL_VISIBILITY_MIN_ZOOM = 0.12;

/** Renders the radial sunburst view: nested ring segments with arc-following labels. */
export class SunburstGraphRenderer extends GraphRenderer<SunburstGraphData> {
	private childrenByNodeId = new Map<string, string[]>();
	private nodeMap = new Map<string, Node<PreviewGraphNodeData>>();
	private renderData: SunburstRenderData | undefined;

	collectSubgraphNodes(nodeId: string, result: Set<string>): void {
		result.add(nodeId);
		for (const childId of this.childrenByNodeId.get(nodeId) ?? []) {
			if (!result.has(childId)) {
				this.collectSubgraphNodes(childId, result);
			}
		}
	}

	getBounds(): Bounds | null {
		if (!this.renderData) return null;
		const maxRadius = this.renderData.maxRadius;
		return { maxX: maxRadius, maxY: maxRadius, minX: -maxRadius, minY: -maxRadius };
	}

	getFocusTarget(nodeId: string): FocusTarget | null {
		const interactionMeta = this.renderData?.interactionByNodeId[Number(nodeId)];
		if (!interactionMeta) return null;

		return {
			height: 0,
			width: 0,
			x: interactionMeta.center.x,
			y: interactionMeta.center.y,
			zoom: 1.15,
		};
	}

	getInteractionMeta(nodeId: string): SunburstInteractionMeta | undefined {
		return this.renderData?.interactionByNodeId[Number(nodeId)];
	}

	getRenderData(): SunburstRenderData | undefined {
		return this.renderData;
	}

	hasData(): boolean {
		return this.renderData !== undefined;
	}

	hitTest(world: WorldPoint): NodeHit | null {
		const renderData = this.renderData;
		if (!renderData) return null;

		const radius = Math.hypot(world.x, world.y);

		if (renderData.centerLabel?.nodeId !== undefined && radius <= renderData.centerLabel.radius) {
			const node = this.nodeMap.get(String(renderData.centerLabel.nodeId));
			if (node) {
				return {
					height: renderData.centerLabel.radius * 2,
					interactionMeta: renderData.interactionByNodeId[renderData.centerLabel.nodeId],
					node,
					width: renderData.centerLabel.radius * 2,
				};
			}
		}

		let angle = Math.atan2(world.y, world.x) + Math.PI / 2;
		if (angle < 0) angle += Math.PI * 2;

		for (let index = renderData.segments.length - 1; index >= 0; index--) {
			const segment = renderData.segments[index];
			if (radius < segment.innerRadius || radius > segment.outerRadius) continue;
			if (angle < segment.startAngle || angle > segment.endAngle) continue;

			const node = this.nodeMap.get(String(segment.nodeId));
			if (!node) continue;

			return {
				height: segment.outerRadius - segment.innerRadius,
				interactionMeta: renderData.interactionByNodeId[segment.nodeId],
				node,
				width: segment.outerRadius - segment.innerRadius,
			};
		}

		return null;
	}

	render(ctx: CanvasRenderingContext2D, camera: Camera, viewW: number, viewH: number): void {
		const renderData = this.renderData;
		if (!renderData) return;

		const hasHighlight = this.highlightedNodeIds.size > 0;

		for (const segment of renderData.segments) {
			const boundsMin = worldToScreen(camera, -segment.outerRadius, -segment.outerRadius);
			const boundsMax = worldToScreen(camera, segment.outerRadius, segment.outerRadius);
			if (boundsMax.x < 0 || boundsMax.y < 0 || boundsMin.x > viewW || boundsMin.y > viewH) continue;

			const isHighlighted = this.highlightedNodeIds.has(String(segment.nodeId));
			const isHovered = this.hoveredNodeId === String(segment.nodeId);
			const opacity = hasHighlight && !isHighlighted ? 0.25 : 1;

			ctx.save();
			ctx.globalAlpha = opacity;
			ctx.beginPath();
			ctx.arc(0, 0, segment.outerRadius, segment.startAngle - Math.PI / 2, segment.endAngle - Math.PI / 2);
			ctx.arc(0, 0, segment.innerRadius, segment.endAngle - Math.PI / 2, segment.startAngle - Math.PI / 2, true);
			ctx.closePath();
			ctx.fillStyle = segment.fillColor;
			ctx.fill();
			ctx.strokeStyle = isHovered ? '#0f172a' : isHighlighted ? '#1d4ed8' : segment.strokeColor;
			ctx.lineWidth = isHovered ? 5 / camera.zoom : isHighlighted ? 4 / camera.zoom : 1 / camera.zoom;
			ctx.stroke();
			ctx.restore();
		}

		if (camera.zoom < LABEL_VISIBILITY_MIN_ZOOM) return;

		if (renderData.centerLabel) {
			const isHighlighted =
				renderData.centerLabel.nodeId !== undefined &&
				this.highlightedNodeIds.has(String(renderData.centerLabel.nodeId));
			const isHovered =
				renderData.centerLabel.nodeId !== undefined &&
				this.hoveredNodeId === String(renderData.centerLabel.nodeId);
			ctx.save();
			ctx.fillStyle = renderData.centerLabel.fillColor;
			ctx.beginPath();
			ctx.arc(0, 0, renderData.centerLabel.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = isHovered ? '#0f172a' : isHighlighted ? '#1d4ed8' : renderData.centerLabel.strokeColor;
			ctx.lineWidth = isHovered ? 5 / camera.zoom : isHighlighted ? 4 / camera.zoom : 1 / camera.zoom;
			ctx.stroke();
			ctx.fillStyle = getReadableTextColor(renderData.centerLabel.fillColor, this.isDarkMode);
			ctx.font = `${isHighlighted ? '600' : '500'} ${String(renderData.centerLabel.fontSize)}px Lato, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const lineHeight = renderData.centerLabel.fontSize * 1.05;
			const firstLineY = -((renderData.centerLabel.lines.length - 1) * lineHeight) / 2;
			for (const [index, line] of renderData.centerLabel.lines.entries()) {
				ctx.fillText(line, 0, firstLineY + index * lineHeight);
			}
			ctx.restore();
		}

		for (const label of renderData.labels) {
			if (!label.isVisible) continue;

			const segment = getSegmentByNodeId(renderData, label.nodeId);
			if (!segment) continue;
			const isHighlighted = this.highlightedNodeIds.has(String(label.nodeId));

			ctx.save();
			ctx.beginPath();
			ctx.arc(0, 0, segment.outerRadius, segment.startAngle - Math.PI / 2, segment.endAngle - Math.PI / 2);
			ctx.arc(0, 0, segment.innerRadius, segment.endAngle - Math.PI / 2, segment.startAngle - Math.PI / 2, true);
			ctx.closePath();
			ctx.clip();
			ctx.font = `${isHighlighted ? '600' : '500'} ${String(label.fontSize)}px Lato, sans-serif`;
			ctx.fillStyle = getReadableTextColor(segment.fillColor, this.isDarkMode);

			if (label.orientation === 'tangential') {
				const lineHeight = label.fontSize * 1.05;
				const textRadiusBase = (segment.innerRadius + segment.outerRadius) / 2;
				for (const [index, line] of label.lines.entries()) {
					const lineOffset = getTangentialLineOffset(
						index,
						label.lines.length,
						lineHeight,
						label.tangentialLineDirection,
					);
					drawTextOnArc(ctx, line, textRadiusBase + lineOffset, segment);
				}
			} else {
				ctx.translate(label.x, label.y);
				ctx.rotate((label.rotation * Math.PI) / 180);
				ctx.textAlign = label.textAlign;
				ctx.textBaseline = 'middle';
				const lineHeight = label.fontSize * 1.05;
				const firstLineY = -((label.lines.length - 1) * lineHeight) / 2;
				for (const [index, line] of label.lines.entries()) {
					ctx.fillText(line, 0, firstLineY + index * lineHeight);
				}
			}
			ctx.restore();
		}
	}

	protected onSetData(data: SunburstGraphData): void {
		this.renderData = data.sunburstRenderData;

		this.nodeMap.clear();
		for (const node of data.nodes) {
			this.nodeMap.set(node.id, node);
		}

		this.childrenByNodeId.clear();
		for (const interaction of Object.values(data.sunburstRenderData.interactionByNodeId)) {
			if (interaction.primaryParentId === undefined) continue;
			const parentId = String(interaction.primaryParentId);
			const children = this.childrenByNodeId.get(parentId) ?? [];
			children.push(String(interaction.nodeId));
			this.childrenByNodeId.set(parentId, children);
		}
	}
}

function drawTextOnArc(
	ctx: CanvasRenderingContext2D,
	text: string,
	radius: number,
	segment: SunburstSegmentLayout,
): void {
	if (!text) return;

	const glyphWidths = Array.from(text, (character) => ctx.measureText(character).width);
	const totalWidth = glyphWidths.reduce((sum, width) => sum + width, 0);
	if (totalWidth <= 0 || radius <= 0) return;

	const centerAngle = segment.midAngle - Math.PI / 2;
	const useReversedDirection = calculateTextOrientation((centerAngle * 180) / Math.PI, 'tangential').flipped;
	const direction = useReversedDirection ? -1 : 1;
	let currentAngle = centerAngle - direction * (totalWidth / (2 * radius));

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const characters = Array.from(text);
	for (const [index, character] of characters.entries()) {
		const glyphWidth = glyphWidths[index] ?? 0;
		const glyphAngle = glyphWidth / radius;
		const angle = currentAngle + direction * (glyphAngle / 2);
		const point = { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
		let tangentAngle = angle + Math.PI / 2;
		if (useReversedDirection) tangentAngle += Math.PI;

		ctx.save();
		ctx.translate(point.x, point.y);
		ctx.rotate(tangentAngle);
		ctx.fillText(character, 0, 0);
		ctx.restore();

		currentAngle += direction * glyphAngle;
	}
}

function getReadableTextColor(backgroundHex: string, isDarkMode: boolean): string {
	const hex = backgroundHex.replace('#', '');
	if (hex.length !== 6) {
		return isDarkMode ? '#f8fafc' : '#0f172a';
	}

	const red = Number.parseInt(hex.slice(0, 2), 16);
	const green = Number.parseInt(hex.slice(2, 4), 16);
	const blue = Number.parseInt(hex.slice(4, 6), 16);
	const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

	return luminance > 0.62 ? '#0f172a' : '#f8fafc';
}

/**
 * `segmentByNodeId` is a `Record` typed as always-defined, but it's really a lookup
 * populated only for nodes that have a segment; an explicit `| undefined` return type
 * makes the "does it exist" check downstream reflect that.
 */
function getSegmentByNodeId(renderData: SunburstRenderData, nodeId: number): SunburstSegmentLayout | undefined {
	return renderData.segmentByNodeId[nodeId];
}
