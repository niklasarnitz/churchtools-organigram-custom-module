import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";

import type { GroupRole } from "../types/GroupRole";

import { Logger } from "../globals/Logger";

export const useGroupRoles = () => useQuery({
    queryFn: async () => {
        Logger.log('API: Fetching group roles');

        return churchtoolsClient.getAllPages<GroupRole>('/group/roles')
    },
    queryKey: ['groupRoles']
})
