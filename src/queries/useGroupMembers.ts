import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useQuery } from '@tanstack/react-query';

import type { GroupMember } from '../types/GroupMember';

import { Logger } from '../globals/Logger';

export const useGroupMembers = () => useQuery({
    queryFn: async () => {
        Logger.log('API: Fetching group members');

        return churchtoolsClient.getAllPages<GroupMember>(`/groups/members`)
    },
    queryKey: ['groupMembers']
})
