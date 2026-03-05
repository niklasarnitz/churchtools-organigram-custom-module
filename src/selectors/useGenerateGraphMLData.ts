import { useCallback } from 'react';

import type { URecord } from '@ainias42/js-helper';

import { oklchToHex } from '../globals/Colors';
import { useAppStore } from '../state/useAppStore';
import type { PreviewGraphNodeData } from '../types/GraphNode';
import type { GroupMember } from '../types/GroupMember';
import type { GroupRole } from '../types/GroupRole';
import type { Node } from '../types/GraphTypes';
import type { Person } from '../types/Person';
import { useGenerateReflowData } from './useGenerateReflowData';

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
			const colorHex = shade500.startsWith('#') ? shade500 : oklchToHex(shade500);

			const richLabel = buildRichLabel(d.title, showGroupTypes ? d.groupTypeName : '', d.roles, d.members, d.personsById);

			const nodeWidth = node.width ?? 250;
			const nodeHeight = node.height ?? 80;

			graphml += `    <node id="${node.id}">
      <data key="d0">${escapeXml(d.title)}</data>
      <data key="d1">${showGroupTypes ? escapeXml(d.groupTypeName) : ''}</data>
      <data key="d3">${escapeXml(colorHex)}</data>
      <data key="d4">
        <y:ShapeNode>
          <y:Geometry height="${String(nodeHeight)}" width="${String(nodeWidth)}" x="${String(node.position.x)}" y="${String(node.position.y)}"/>
          <y:Fill color="${colorHex}" transparent="false"/>
          <y:BorderStyle color="#000000" type="line" width="1.0"/>
          <y:NodeLabel alignment="center" autoSizePolicy="node_size" configuration="com.yworks.nodeLabel.richText" fontFamily="Dialog" fontSize="12" textColor="#FFFFFF" visible="true">${richLabel}</y:NodeLabel>
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

function buildRichLabel(
	title: string,
	groupTypeName: string,
	roles: GroupRole[],
	members: GroupMember[],
	personsById: URecord<number, Person>,
): string {
	const membersByRoleId = new Map<number, GroupMember[]>();
	for (const member of members) {
		let list = membersByRoleId.get(member.groupTypeRoleId);
		if (!list) {
			list = [];
			membersByRoleId.set(member.groupTypeRoleId, list);
		}
		list.push(member);
	}

	// e() escapes text for HTML content
	const e = escapeHtml;

	let html = `<html><body style="word-wrap: break-word;">`;
	html += `<p align="center"><b><font size="5">${e(title)}</font></b></p>`;

	if (groupTypeName) {
		html += `<p align="center"><font size="3">${e(groupTypeName)}</font></p>`;
	}

	if (roles.length > 0) {
		html += `<br/>`;
		for (const role of roles) {
			const personsWithRole = membersByRoleId.get(role.id) ?? [];
			const names = personsWithRole.map((m) => {
				const person = personsById[m.personId];
				return person ? `${person.firstName} ${person.lastName}` : 'Unknown';
			});

			html += `<p align="center"><b>${e(role.name)}:</b><br/>`;
			html += `${names.map((n) => e(n)).join('<br/>')}</p>`;
		}
	}

	html += `</body></html>`;
	// XML-escape the entire HTML so it embeds correctly inside <y:NodeLabel>
	return escapeXml(html);
}

function escapeHtml(unsafe: string) {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function escapeXml(unsafe: string) {
	return unsafe.replace(/[<>&"']/g, (c) => {
		switch (c) {
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
			case '"':
				return '&quot;';
			case "'":
				return '&apos;';
			default:
				return c;
		}
	});
}
