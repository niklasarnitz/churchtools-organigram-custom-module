import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";
import { Logger } from "../../globals/Logger";
import { GroupType } from "../../models/GroupType";

export const useGroupTypes = useQuery({
    queryKey: ['groupTypes'],
    queryFn: async () => {
        Logger.log('API: Fetching group types');

        return churchtoolsClient.getAllPages<GroupType>('/group/grouptypes')
    }
})
