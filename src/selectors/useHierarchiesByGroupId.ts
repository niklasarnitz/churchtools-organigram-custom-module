import { useMemo } from 'react';

import { arrayToIndexedObject } from '../helpers/arrayToIndexedObject';
import { useHierarchies } from '../queries/useHierarchies';

export const useHierarchiesByGroupId = () => {
	const { data: hierarchies } = useHierarchies();

	return useMemo(() => arrayToIndexedObject(hierarchies ?? [], 'groupId'), [hierarchies]);
};
