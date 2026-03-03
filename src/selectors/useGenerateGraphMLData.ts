import { useCallback } from 'react';
import { type Node } from 'reactflow';

import { type PreviewGraphNodeData } from '../components/PreviewGraph/PreviewGraphNode';
import { oklchToHex } from '../globals/Colors';
import {
    getGroupMetadataHeight,
    getGroupMetadataString,
    getGroupNodeHeight,
    getGroupNodeIdentifier,
    getGroupNodeWidth,
    getGroupTitle,
    groupMetadataFontFamily,
    groupMetadataFontSize,
    groupMetadataFontStyle,
    groupNameFontFamily,
    groupNameFontSize,
    groupNameFontStyle,
    groupNameHeight,
} from '../helpers/GraphHelper';
import { useAppStore } from '../state/useAppStore';
import { useGenerateReflowData } from './useGenerateReflowData';
import { useGroupTypesById } from './useGroupTypesById';
import { usePersonsById } from './usePersonsById';

export const useGenerateGraphMLData = () => {
    const data = useGenerateReflowData();
    const showGroupTypes = useAppStore((s) => s.showGroupTypes);
    const personsById = usePersonsById();
    const groupTypesById = useGroupTypesById();

    return useCallback(() => {
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

        for (const node of data.nodes as Node<PreviewGraphNodeData>[]) {
            const groupMembers = node.data.members;
            const groupRoles = node.data.roles;
            const group = node.data.group;

            const groupTitleString = getGroupTitle(group, showGroupTypes, groupTypesById);
            const groupMetadataString = getGroupMetadataString(groupRoles, groupMembers, personsById);

            const groupNode = graphML.createElement('node');
            groupNode.setAttribute('id', getGroupNodeIdentifier(group));

            const data4 = graphML.createElement('data');
            data4.setAttribute('key', 'd4');

            const data5 = graphML.createElement('data');
            data5.setAttribute('key', 'd5');

            const yGenericNode = graphML.createElement('y:GenericNode');
            yGenericNode.setAttribute('configuration', 'BevelNodeWithShadow');

            const yGeometry = graphML.createElement('y:Geometry');
            yGeometry.setAttribute('height', String(getGroupNodeHeight(groupMetadataString, groupTitleString)));
            yGeometry.setAttribute('width', String(getGroupNodeWidth(groupTitleString, groupMetadataString)));
            yGeometry.setAttribute('x', String(node.position.x));
            yGeometry.setAttribute('y', String(node.position.y));

            const yFill = graphML.createElement('y:Fill');
            const color = node.data.color;
            console.log(node.data.color)
            yFill.setAttribute('color', oklchToHex(color.shades[100]));
            yFill.setAttribute('transparent', 'false');

            const yBorderStyle = graphML.createElement('y:BorderStyle');
            yBorderStyle.setAttribute('color', oklchToHex(color.shades[700]));
            yBorderStyle.setAttribute('hasColor', 'true');
            yBorderStyle.setAttribute('raised', 'false');
            yBorderStyle.setAttribute('type', 'line');
            yBorderStyle.setAttribute('width', '1.0');

            const yNodeLabelGroupName = graphML.createElement('y:NodeLabel');
            yNodeLabelGroupName.setAttribute('alignment', 'center');
            yNodeLabelGroupName.setAttribute('autoSizePolicy', 'content');
            yNodeLabelGroupName.setAttribute('fontFamily', groupNameFontFamily);
            yNodeLabelGroupName.setAttribute('fontSize', groupNameFontSize.toString());
            yNodeLabelGroupName.setAttribute('fontStyle', groupNameFontStyle);
            yNodeLabelGroupName.setAttribute('hasBackgroundColor', 'false');
            yNodeLabelGroupName.setAttribute('hasLineColor', 'false');
            yNodeLabelGroupName.setAttribute('height', groupNameHeight(groupTitleString).toString());
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
            yNodeLabelGroupMetadata.setAttribute('hasBackgroundColor', 'false');
            yNodeLabelGroupMetadata.setAttribute('hasLineColor', 'false');
            yNodeLabelGroupMetadata.setAttribute('height', getGroupMetadataHeight(groupMetadataString).toString());
            yNodeLabelGroupMetadata.setAttribute('horizontalTextPosition', 'center');
            yNodeLabelGroupMetadata.setAttribute('iconTextGap', '4');
            yNodeLabelGroupMetadata.setAttribute('modelName', 'internal');
            yNodeLabelGroupMetadata.setAttribute('modelPosition', 'b');
            yNodeLabelGroupMetadata.setAttribute('textColor', '#000000');
            yNodeLabelGroupMetadata.setAttribute('verticalTextPosition', 'top');
            yNodeLabelGroupMetadata.setAttribute('visible', 'true');
            yNodeLabelGroupMetadata.textContent = groupMetadataString;

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

        for (const edge of data.edges) {
            const edgeElement = graphML.createElement('edge');
            edgeElement.setAttribute('id', edge.id);
            const sourceNode = data.nodes.find((n) => n.id === edge.source) as Node<PreviewGraphNodeData> | undefined;
            const targetNode = data.nodes.find((n) => n.id === edge.target) as Node<PreviewGraphNodeData> | undefined;

            if (sourceNode && targetNode) {
                edgeElement.setAttribute('source', getGroupNodeIdentifier(sourceNode.data.group));
                edgeElement.setAttribute('target', getGroupNodeIdentifier(targetNode.data.group));
                graphElement.append(edgeElement);
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
    }, [data, showGroupTypes, groupTypesById, personsById]);
};
