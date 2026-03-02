import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";
import { Logger } from "../globals/Logger";
import { Permissions } from "../types/Permissions";

export const usePermissions = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
        Logger.log('API: Fetching permissions');

        return churchtoolsClient.get<Permissions>('/permissions/global')
    }
})
