import { useMemo } from 'react';

import { arrayToIndexedObject } from '../helpers/arrayToIndexedObject';
import { useGroupMembers } from '../queries/useGroupMembers';

export const useGroupMembersByPersonId = () => {
	const { data: members } = useGroupMembers();

	return useMemo(() => arrayToIndexedObject(members ?? [], 'personId'), [members]);
};
