import { Logger } from "../globals/Logger";
import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";
import type { Hierarchy } from "../types/Hierarchy";

export const useGroupHierarchies = (groupIds: number[]) => useQuery({
    queryKey: ['groupHierarchies', groupIds],
    queryFn: async () => {
        Logger.log('API: Fetching group hierarchies for groups', groupIds);

        return churchtoolsClient.getAllPages<Hierarchy>('/groups/hierarchies', { groupIds })
    }
})

export const useHierarchies = () => useQuery({
    queryKey: ['hierarchies'],
    queryFn: async () => {
        Logger.log('API: Fetching group hierarchies');

        return churchtoolsClient.getAllPages<Hierarchy>('/groups/hierarchies')
    }
})
