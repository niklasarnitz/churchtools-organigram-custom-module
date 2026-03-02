import { arrayToIndexedObject } from "../helpers/arrayToIndexedObject";
import { useGroupRoles } from "../queries/useGroupRoles";
import { useMemo } from "react";

export const useGroupRolesById = () => {
    const { data: groupRoles } = useGroupRoles();

    return useMemo(() => arrayToIndexedObject(groupRoles ?? [], 'id'), [groupRoles])
}
