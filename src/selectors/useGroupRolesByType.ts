import { useMemo } from "react";
import { useGroupRoles } from "../queries/useGroupRoles";
import { GroupRole } from "../types/GroupRole";

export const useGroupRolesByType = () => {
    const { data: groupRoles } = useGroupRoles();

    return useMemo(() => {
        if (!groupRoles) return {};
        return groupRoles.reduce((acc, role) => {
            if (!acc[role.groupTypeId]) {
                acc[role.groupTypeId] = [];
            }
            acc[role.groupTypeId].push(role);
            return acc;
        }, {} as Record<number, GroupRole[]>);
    }, [groupRoles])
}
