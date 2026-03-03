import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";

import type { Permissions } from "../types/Permissions";

import { Logger } from "../globals/Logger";

export const fetchPermissions = async () => {
    Logger.log('API: Fetching permissions');

    return churchtoolsClient.get<Permissions>('/permissions/global');
};

export const usePermissions = () => useQuery({
    queryFn: fetchPermissions,
    queryKey: ['permissions']
});
