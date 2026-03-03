import { useMemo } from 'react';

import { arrayToIndexedObject } from '../helpers/arrayToIndexedObject';
import { useGroups } from '../queries/useGroups';

export const useGroupsById = () => {
	const { data: groups } = useGroups();

	return useMemo(() => arrayToIndexedObject(groups ?? [], 'id'), [groups]);
};
