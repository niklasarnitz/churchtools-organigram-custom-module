import { arrayToIndexedObject } from "../helpers/arrayToIndexedObject";
import { useGroups } from "../queries/useGroups";
import { useMemo } from "react";

export const useGroupsById = () => {
    const { data: groups } = useGroups();

    return useMemo(() => arrayToIndexedObject(groups ?? [], 'id'), [groups])
}
