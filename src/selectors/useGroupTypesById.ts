import { arrayToIndexedObject } from "../helpers/arrayToIndexedObject";
import { useGroupTypes } from "../queries/useGroupTypes";
import { useMemo } from "react";

export const useGroupTypesById = () => {
    const { data: groupTypes } = useGroupTypes();

    return useMemo(() => arrayToIndexedObject(groupTypes ?? [], 'id'), [groupTypes])
}
