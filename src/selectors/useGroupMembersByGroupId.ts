import { useMemo } from "react";
import { useGroupMembers } from "../queries/useGroupMembers";
import { GroupMember } from "../types/GroupMember";

export const useGroupMembersByGroupId = () => {
    const { data: members } = useGroupMembers();

    return useMemo(() => {
        if (!members) return {};
        return members.reduce((acc, member) => {
            if (!acc[member.groupId]) {
                acc[member.groupId] = [];
            }
            acc[member.groupId].push(member);
            return acc;
        }, {} as Record<number, GroupMember[]>);
    }, [members])
}
