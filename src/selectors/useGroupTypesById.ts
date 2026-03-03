import { useMemo } from "react";

import { arrayToIndexedObject } from "../helpers/arrayToIndexedObject";
import { useGroupTypes } from "../queries/useGroupTypes";

export const useGroupTypesById = () => {
    const { data: groupTypes } = useGroupTypes();

    return useMemo(() => arrayToIndexedObject(groupTypes ?? [], 'id'), [groupTypes])
}
