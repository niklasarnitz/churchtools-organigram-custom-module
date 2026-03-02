import { arrayToIndexedObject } from "../helpers/arrayToIndexedObject";
import { useHierarchies } from "../queries/useHierarchies";
import { useMemo } from "react";

export const useHierarchiesByGroupId = () => {
    const { data: hierarchies } = useHierarchies();

    return useMemo(() => arrayToIndexedObject(hierarchies ?? [], 'groupId'), [hierarchies])
}
