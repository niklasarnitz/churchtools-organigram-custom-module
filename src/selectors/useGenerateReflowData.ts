/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable perfectionist/sort-imports */
/* eslint-disable perfectionist/sort-objects */
/* eslint-disable perfectionist/sort-union-types */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { PreviewGraphNodeData } from '../types/GraphNode';

import { measureNodeCard } from '../components/WebGLRenderer/engine/drawNodeCard2D';
import { getColorForChurchToolsColor, getColorForGroupType } from '../globals/Colors';
import { Logger } from '../globals/Logger';
import { getGroupMetadataString, getGroupTitle } from '../helpers/GraphHelper';
import { layoutElk } from '../helpers/layoutAlgorithms/elk';
import { calculateRadialPositions, flattenTree } from '../helpers/radialLayout';
import { buildSunburstLayout } from '../helpers/sunburstLayout';
import { useAppStore } from '../state/useAppStore';
import { type Edge, type Node, Position } from '../types/GraphTypes';
import { LayoutAlgorithm } from '../types/LayoutAlgorithm';
import type { SunburstRenderData } from '../types/Sunburst';
import { exportRayStructure, exportToElkDsl } from '../helpers/elkDslExport';
import { useCreateRelatedData } from './useCreateRelatedData';
import { useGroupTypesById } from './useGroupTypesById';
import { useHierarchiesByGroupId } from './useHierarchiesByGroupId';
import { usePersonsById } from './usePersonsById';

interface ReflowLayoutData {
	edges: Edge[];
	nodes: Node[];
	sunburstRenderData?: SunburstRenderData;
}

export const useGenerateReflowData = () => {
	const { nodes, relations } = useCreateRelatedData();
	const committedFilters = useAppStore((s) => s.committedFilters);
	const showGroupTypes = committedFilters?.showGroupTypes ?? true;
	const showParentGroups = committedFilters?.showParentGroups ?? false;
	const layoutAlgorithm = committedFilters?.layoutAlgorithm ?? LayoutAlgorithm.elkLayeredTB;
	const effectiveLayoutAlgorithm =
		layoutAlgorithm === LayoutAlgorithm.elkRadial ? LayoutAlgorithm.FLAT_RADIAL : layoutAlgorithm;
	const centerNodeId = committedFilters?.groupIdToStartWith ? Number(committedFilters.groupIdToStartWith) : undefined;
	const radialRingDistance = useAppStore((s) => s.radialRingDistance);
	const personsById = usePersonsById();
	const groupTypesById = useGroupTypesById();
	const hierarchiesByGroupId = useHierarchiesByGroupId();
	const beginLayoutCalculation = useAppStore((s) => s.beginLayoutCalculation);
	const endLayoutCalculation = useAppStore((s) => s.endLayoutCalculation);

	const [layoutedData, setLayoutedData] = useState<ReflowLayoutData>({
		edges: [],
		nodes: [],
	});
	const [isCalculating, setIsCalculating] = useState(false);

	const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);

	if (measureCanvasRef.current == null) {
		const c = document.createElement('canvas');
		c.width = 1;
		c.height = 1;
		measureCanvasRef.current = c;
	}

	const isVertical =
		effectiveLayoutAlgorithm === LayoutAlgorithm.elkLayeredTB ||
		effectiveLayoutAlgorithm === LayoutAlgorithm.elkMrTree;

	const { reflowEdges, reflowNodes } = useMemo(() => {
		const edges = relations.map((relation) => {
			return {
				animated: true,
				className: 'black-100',
				id: `${String(relation.source.id)}-${String(relation.target.id)}`,
				markerEnd: {
					color: '#64748b',
					height: 20,
					type: 'arrow',
					width: 20,
				},
				source: relation.source.id.toString(),
				style: { stroke: '#64748b', strokeWidth: 2 },
				target: relation.target.id.toString(),
				type: 'smoothstep',
			} as Edge;
		});

		const nodesList = nodes.map((node) => {
			const memberNamesByRoleId = new Map<number, string[]>();
			for (const member of node.members) {
				const person = personsById[member.personId];
				const name = person ? `${person.firstName} ${person.lastName}` : 'Unknown Person';
				let list = memberNamesByRoleId.get(member.groupTypeRoleId);
				if (!list) {
					list = [];
					memberNamesByRoleId.set(member.groupTypeRoleId, list);
				}
				list.push(name);
			}

			return {
				data: {
					color:
						getColorForChurchToolsColor(node.group.information.color) ??
						getColorForGroupType(node.group.information.groupTypeId),
					group: node.group,
					groupTypeName: groupTypesById[node.group.information.groupTypeId]?.name ?? 'Unknown',
					id: node.group.id,
					memberNamesByRoleId,
					members: node.members,
					metadata: getGroupMetadataString(node.groupRoles, node.members, personsById),
					roles: node.groupRoles,
					title: getGroupTitle(node.group, showGroupTypes, groupTypesById, true),
				},
				id: node.group.id.toString(),
				position: {
					x: 0,
					y: 0,
				},
				sourcePosition: isVertical ? Position.Bottom : Position.Right,
				targetPosition: isVertical ? Position.Top : Position.Left,
				type: 'previewGraphNode',
			} as Node;
		});

		return { reflowEdges: edges, reflowNodes: nodesList };
	}, [relations, nodes, groupTypesById, personsById, showGroupTypes, isVertical]);

	useEffect(() => {
		let active = true;
		let hasStartedLayout = false;

		const finishLayout = () => {
			if (!hasStartedLayout) return;
			hasStartedLayout = false;
			endLayoutCalculation();
		};

		const performLayout = async () => {
			setIsCalculating(true);
			beginLayoutCalculation();
			hasStartedLayout = true;

			try {
				await document.fonts.ready;

				const measureCanvas = measureCanvasRef.current;
				if (!measureCanvas) {
					return;
				}
				const measureCtx = measureCanvas.getContext('2d');
				if (!measureCtx) {
					return;
				}
				const nodeSizes = new Map<string, { height: number; width: number }>();
				for (const node of reflowNodes) {
					const metrics = measureNodeCard(measureCtx, node.data as PreviewGraphNodeData, showGroupTypes);
					nodeSizes.set(node.id, { height: metrics.height, width: metrics.width });
				}

				// Build childrenMap early (needed for both ELK Radial and FLAT_RADIAL)
				let result: ReflowLayoutData;

				if (reflowNodes.length === 0) {
					result = { edges: reflowEdges, nodes: reflowNodes };
				} else {
					const rootNode = reflowNodes[0].data as PreviewGraphNodeData;
					const nodeDataById = new Map<number, PreviewGraphNodeData>();
					for (const reflowNode of reflowNodes) {
						const nodeData = reflowNode.data as PreviewGraphNodeData;
						nodeDataById.set(nodeData.id, nodeData);
					}

					const childrenMap = new Map<number, PreviewGraphNodeData[]>();
					const parentMap = new Map<number, PreviewGraphNodeData>();
					const visibleNodeIds = new Set(reflowNodes.map((n) => (n.data as PreviewGraphNodeData).id));

					const getOrCreateNodeData = (nodeId: number): PreviewGraphNodeData | null => {
						const visible = nodeDataById.get(nodeId);
						if (visible) return visible;
						return {
							id: nodeId,
							title: `[Hidden Node ${nodeId}]`,
							color: { key: 'gray' as const, shades: { 500: '#999999' } } as any,
							group: {} as any,
							groupTypeName: 'Hidden',
							memberNamesByRoleId: new Map(),
							members: [],
							metadata: '',
							roles: [],
						};
					};

					for (const [parentIdStr, hierarchy] of Object.entries(hierarchiesByGroupId)) {
						const parentId = parseInt(parentIdStr);
						const parentNodeData = getOrCreateNodeData(parentId);
						const childrenList = hierarchy?.children || [];

						if (!childrenMap.has(parentId)) {
							childrenMap.set(parentId, []);
						}

						for (const childId of childrenList) {
							const childNodeData = getOrCreateNodeData(childId);
							if (childNodeData && parentNodeData) {
								if (!childrenMap.get(parentId)!.find((c) => c.id === childId)) {
									childrenMap.get(parentId)!.push(childNodeData);
									parentMap.set(childId, parentNodeData);
								}
							}
						}
					}

					if (effectiveLayoutAlgorithm === LayoutAlgorithm.SUNBURST) {
						const sunburstCenterNodeId =
							showParentGroups && centerNodeId !== undefined
								? (hierarchiesByGroupId[centerNodeId]?.parents.find((parentId) =>
										visibleNodeIds.has(parentId),
									) ?? centerNodeId)
								: centerNodeId;

						const sunburstLayout = buildSunburstLayout({
							centerNodeId: sunburstCenterNodeId,
							hierarchiesByGroupId,
							nodeDataById,
							radialRingDistance,
							visibleNodeIds,
						});
						const layoutNodeById = new Map(sunburstLayout.layoutNodes.map((entry) => [entry.id, entry]));

						const positionedReflowNodes = reflowNodes.map((node) => {
							const nodeData = node.data as PreviewGraphNodeData;
							const layoutNode = layoutNodeById.get(nodeData.id);

							return {
								...node,
								position: layoutNode ? { x: layoutNode.x, y: layoutNode.y } : { x: 0, y: 0 },
								sourcePosition: Position.Bottom,
								targetPosition: Position.Top,
							};
						});

						result = {
							edges: [],
							nodes: positionedReflowNodes,
							sunburstRenderData: sunburstLayout.renderData,
						};
					} else if (effectiveLayoutAlgorithm === LayoutAlgorithm.FLAT_RADIAL) {
						// Apply custom flat radial layout
						if (reflowNodes.length === 0) {
							result = { edges: reflowEdges, nodes: reflowNodes };
						} else {
							// childrenMap and parentMap already built above
							if ((window as any).__DEBUG_RADIAL) {
								console.log(`=== FLAT_RADIAL Layout ===`);
								console.log(`Total nodes: ${reflowNodes.length}`);
								console.log(`Root node: ${rootNode?.id} (${rootNode?.title})`);
							}

							if ((window as any).__DEBUG_RADIAL) {
								console.log(`=== HIERARCHIES SOURCE (FULL DUMP) ===`);
								console.log(
									`Total entries in hierarchiesByGroupId: ${Object.keys(hierarchiesByGroupId).length}`,
								);
								let totalChildrenInHierarchies = 0;
								for (const [parentIdStr, hierarchy] of Object.entries(hierarchiesByGroupId)) {
									const childCount = hierarchy?.children?.length || 0;
									totalChildrenInHierarchies += childCount;
									const childrenStr =
										childCount > 0 ? '→ ' + (hierarchy?.children || []).join(', ') : '';
									console.log(`  ${parentIdStr}: ${childCount} children ${childrenStr}`);
								}
								console.log(
									`Total parent-child relations in hierarchies: ${totalChildrenInHierarchies}`,
								);

								console.log(`\n=== CHILDREN MAP FROM FULL HIERARCHIES (including hidden nodes) ===`);
								for (const [parentId, children] of childrenMap) {
									const parentNode = nodeDataById.get(parentId);
									console.log(
										`Parent ${parentId} (${parentNode?.title || '[hidden]'}): ${children.length} children`,
									);
									for (const child of children) {
										const visible = visibleNodeIds.has(child.id) ? '✓ visible' : '✗ hidden';
										console.log(`  [${visible}] ${child.id} (${child.title})`);
									}
								}
							}

							// Debug childrenMap structure
							if ((window as any).__DEBUG_RADIAL) {
								console.log(`=== CHILDREN MAP STRUCTURE ===`);
								let totalChildren = 0;
								let maxDepth = 0;

								// Calculate max depth of the tree
								const calculateMaxDepth = (nodeId: number, visited = new Set<number>()): number => {
									if (visited.has(nodeId)) return 0;
									visited.add(nodeId);
									const children = childrenMap.get(nodeId) || [];
									if (children.length === 0) return 1;
									return (
										1 + Math.max(...children.map((c) => calculateMaxDepth(c.id, new Set(visited))))
									);
								};
								maxDepth = calculateMaxDepth(rootNode.id);

								for (const [parentId, children] of childrenMap) {
									const parentNode = nodeDataById.get(parentId);
									console.log(
										`Parent ${parentId} (${parentNode?.title}): ${children.length} children`,
									);
									totalChildren += children.length;
									for (const child of children) {
										console.log(`  - ${child.id} (${child.title})`);
									}
								}
								console.log(`Total parent-child relations: ${totalChildren}`);
								console.log(`Total edges in relations: ${relations.length}`);
								console.log(`Max tree depth: ${maxDepth}`);

								// Check if structure is flat
								const directChildrenOfRoot = childrenMap.get(rootNode.id)?.length || 0;
								const childrenWithOwnChildren = Array.from(childrenMap.values()).filter(
									(c) => c.length > 0,
								).length;
								console.log(
									`Direct children of root: ${directChildrenOfRoot}, Parents with their own children: ${childrenWithOwnChildren}`,
								);

								if (childrenWithOwnChildren === 0 && directChildrenOfRoot > 0) {
									console.warn(
										`⚠️ STRUCTURE IS FLAT: Root has ${directChildrenOfRoot} children but none of them have children!`,
									);
									console.warn(
										`This likely means intermediate nodes are filtered out or relations are missing.`,
									);
								}
							}

							// Flatten all nodes into a single ring
							const flatNodes = flattenTree(rootNode, childrenMap);

							// Calculate radial positions
							// Pass visibleNodeIds so TreeVisitor only adds visible nodes to the layout
							const positionedNodes = calculateRadialPositions(
								flatNodes,
								{
									clockwise: true,
									nodeScaleByDepth: { 0: 1, 1: 0.9, 2: 0.8, 3: 0.7 },
									ringDistance: radialRingDistance,
									startAngle: 0,
								},
								rootNode,
								parentMap,
								nodeSizes,
								childrenMap,
								visibleNodeIds,
							);

							// Create a map for quick lookup, including polar coordinates
							const positionedMap = new Map(positionedNodes.map((n) => [n.id, n]));

							// Convert cartesian to polar for each node to know its ray angle
							const nodePolarMap = new Map<number, { angle: number; radius: number }>();
							for (const node of positionedNodes) {
								const angle = Math.atan2(node.y, node.x);
								const radius = Math.sqrt(node.x * node.x + node.y * node.y);
								nodePolarMap.set(node.id, { angle, radius });
							}

							// Update node positions and adjust edge handles for radial layout
							const positionedReflowNodes = reflowNodes.map((node) => {
								const nodeData = node.data as PreviewGraphNodeData;
								const positioned = positionedMap.get(nodeData.id);

								if (positioned) {
									return {
										...node,
										position: { x: positioned.x, y: positioned.y },
										sourcePosition: Position.Bottom,
										targetPosition: Position.Top,
									};
								}

								// Root node stays at center
								return {
									...node,
									position: { x: 0, y: 0 },
									sourcePosition: Position.Bottom,
									targetPosition: Position.Top,
								};
							});

							// Build edges ONLY along rays: connect nodes sequentially within each ray
							// Each ray is a linear chain of nodes from outer to inner
							const rayEdges: Edge[] = [];
							const seenEdgeIds = new Set<string>();
							const angleThreshold = 0.15; // ~9 degrees tolerance for same ray

							// Group nodes by ray (angle)
							const nodesByRayAngle = new Map<string, Array<{ nodeId: number; radius: number }>>();
							for (const [nodeId, polar] of nodePolarMap) {
								// Round angle to identify ray
								const rayKey = Math.round(polar.angle * 1000).toString();
								if (!nodesByRayAngle.has(rayKey)) {
									nodesByRayAngle.set(rayKey, []);
								}
								nodesByRayAngle.get(rayKey)!.push({ nodeId, radius: polar.radius });
							}

							// For each ray, connect nodes sequentially by distance
							for (const [rayKey, nodesOnRay] of nodesByRayAngle) {
								// Sort nodes on ray by radius (distance from root)
								const sorted = nodesOnRay.sort((a, b) => a.radius - b.radius);

								// Connect consecutive nodes: node[0] -> node[1] -> node[2] ...
								for (let i = 0; i < sorted.length - 1; i++) {
									const parentNodeId = sorted[i].nodeId;
									const childNodeId = sorted[i + 1].nodeId;

									// Skip if not both visible
									if (!visibleNodeIds.has(parentNodeId) || !visibleNodeIds.has(childNodeId)) {
										continue;
									}

									const edgeId = `${parentNodeId}-${childNodeId}`;
									if (seenEdgeIds.has(edgeId)) continue;
									seenEdgeIds.add(edgeId);

									// Get positioned coordinates
									const parentPos = positionedMap.get(parentNodeId);
									const childPos = positionedMap.get(childNodeId);
									const parentPolar = nodePolarMap.get(parentNodeId);

									if (!parentPos || !childPos || !parentPolar) continue;

									const rayAngle = parentPolar.angle;

									// Create bezier control point toward center
									const parentRadius = parentPolar.radius;
									const childRadius = nodePolarMap.get(childNodeId)?.radius || 0;
									const midRadius = ((parentRadius + childRadius) / 2) * 0.3;
									const controlX = midRadius * Math.cos(rayAngle);
									const controlY = midRadius * Math.sin(rayAngle);

									const section = {
										startPoint: { x: parentPos.x, y: parentPos.y },
										endPoint: { x: childPos.x, y: childPos.y },
										bendPoints: [{ x: controlX, y: controlY }],
									};

									rayEdges.push({
										animated: true,
										className: 'black-100',
										id: edgeId,
										markerEnd: {
											color: '#64748b',
											height: 20,
											type: 'arrow',
											width: 20,
										},
										sections: [section],
										source: parentNodeId.toString(),
										style: { stroke: '#64748b', strokeWidth: 2 },
										target: childNodeId.toString(),
										type: 'smoothstep',
									} as Edge);
								}
							}

							if ((window as any).__DEBUG_RADIAL) {
								console.log(`=== FLAT_RADIAL EDGES (same-ray only) ===`);
								console.log(`Total ray-only edges: ${seenEdgeIds.size}`);
								for (const edge of rayEdges.slice(0, 10)) {
									console.log(`  Edge: ${edge.source} -> ${edge.target}`);
								}

								// Export ray structure for debugging
								console.log('\n' + exportRayStructure(nodePolarMap, childrenMap, nodeDataById));

								// Export ELK DSL for analysis
								const elkDsl = exportToElkDsl(positionedReflowNodes as any, rayEdges);
								console.log('\n=== ELK DSL EXPORT ===\n' + elkDsl);

								// Make available on window for manual inspection
								(window as any).__ELK_DSL = elkDsl;
								(window as any).__RAY_STRUCTURE = exportRayStructure(
									nodePolarMap,
									childrenMap,
									nodeDataById,
								);
							}

							result = { edges: rayEdges, nodes: positionedReflowNodes };
						}
					} else {
						// Use ELK for standard layouts
						result = await layoutElk(reflowNodes, reflowEdges, effectiveLayoutAlgorithm, nodeSizes);
					}
				}

				if (active) {
					setLayoutedData(result);
				}
			} catch (error) {
				Logger.error('[useGenerateReflowData] Layout calculation failed', {
					error,
					layoutAlgorithm: effectiveLayoutAlgorithm,
				});
			} finally {
				if (active) {
					setIsCalculating(false);
				}
				finishLayout();
			}
		};

		void performLayout();

		return () => {
			active = false;
			finishLayout();
		};
	}, [
		reflowNodes,
		reflowEdges,
		effectiveLayoutAlgorithm,
		layoutAlgorithm,
		centerNodeId,
		radialRingDistance,
		showParentGroups,
		showGroupTypes,
		beginLayoutCalculation,
		endLayoutCalculation,
		relations,
		hierarchiesByGroupId,
	]);

	return { ...layoutedData, isCalculating };
};
