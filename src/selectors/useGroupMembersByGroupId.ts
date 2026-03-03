import { URecord } from "@ainias42/js-helper";
import { useMemo } from "react";

import type { GroupMember } from "../types/GroupMember";

import { useGroupMembers } from "../queries/useGroupMembers";

export const useGroupMembersByGroupId = () => {
    const { data: members } = useGroupMembers();

    return useMemo(() => {
        if (!members) return {};
        const acc = {} as URecord<number, GroupMember[]>;
        for (const member of members) {
            (acc[member.groupId] ??= []).push(member);
        }
        return acc;
    }, [members])
}
