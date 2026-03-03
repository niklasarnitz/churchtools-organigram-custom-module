import { useMemo } from 'react';

import { arrayToIndexedObject } from '../helpers/arrayToIndexedObject';
import { useGroupRoles } from '../queries/useGroupRoles';

export const useGroupRolesById = () => {
	const { data: groupRoles } = useGroupRoles();

	return useMemo(() => arrayToIndexedObject(groupRoles ?? [], 'id'), [groupRoles]);
};
