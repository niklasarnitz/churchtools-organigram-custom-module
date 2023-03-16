import type { Group } from '../models/Group';
import type { Person } from '../models/Person';

export enum NodeType {
	PERSON = 'person',
	GROUP = 'group',
}

export const determineIfIsGroupOrPerson = (node: Group | Person) => {
	if ('firstName' && 'lastName' in node) {
		return NodeType.PERSON;
	}

	return NodeType.GROUP;
};
