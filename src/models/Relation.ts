import type { Group } from './Group';
import type { Person } from './Person';

export type Relation = {
	source: Group;
	target: Group | Person;
};
