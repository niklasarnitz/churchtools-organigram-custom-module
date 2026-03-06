import { useCallback } from 'react';

import type { PreviewGraphNodeData } from '../types/GraphNode';
import type { Node } from '../types/GraphTypes';

import { oklchToHex } from '../globals/Colors';
import { useAppStore } from '../state/useAppStore';
import { useGenerateReflowData } from './useGenerateReflowData';

// Approximate character widths for size estimation (Dialog font in yEd)
const TITLE_FONT_SIZE = 12;
const TITLE_CHAR_WIDTH = 7.5; // bold Dialog 12
const BODY_FONT_SIZE = 10;
const BODY_CHAR_WIDTH = 6; // plain Dialog 10
const TITLE_LINE_HEIGHT = TITLE_FONT_SIZE + 2;
const BODY_LINE_HEIGHT = BODY_FONT_SIZE + 2;
const NODE_PADDING_X = 4;
const NODE_PADDING_Y = 4;
const LABEL_GAP = 4;
const MIN_NODE_WIDTH = 120;

export const useGenerateGraphMLData = () => {
    const data = useGenerateReflowData();
    const committedFilters = useAppStore((s) => s.committedFilters);
    const showGroupTypes = committedFilters?.showGroupTypes ?? true;

    return useCallback(() => {
        let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
    xmlns:y="http://www.yworks.com/xml/graphml"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
     http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="d0" for="node" attr.name="title" attr.type="string"/>
  <key id="d1" for="node" attr.name="groupType" attr.type="string"/>
  <key id="d3" for="node" attr.name="color" attr.type="string"/>
  <key id="d4" for="node" yfiles.type="nodegraphics"/>
  <key id="d5" for="edge" yfiles.type="edgegraphics"/>
  <graph id="G" edgedefault="directed">
`;

        for (const node of data.nodes as Node<PreviewGraphNodeData>[]) {
            const d = node.data;
            const shade500 = d.color.shades[500];
            const headerBg = oklchToHex(d.color.shades[100]);
            const borderColor = oklchToHex(d.color.shades[300]);
            const colorHex = shade500.startsWith('#') ? shade500 : oklchToHex(shade500);

            const plainLabel = buildPlainLabel(d.title, showGroupTypes ? d.groupTypeName : '', d.roles, d.memberNamesByRoleId);
            const bodyLines = plainLabel.split('\n');

            // Width: widest line across title (bold 12) and body (plain 10) + padding
            const titleWidth = d.title.length * TITLE_CHAR_WIDTH;
            const maxBodyLineWidth = bodyLines.reduce((max, line) => Math.max(max, line.length * BODY_CHAR_WIDTH), 0);
            const nodeWidth = Math.max(MIN_NODE_WIDTH, Math.max(titleWidth, maxBodyLineWidth) + NODE_PADDING_X * 2);

            // Height: title line + gap + body lines + vertical padding
            const titleHeight = TITLE_LINE_HEIGHT;
            const bodyHeight = bodyLines.length > 0 && plainLabel.length > 0
                ? LABEL_GAP + bodyLines.length * BODY_LINE_HEIGHT
                : 0;
            const nodeHeight = NODE_PADDING_Y * 2 + titleHeight + bodyHeight;

            graphml += `    <node id="${node.id}">
      <data key="d0">${escapeXml(d.title)}</data>
      <data key="d1">${showGroupTypes ? escapeXml(d.groupTypeName) : ''}</data>
      <data key="d3">${escapeXml(colorHex)}</data>
      <data key="d4">
        <y:ShapeNode>
          <y:Geometry height="${String(nodeHeight)}" width="${String(nodeWidth)}" x="${String(node.position.x)}" y="${String(node.position.y)}"/>
          <y:Fill color="${headerBg}" color2="${headerBg}" transparent="false"/>
          <y:BorderStyle color="${borderColor}" type="line" width="2.0"/>
          <y:NodeLabel alignment="center" autoSizePolicy="content" fontFamily="Dialog" fontSize="${String(TITLE_FONT_SIZE)}" fontStyle="bold" textColor="#0f172a" visible="true" modelName="internal" modelPosition="t">${escapeXml(d.title)}</y:NodeLabel>
          <y:NodeLabel alignment="center" autoSizePolicy="content" fontFamily="Dialog" fontSize="${String(BODY_FONT_SIZE)}" fontStyle="plain" textColor="#64748b" visible="true" modelName="internal" modelPosition="b">${escapeXml(plainLabel)}</y:NodeLabel>
          <y:Shape type="roundrectangle"/>
        </y:ShapeNode>
      </data>
    </node>
`;
        }

        for (const edge of data.edges) {
            graphml += `    <edge id="${edge.id}" source="${edge.source}" target="${edge.target}">
      <data key="d5">
        <y:PolyLineEdge>
          <y:LineStyle color="#64748B" type="line" width="2.0"/>
          <y:Arrows source="none" target="standard"/>
        </y:PolyLineEdge>
      </data>
    </edge>
`;
        }

        graphml += `  </graph>
</graphml>`;

        return graphml;
    }, [data, showGroupTypes]);
};

function buildPlainLabel(
    title: string,
    groupTypeName: string,
    roles: { id: number; name: string }[],
    memberNamesByRoleId: Map<number, string[]>,
): string {
    const lines: string[] = [];

    if (groupTypeName) {
        lines.push(groupTypeName.toUpperCase());
    }

    const rolesWithMembers = roles.filter((role) => memberNamesByRoleId.has(role.id));
    if (rolesWithMembers.length > 0) {
        lines.push('');
        for (const role of rolesWithMembers) {
            const names = memberNamesByRoleId.get(role.id) ?? [];
            lines.push(`\n${role.name}:`);
            for (const name of names) {
                lines.push(`  ${name}`);
            }
        }
    }

    return lines.join('\n');
}

function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case '"':
                return '&quot;';
            case '&':
                return '&amp;';
            case "'":
                return '&apos;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            default:
                return c;
        }
    });
}
