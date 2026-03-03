import { useMemo } from 'react';

import { arrayToIndexedObject } from '../helpers/arrayToIndexedObject';
import { usePersons } from '../queries/usePersons';

export const usePersonsById = () => {
	const { data: persons } = usePersons();

	return useMemo(() => arrayToIndexedObject(persons ?? [], 'id'), [persons]);
};
