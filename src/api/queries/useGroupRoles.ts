import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";
import { Logger } from "../../globals/Logger";
import { GroupRole } from "../../models/GroupRole";

export const useGroupRoles = useQuery({
    queryKey: ['groupRoles'],
    queryFn: async () => {
        Logger.log('API: Fetching group roles');

        return churchtoolsClient.getAllPages<GroupRole>('/group/roles')
    }
})
