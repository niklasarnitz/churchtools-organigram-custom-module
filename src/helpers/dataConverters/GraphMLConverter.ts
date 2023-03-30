import { createData } from './../createRelatedData';
import { getGroupMetadataString, getGroupNodeIdentifier, getGroupTitle } from './../GraphHelper';
import { useAppStore } from '../../state/useAppStore';

export const generateGraphMLData = () => {
	const { relations, nodes } = createData();

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
		const groupMembers = node.members;
		const { personsById } = useAppStore.getState();
		const groupRoles = node.groupRoles;

		const groupTitleString = getGroupTitle(node.group);
		const groupMemberString = getGroupMetadataString(groupRoles, groupMembers, personsById);

		// Some crude logic to calculate a rough length because auto width doesn't work properly.
		const longestLineGroupMemberString = Math.max(...groupMemberString.split('\n').map((line) => line.length));
		const longestLineGroupNameString = Math.max(...node.group.name.split('\n').map((line) => line.length));

		const groupNameFontSize = 18;
		const groupNameFontFamily = 'Dialog';
		const groupNameFontStyle = 'bold';
		// FontSize * 1,42 = Height
		const groupNameHeight = groupNameFontSize * 1.42 * groupTitleString.split('\n').length;

		const groupMetadataFontSize = 12;
		const groupMetadataFontFamily = 'Dialog';
		const groupMetadataFontStyle = 'plain';
		// FontSize * 1,42 = Height
		const groupMetadataHeight =
			groupMetadataFontSize * 1.42 * groupMemberString.split('\n').length +
			getGroupTitle(node.group).split('\n').length;

		const nodeWidth =
			longestLineGroupNameString > longestLineGroupMemberString
				? (longestLineGroupNameString * groupNameFontSize) / 1.2
				: (longestLineGroupMemberString * groupMetadataFontSize) / 1.2;

		const groupNode = graphML.createElement('node');
		groupNode.setAttribute('id', getGroupNodeIdentifier(node.group));

		const data4 = graphML.createElement('data');
		data4.setAttribute('key', 'd4');

		const data5 = graphML.createElement('data');
		data5.setAttribute('key', 'd5');

		const yGenericNode = graphML.createElement('y:GenericNode');
		yGenericNode.setAttribute('configuration', 'ShinyPlateNode');

		const yGeometry = graphML.createElement('y:Geometry');
		yGeometry.setAttribute('height', String(groupMetadataHeight + groupNameHeight));
		yGeometry.setAttribute('width', String(nodeWidth));

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
		yNodeLabelGroupName.setAttribute('hasBackgroundColor', 'false');
		yNodeLabelGroupName.setAttribute('hasLineColor', 'false');
		yNodeLabelGroupName.setAttribute('height', groupNameHeight.toString());
		yNodeLabelGroupName.setAttribute('horizontalTextPosition', 'center');
		yNodeLabelGroupName.setAttribute('iconTextGap', '4');
		yNodeLabelGroupName.setAttribute('modelName', 'internal');
		yNodeLabelGroupName.setAttribute('modelPosition', 't');
		yNodeLabelGroupName.setAttribute('textColor', '#000000');
		yNodeLabelGroupName.setAttribute('verticalTextPosition', 'top');
		yNodeLabelGroupName.setAttribute('visible', 'true');
		yNodeLabelGroupName.textContent = groupTitleString;

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

		yGenericNode.append(yGeometry);
		yGenericNode.append(yFill);
		yGenericNode.append(yBorderStyle);
		yGenericNode.append(yNodeLabelGroupName);
		yGenericNode.append(yNodeLabelGroupMetadata);

		data5.append(yGenericNode);

		groupNode.append(data4);
		groupNode.append(data5);

		graphElement.append(groupNode);
	}

	for (const relation of relations) {
		const edge = graphML.createElement('edge');
		edge.setAttribute('source', getGroupNodeIdentifier(relation.source));
		edge.setAttribute('target', getGroupNodeIdentifier(relation.target));

		graphElement.append(edge);
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
