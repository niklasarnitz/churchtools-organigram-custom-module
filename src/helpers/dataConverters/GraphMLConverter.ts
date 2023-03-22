import { NodeType, determineIfIsGroupOrPerson } from '../determineIfIsGroupOrPerson';
import { useAppStore } from '../../state/useAppStore';
import type { GraphData } from './../../models/GraphData';
import type { Group } from '../../models/Group';
import type { GroupMember } from './../../models/GroupMember';

export const roleString = (member: GroupMember) => {
	return useAppStore.getState().groupRoles.find((role) => role.id === member.groupTypeRoleId)?.name || 'Unknown Role';
};

export const roleIdentifier = (member: GroupMember) => {
	if (!member || !('groupTypeRoleId' in member) || !('groupId' in member)) throw new Error('Invalid member');
	return `role-${member.groupTypeRoleId}-${member.groupId}`;
};

export const personIdentifier = (member: GroupMember) => `person-${member.personId}`;

export const groupIdentifier = (group: Group) => `group-${group.id}`;

const graphMLShapeNodeTag = 'y:ShapeNode';
const graphMLNodeLabelTag = 'y:NodeLabel';

// This function looks like it's doing a lot, but it's just converting the data into a format that can be used by the graphML library.
// eslint-disable-next-line sonarjs/cognitive-complexity
export const generateGraphMLData = ({ relations, nodes }: GraphData) => {
	const graphML = new Document();

	const graphMLElement = graphML.createElement('graphml');
	graphMLElement.setAttribute('xmlns', 'http://graphml.graphdrawing.org/xmlns');
	graphMLElement.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
	graphMLElement.setAttribute('xmlns:y', 'http://www.yworks.com/xml/graphml');
	graphMLElement.setAttribute('xmlns:yed', 'http://www.yworks.com/xml/yed/3');
	graphMLElement.setAttribute(
		'xsi:schemaLocation',
		'http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd',
	);

	const graphKey = graphML.createElement('key');
	graphKey.setAttribute('for', 'node');
	graphKey.setAttribute('id', 'd6');
	graphKey.setAttribute('yfiles.type', 'nodegraphics');

	graphMLElement.append(graphKey);

	const graphElement = graphML.createElement('graph');
	graphElement.setAttribute('id', 'G');
	graphElement.setAttribute('edgedefault', 'undirected');

	for (const node of nodes) {
		if (determineIfIsGroupOrPerson(node) === NodeType.GROUP) {
			const group = node as Group;

			const groupNode = graphML.createElement('node');
			groupNode.setAttribute('id', groupIdentifier(group));

			const data = graphML.createElement('data');
			data.setAttribute('key', 'd6');

			const shapeNode = graphML.createElement(graphMLShapeNodeTag);

			const geometry = graphML.createElement('y:Geometry');
			geometry.setAttribute('height', '100');
			geometry.setAttribute('width', '550');
			geometry.setAttribute('x', '0.0');
			geometry.setAttribute('y', '0.0');

			const fill = graphML.createElement('y:Fill');
			fill.setAttribute('color', '#FFCC00');
			fill.setAttribute('transparent', 'false');

			const borderStyle = graphML.createElement('y:BorderStyle');
			borderStyle.setAttribute('color', '#000000');
			borderStyle.setAttribute('type', 'line');
			borderStyle.setAttribute('width', '1.0');

			const nodeLabel = graphML.createElement(graphMLNodeLabelTag);
			nodeLabel.setAttribute('alignment', 'center');
			nodeLabel.setAttribute('autoSizePolicy', 'node_width');
			nodeLabel.setAttribute('configuration', 'CroppingLabel');
			nodeLabel.setAttribute('fontSize', '35');
			nodeLabel.setAttribute('fontStyle', 'plain');
			nodeLabel.setAttribute('hasLineColor', 'false');
			nodeLabel.setAttribute('hasBackgroundColor', 'false');
			nodeLabel.setAttribute('horizontalTextPosition', 'center');
			nodeLabel.textContent = group.name;

			const shape = graphML.createElement('y:Shape');
			shape.setAttribute('type', 'roundrectangle');

			shapeNode.append(geometry);
			shapeNode.append(fill);
			shapeNode.append(borderStyle);
			shapeNode.append(nodeLabel);
			shapeNode.append(shape);

			data.append(shapeNode);

			groupNode.append(data);

			graphElement.append(groupNode);
		} else {
			const member = node as GroupMember;

			if (!graphElement.querySelector(`[id="${roleIdentifier(member)}"]`)) {
				const roleNode = graphML.createElement('node');
				roleNode.setAttribute('id', roleIdentifier(member));

				const data = graphML.createElement('data');
				data.setAttribute('key', 'd6');

				const shapeNode = graphML.createElement(graphMLShapeNodeTag);

				const shape = graphML.createElement('y:Shape');
				shape.setAttribute('type', 'ellipse');

				const nodeLabel = graphML.createElement(graphMLNodeLabelTag);
				nodeLabel.setAttribute('alignment', 'center');
				nodeLabel.setAttribute('autoSizePolicy', 'node_width');
				nodeLabel.setAttribute('configuration', 'CroppingLabel');
				nodeLabel.setAttribute('fontSize', '35');
				nodeLabel.setAttribute('fontStyle', 'plain');
				nodeLabel.setAttribute('hasLineColor', 'false');
				nodeLabel.setAttribute('hasBackgroundColor', 'false');
				nodeLabel.setAttribute('horizontalTextPosition', 'center');
				nodeLabel.textContent = roleString(member);

				shapeNode.append(nodeLabel);
				shapeNode.append(shape);

				data.append(shapeNode);

				roleNode.append(data);

				graphElement.append(roleNode);
			}

			if (!graphElement.querySelector(`[id="${personIdentifier(member)}"]`)) {
				const person = useAppStore.getState().personsById[member.personId];
				const nameString = person ? `${person.firstName} ${person.lastName}` : 'Error: Person not found';

				const personNode = graphML.createElement('node');
				personNode.setAttribute('id', personIdentifier(member));

				const data = graphML.createElement('data');
				data.setAttribute('key', 'd6');

				const shapeNode = graphML.createElement(graphMLShapeNodeTag);

				const geometry = graphML.createElement('y:Geometry');
				geometry.setAttribute('height', '100');
				geometry.setAttribute('width', '400');
				geometry.setAttribute('x', '0.0');
				geometry.setAttribute('y', '0.0');

				const fill = graphML.createElement('y:Fill');
				fill.setAttribute('color', '#FFCCFF');
				fill.setAttribute('transparent', 'false');

				const borderStyle = graphML.createElement('y:BorderStyle');
				borderStyle.setAttribute('color', '#000000');
				borderStyle.setAttribute('type', 'line');
				borderStyle.setAttribute('width', '1.0');

				const nodeLabel = graphML.createElement(graphMLNodeLabelTag);
				nodeLabel.setAttribute('alignment', 'center');
				nodeLabel.setAttribute('autoSizePolicy', 'node_width');
				nodeLabel.setAttribute('configuration', 'CroppingLabel');
				nodeLabel.setAttribute('fontSize', '35');
				nodeLabel.setAttribute('fontStyle', 'plain');
				nodeLabel.setAttribute('hasLineColor', 'false');
				nodeLabel.setAttribute('hasBackgroundColor', 'false');
				nodeLabel.setAttribute('horizontalTextPosition', 'center');
				nodeLabel.textContent = nameString;

				const shape = graphML.createElement('y:Shape');
				shape.setAttribute('type', 'polygon');

				shapeNode.append(geometry);
				shapeNode.append(fill);
				shapeNode.append(borderStyle);
				shapeNode.append(nodeLabel);
				shapeNode.append(shape);

				data.append(shapeNode);

				personNode.append(data);

				graphElement.append(personNode);
			}
		}
	}

	for (const relation of relations) {
		if (determineIfIsGroupOrPerson(relation.target) === NodeType.GROUP && 'id' in relation.target) {
			const edge = graphML.createElement('edge');
			edge.setAttribute('source', groupIdentifier(relation.source));
			edge.setAttribute('target', groupIdentifier(relation.target));

			graphElement.append(edge);
		} else {
			if (
				determineIfIsGroupOrPerson(relation.source) === NodeType.GROUP &&
				determineIfIsGroupOrPerson(relation.target) === NodeType.MEMBER &&
				'groupTypeRoleId' in relation.target &&
				'groupMemberStatus' in relation.target &&
				'personId' in relation.target
			) {
				const roleEdge = graphML.createElement('edge');
				roleEdge.setAttribute('source', groupIdentifier(relation.source));
				roleEdge.setAttribute('target', roleIdentifier(relation.target));

				const personEdge = graphML.createElement('edge');
				personEdge.setAttribute('source', roleIdentifier(relation.target));
				personEdge.setAttribute('target', personIdentifier(relation.target));

				graphElement.append(roleEdge);
				graphElement.append(personEdge);
			}
		}
	}

	graphMLElement.append(graphElement);

	graphML.append(graphMLElement);

	return new XMLSerializer().serializeToString(graphML);
};
