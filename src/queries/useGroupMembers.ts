import { Logger } from '../globals/Logger';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';
import type { GroupMember } from '../types/GroupMember';

export const useGroupMembers = () => useQuery({
    queryKey: ['groupMembers'],
    queryFn: async () => {
        Logger.log('API: Fetching group members');

        return churchtoolsClient.getAllPages<GroupMember>(`/groups/members`)
    }
})
