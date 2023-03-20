import { determineIfIsGroupOrPerson } from './../determineIfIsGroupOrPerson';
import type { Group } from '../../models/Group';
import type { Person } from './../../models/Person';
import type { Relation } from '../../models/Relation';

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

const renderNodes = (nodes: (Person | Group)[]) => {
	if (nodes.length === 0) return '';

	let renderedNodes = '';

	for (const node of nodes) {
		if (determineIfIsGroupOrPerson(node) === 'group') {
			const group = node as Group;
			const groupNode = `<node id="group-${group.id}">
				<data key="d6">
					<y:ShapeNode>
						<y:Geometry height="30.0" width="30.0" x="0.0" y="0.0"/>
						<y:Fill color="#FFCC00" transparent="false"/>
						<y:BorderStyle color="#000000" type="line" width="1.0"/>
						<y:NodeLabel alignment="center" autoSizePolicy="content" fontFamily="Dialog" fontSize="12" fontStyle="plain" hasBackgroundColor="false" hasLineColor="false" height="18.701171875" modelName="internal" modelPosition="c" textColor="#000000" visible="true" width="28.0" x="1.0" y="5.6494140625">${group.name}</y:NodeLabel>
						<y:Shape type="ellipse"/>
					</y:ShapeNode>
				</data>
			</node>`;
			renderedNodes += groupNode;
		} else {
			const person = node as Person;

			const personNode = `<node id="person-${person.id}">
				<data key="d6">
					<y:ShapeNode>
						<y:Geometry height="30.0" width="30.0" x="0.0" y="0.0"/>
						<y:Fill color="#FFCC00" transparent="false"/>
						<y:BorderStyle color="#000000" type="line" width="1.0"/>
						<y:NodeLabel alignment="center" autoSizePolicy="content" fontFamily="Dialog" fontSize="12" fontStyle="plain" hasBackgroundColor="false" hasLineColor="false" height="18.701171875" modelName="internal" modelPosition="c" textColor="#000000" visible="true" width="28.0" x="1.0" y="5.6494140625">${person.firstName} ${person.lastName}</y:NodeLabel>
						<y:Shape type="roundrectangle"/>
					</y:ShapeNode>
				</data>
			</node>`;
			renderedNodes += personNode;
		}
	}

	return renderedNodes;
};

const renderEdges = (relations: Relation[]) => {
	if (relations.length === 0) return '';

	let renderedEdges = '';

	for (const relation of relations) {
		const sourceKey = determineIfIsGroupOrPerson(relation.source);
		const targetKey = determineIfIsGroupOrPerson(relation.target);

		const edge = `<edge source="${sourceKey}-${relation.source.id}" target="${targetKey}-${relation.target.id}"/>`;
		renderedEdges += edge;
	}

	return renderedEdges;
};

const renderFooter = () => {
	return `
    </graph>
</graphml>`;
};

export const generateGraphMLFile = ({ nodes, relations }: { nodes: (Person | Group)[]; relations: Relation[] }) => {
	return renderHeader() + renderNodes(nodes) + renderEdges(relations) + renderFooter();
};
