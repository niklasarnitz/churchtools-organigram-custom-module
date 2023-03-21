import type { Group } from '../models/Group';
import type { GroupMember } from './../models/GroupMember';

export enum NodeType {
	MEMBER = 'member',
	GROUP = 'group',
}

export const determineIfIsGroupOrPerson = (node: Group | GroupMember) => {
	if (!node) {
		return;
	}

	if ('personId' in node) {
		return NodeType.MEMBER;
	}

	return NodeType.GROUP;
};
