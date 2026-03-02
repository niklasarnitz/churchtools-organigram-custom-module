import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";
import { Logger } from "../../globals/Logger";
import { Group } from "../../models/Group";

export const useGroups = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
        Logger.log('API: Fetching groups');

        return churchtoolsClient.getAllPages<Group>('/groups');
    }
})
