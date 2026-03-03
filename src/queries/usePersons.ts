import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";

import type { Person } from "../types/Person";

import { Logger } from "../globals/Logger";

export const usePersons = () => useQuery({
    queryFn: async () => {
        Logger.log('API: Fetching persons');

        return churchtoolsClient.getAllPages<Person>('/persons');
    },
    queryKey: ['persons']
});
