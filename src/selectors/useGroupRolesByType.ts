import type { URecord } from "@ainias42/js-helper";

import { useMemo } from "react";

import type { GroupRole } from "../types/GroupRole";

import { useGroupRoles } from "../queries/useGroupRoles";

export const useGroupRolesByType = () => {
    const { data: groupRoles } = useGroupRoles();

    return useMemo(() => {
        if (!groupRoles) return {};
        const acc = {} as URecord<number, GroupRole[]>;
        for (const role of groupRoles) {
            (acc[role.groupTypeId] ??= []).push(role);
        }
        return acc;
    }, [groupRoles])
}
