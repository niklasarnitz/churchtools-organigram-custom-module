import { arrayToIndexedObject } from "../helpers/arrayToIndexedObject";
import { useGroupMembers } from "../queries/useGroupMembers";
import { useMemo } from "react";

export const useGroupMembersByPersonId = () => {
    const { data: members } = useGroupMembers();

    return useMemo(() => arrayToIndexedObject(members ?? [], 'personId'), [members])
}
