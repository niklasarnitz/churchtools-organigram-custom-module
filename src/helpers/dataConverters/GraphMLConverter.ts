import { NodeType, determineIfIsGroupOrPerson } from '../determineIfIsGroupOrPerson';
import { createData } from './../createRelatedData';
import { useAppStore } from '../../state/useAppStore';
import _ from 'lodash';
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

// This function looks like it's doing a lot, but it's just converting the data into a format that can be used by the graphML library.
// eslint-disable-next-line sonarjs/cognitive-complexity
export const generateGraphMLData = async () => {
	const { relations, nodes } = await createData();
	const { excludedRoles } = useAppStore.getState();

	const graphML = new Document();

	const comment = graphML.createComment('Created by churchtools-organigram-custom-module');
	graphML.append(comment);

	const graphMLElement = graphML.createElement('graphml');
	graphMLElement.setAttribute('xmlns', 'http://graphml.graphdrawing.org/xmlns');
	graphMLElement.setAttribute('xmlns:java', 'http://www.yworks.com/xml/yfiles-common/1.0/java');
	graphMLElement.setAttribute('xmlns:sys', 'http://www.yworks.com/xml/yfiles-common/markup/primitives/2.0');
	graphMLElement.setAttribute('xmlns:x', 'http://www.yworks.com/xml/yfiles-common/markup/2.0');
	graphMLElement.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
	graphMLElement.setAttribute('xmlns:y', 'http://www.yworks.com/xml/graphml');
	graphMLElement.setAttribute('xmlns:yed', 'http://www.yworks.com/xml/yed/3');
	graphMLElement.setAttribute(
		'xsi:schemaLocation',
		'http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd',
	);

	const nodeKey = graphML.createElement('key');
	nodeKey.setAttribute('for', 'node');
	nodeKey.setAttribute('id', 'd5');
	nodeKey.setAttribute('yfiles.type', 'nodegraphics');
	graphMLElement.append(nodeKey);

	const graphMLKey = graphML.createElement('key');
	graphMLKey.setAttribute('for', 'graphml');
	graphMLKey.setAttribute('id', 'd6');
	graphMLKey.setAttribute('yfiles.type', 'resources');
	graphMLElement.append(graphMLKey);

	const graphElement = graphML.createElement('graph');
	graphElement.setAttribute('id', 'G');
	graphElement.setAttribute('edgedefault', 'undirected');

	for (const node of nodes) {
		if (determineIfIsGroupOrPerson(node) === NodeType.GROUP) {
			const group = node as Group;

			const groupMembers = useAppStore.getState().groupMembers.filter((member) => member.groupId === group.id);
			const personsById = useAppStore.getState().personsById;

			const roles = _.sortBy(useAppStore.getState().groupRoles, 'sortKey');

			const groupRoles = [...new Set(groupMembers.map((member) => member.groupTypeRoleId))].filter(
				(roleId) => !excludedRoles.includes(roleId),
			);

			const groupMemberString = groupRoles
				.map((roleId) => {
					const personsWithRole = groupMembers.filter((member) => member.groupTypeRoleId === roleId);
					const personsWithRoleNames = personsWithRole.map(
						(member) =>
							personsById[member.personId].firstName + ' ' + personsById[member.personId].lastName,
					);

					return `${roles.find((role) => role.id === roleId)?.name}:\n${personsWithRoleNames.join(',\n')}`;
				})
				.join('\n');

			const longestLineGroupMemberString = Math.max(...groupMemberString.split('\n').map((line) => line.length));
			const longestLineGroupNameString = Math.max(...group.name.split('\n').map((line) => line.length));

			const groupNameFontSize = 18;
			const groupNameFontFamily = 'Dialog';
			const groupNameFontStyle = 'bold';
			// FontSize * 1,42 = Height
			const groupNameHeight = groupNameFontSize * 1.42;

			const groupMetadataFontSize = 12;
			const groupMetadataFontFamily = 'Dialog';
			const groupMetadataFontStyle = 'plain';
			// FontSize * 1,42 = Height
			const groupMetadataHeight = groupMetadataFontSize * 1.42 * groupMemberString.split('\n').length;

			const nodeWidth =
				longestLineGroupNameString > longestLineGroupMemberString
					? (longestLineGroupNameString * groupNameFontSize) / 1.2
					: (longestLineGroupMemberString * groupMetadataFontSize) / 1.2;

			const groupNode = graphML.createElement('node');
			groupNode.setAttribute('id', groupIdentifier(group));

			const data4 = graphML.createElement('data');
			data4.setAttribute('key', 'd4');

			const data5 = graphML.createElement('data');
			data5.setAttribute('key', 'd5');

			const yGenericNode = graphML.createElement('y:GenericNode');
			yGenericNode.setAttribute('configuration', 'ShinyPlateNode');

			const yGeomety = graphML.createElement('y:Geometry');
			yGeomety.setAttribute('height', String(groupMetadataHeight + groupNameHeight));
			yGeomety.setAttribute('width', String(nodeWidth));

			const yFill = graphML.createElement('y:Fill');
			yFill.setAttribute('color', '#FFCC00');
			yFill.setAttribute('transparent', 'false');

			const yBorderStyle = graphML.createElement('y:BorderStyle');
			yBorderStyle.setAttribute('hasColor', 'false');
			yBorderStyle.setAttribute('transparent', 'false');

			const yNodeLabelGroupName = graphML.createElement('y:NodeLabel');
			yNodeLabelGroupName.setAttribute('alignment', 'center');
			yNodeLabelGroupName.setAttribute('autoSizePolicy', 'content');
			yNodeLabelGroupName.setAttribute('fontFamily', groupNameFontFamily);
			yNodeLabelGroupName.setAttribute('fontSize', groupNameFontSize.toString());
			yNodeLabelGroupName.setAttribute('fontStyle', groupNameFontStyle);
			yNodeLabelGroupName.setAttribute('hasBackgroupColor', 'false');
			yNodeLabelGroupName.setAttribute('hasLineColor', 'false');
			yNodeLabelGroupName.setAttribute('height', groupNameHeight.toString());
			yNodeLabelGroupName.setAttribute('horizontalTextPosition', 'center');
			yNodeLabelGroupName.setAttribute('iconTextGap', '4');
			yNodeLabelGroupName.setAttribute('modelName', 'internal');
			yNodeLabelGroupName.setAttribute('modelPosition', 't');
			yNodeLabelGroupName.setAttribute('textColor', '#000000');
			yNodeLabelGroupName.setAttribute('verticalTextPosition', 'top');
			yNodeLabelGroupName.setAttribute('visible', 'true');
			yNodeLabelGroupName.textContent = group.name;

			const yNodeLabelGroupMetadata = graphML.createElement('y:NodeLabel');
			yNodeLabelGroupMetadata.setAttribute('alignment', 'center');
			yNodeLabelGroupMetadata.setAttribute('autoSizePolicy', 'content');
			yNodeLabelGroupMetadata.setAttribute('fontFamily', groupMetadataFontFamily);
			yNodeLabelGroupMetadata.setAttribute('fontSize', groupMetadataFontSize.toString());
			yNodeLabelGroupMetadata.setAttribute('fontStyle', groupMetadataFontStyle);
			yNodeLabelGroupMetadata.setAttribute('hasBackgroupColor', 'false');
			yNodeLabelGroupMetadata.setAttribute('hasLineColor', 'false');
			yNodeLabelGroupMetadata.setAttribute('height', groupMetadataHeight.toString());
			yNodeLabelGroupMetadata.setAttribute('horizontalTextPosition', 'center');
			yNodeLabelGroupMetadata.setAttribute('iconTextGap', '4');
			yNodeLabelGroupMetadata.setAttribute('modelName', 'internal');
			yNodeLabelGroupMetadata.setAttribute('modelPosition', 'b');
			yNodeLabelGroupMetadata.setAttribute('textColor', '#000000');
			yNodeLabelGroupMetadata.setAttribute('verticalTextPosition', 'top');
			yNodeLabelGroupMetadata.setAttribute('visible', 'true');
			yNodeLabelGroupMetadata.textContent = groupMemberString;

			yGenericNode.append(yGeomety);
			yGenericNode.append(yFill);
			yGenericNode.append(yBorderStyle);
			yGenericNode.append(yNodeLabelGroupName);
			yGenericNode.append(yNodeLabelGroupMetadata);

			data5.append(yGenericNode);

			groupNode.append(data4);
			groupNode.append(data5);

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

	const data6 = graphML.createElement('data');
	data6.setAttribute('key', 'd6');

	const yResources = graphML.createElement('y:Resources');

	data6.append(yResources);

	graphMLElement.append(data6);

	graphML.append(graphMLElement);

	return new XMLSerializer().serializeToString(graphML);
};
