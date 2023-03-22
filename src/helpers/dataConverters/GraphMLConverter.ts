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
const graphMLNodeGeometryTag = 'y:Geometry';

// This function looks like it's doing a lot, but it's just converting the data into a format that can be used by the graphML library.
// eslint-disable-next-line sonarjs/cognitive-complexity
export const generateGraphMLData = ({ relations, nodes }: GraphData, rolesToExclude: number[]) => {
	const graphML = new Document();

	const comment = graphML.createComment('Created by churchtools-organigram-custom-module');
	graphML.append(comment);

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

			const data6 = graphML.createElement('data');
			data6.setAttribute('key', 'd6');

			const shapeNode = graphML.createElement(graphMLShapeNodeTag);

			const groupMembers = useAppStore.getState().groupMembers.filter((member) => member.groupId === group.id);
			const personsById = useAppStore.getState().personsById;

			const roles = useAppStore.getState().groupRoles;

			const groupRoles = [...new Set(groupMembers.map((member) => member.groupTypeRoleId))].filter(
				(roleId) => !rolesToExclude.includes(roleId),
			);

			const groupMemberString = groupRoles
				.map((roleId) => {
					const personsWithRole = groupMembers.filter((member) => member.groupTypeRoleId === roleId);
					const personsWithRoleNames = personsWithRole.map(
						(member) =>
							personsById[member.personId].firstName + ' ' + personsById[member.personId].lastName,
					);

					return `${roles.find((role) => role.id === roleId)?.name}: ${personsWithRoleNames.join(', ')}`;
				})
				.join('<br>');

			const nodeString = `<html><div style="width=100%;"><p style="text-align: center;"><b>${group.name}</b><br><br>${groupMemberString}</p></div></html>`;

			const nodeHeight =
				nodeString.split('\n').length === 1
					? String(2 * 20)
					: String((nodeString.split('<br>').length + 3) * 20);

			const geometry = graphML.createElement(graphMLNodeGeometryTag);
			geometry.setAttribute('height', nodeHeight);
			geometry.setAttribute('width', '100.0');
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
			nodeLabel.setAttribute('fontSize', '20');
			nodeLabel.setAttribute('fontStyle', 'plain');
			nodeLabel.setAttribute('hasLineColor', 'false');
			nodeLabel.setAttribute('hasBackgroundColor', 'false');
			nodeLabel.setAttribute('horizontalTextPosition', 'center');
			nodeLabel.setAttribute('modelName', 'internal');
			nodeLabel.setAttribute('modelPosition', 't');
			nodeLabel.setAttribute('textColor', '#000000');
			nodeLabel.setAttribute('verticalTextPosition', 'top');
			nodeLabel.setAttribute('visible', 'true');
			nodeLabel.setAttribute('xml:space', 'preserve');
			nodeLabel.textContent = nodeString;

			const shape = graphML.createElement('y:Shape');
			shape.setAttribute('type', 'roundrectangle');

			shapeNode.append(geometry);
			shapeNode.append(fill);
			shapeNode.append(borderStyle);
			shapeNode.append(nodeLabel);
			shapeNode.append(shape);

			data6.append(shapeNode);

			groupNode.append(data6);

			graphElement.append(groupNode);
		}
	}

	for (const relation of relations) {
		if (determineIfIsGroupOrPerson(relation.target) === NodeType.GROUP && 'id' in relation.target) {
			const edge = graphML.createElement('edge');
			edge.setAttribute('source', groupIdentifier(relation.source));
			edge.setAttribute('target', groupIdentifier(relation.target));

			graphElement.append(edge);
		}
	}

	graphMLElement.append(graphElement);

	graphML.append(graphMLElement);

	return new XMLSerializer().serializeToString(graphML);
};
