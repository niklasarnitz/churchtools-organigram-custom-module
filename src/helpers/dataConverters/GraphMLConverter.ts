import { NodeType, determineIfIsGroupOrPerson } from '../determineIfIsGroupOrPerson';
import { useAppStore } from '../../state/useAppStore';
import type { DataNode } from './../../models/DataNode';
import type { GraphData } from './../../models/GraphData';
import type { Group } from '../../models/Group';
import type { GroupMember } from './../../models/GroupMember';
import type { Relation } from '../../models/Relation';

export const roleString = (member: GroupMember) => {
	return useAppStore.getState().groupRoles.find((role) => role.id === member.groupTypeRoleId)?.name || 'Unknown Role';
};

export const roleIdentifier = (member: GroupMember) => {
	return `role-${member.groupTypeRoleId}-${member.groupId}`;
};

export const personIdentifier = (member: GroupMember) => `person-${member.personId}`;

export const groupIdentifier = (group: Group) => `group-${group.id}`;

const renderHeader = () => {
	const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
	const GRAPHML_HEADER_YED = `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xmlns:y="http://www.yworks.com/xml/graphml"
      xmlns:yed="http://www.yworks.com/xml/yed/3"
      xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
      http://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd">`;
	const KEYS_FOR_YED = `<key for="node" id="d6" yfiles.type="nodegraphics"/>`;
	const GRAPH_START = `
        <graph id="G" edgedefault="undirected">`;

	return `${XML_HEADER}\n${GRAPHML_HEADER_YED}\n${KEYS_FOR_YED}\n${GRAPH_START}`;
};

const renderNodes = (nodes: DataNode[]) => {
	if (nodes.length === 0) return '';

	let renderedNodes = '';

	for (const node of nodes) {
		if (determineIfIsGroupOrPerson(node) === NodeType.GROUP) {
			const group = node as Group;
			const groupNode = `<node id="${groupIdentifier(group)}">
				<data key="d6">
					<y:ShapeNode>
						<y:Geometry height="100" width="550" x="0.0" y="0.0"/>
						<y:Fill color="#FFCC00" transparent="false"/>
						<y:BorderStyle color="#000000" type="line" width="1.0"/>
						<y:NodeLabel alignment="center" autoSizePolicy="node_width" configuration="CroppingLabel" fontSize="35" fontStyle="plain" hasLineColor="false" hasBackgroundColor="false" horizontalTextPosition="center">${
							group.name
						}</y:NodeLabel>
						<y:Shape type="roundrectangle"/>
					</y:ShapeNode>
				</data>
			</node>`;
			renderedNodes += groupNode;
		} else {
			const member = node as GroupMember;

			if (!renderedNodes.includes(`id="${roleIdentifier(member)}"`)) {
				renderedNodes += `<node id="${roleIdentifier(member)}">
					<data key="d6">
						<y:ShapeNode>
							<y:Shape type="ellipse"/>
							<y:NodeLabel>${roleString(member)}</y:NodeLabel>
						</y:ShapeNode>
					</data>
				</node>`;
			}

			if (!renderedNodes.includes(`id="${personIdentifier(member)}"`)) {
				const person = useAppStore.getState().personsById[member.personId];
				const nameString = person ? `${person.firstName} ${person.lastName}` : 'Error: Person not found';

				renderedNodes += `<node id="${personIdentifier(member)}">
				<data key="d6">
					<y:ShapeNode>
						<y:Geometry height="100.0" width="400.0" x="0.0" y="0.0"/>
						<y:Fill color="#FFCCFF" transparent="false"/>
						<y:BorderStyle color="#000000" type="line" width="1.0"/>
						<y:NodeLabel alignment="center" autoSizePolicy="node_width" configuration="CroppingLabel" fontSize="35" fontStyle="plain" hasLineColor="false" hasBackgroundColor="false" horizontalTextPosition="center">${nameString}</y:NodeLabel>
						<y:Shape type="polygon"/>
					</y:ShapeNode>
				</data>
			</node>`;
			}
		}
	}

	return renderedNodes;
};

const renderEdges = (relations: Relation[]) => {
	if (relations.length === 0) return '';

	let renderedEdges = '';

	for (const relation of relations) {
		if (determineIfIsGroupOrPerson(relation.target) === NodeType.GROUP && 'id' in relation.target) {
			renderedEdges += `<edge source="${groupIdentifier(relation.source)}" target="${groupIdentifier(
				relation.target,
			)}"/>`;
		} else {
			if (
				determineIfIsGroupOrPerson(relation.source) === NodeType.GROUP &&
				determineIfIsGroupOrPerson(relation.target) === NodeType.MEMBER &&
				'groupTypeRoleId' in relation.target &&
				'groupMemberStatus' in relation.target &&
				'personId' in relation.target
			) {
				renderedEdges += `<edge source="${groupIdentifier(relation.source)}" target="${roleIdentifier(
					relation.target,
				)}"/>`;
				renderedEdges += `<edge source="${roleIdentifier(relation.target)}" target="${personIdentifier(
					relation.target,
				)}"/>`;
			}
		}
	}

	return renderedEdges;
};

const renderFooter = () => {
	return `
    </graph>
</graphml>`;
};

export const generateGraphMLData = ({ relations, nodes }: GraphData) => {
	return renderHeader() + renderNodes(nodes) + renderEdges(relations) + renderFooter();
};
