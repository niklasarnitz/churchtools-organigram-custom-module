import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useQuery } from "@tanstack/react-query";
import { Logger } from "../../globals/Logger";
import { Person } from "../../models/Person";

export const usePersons = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
        Logger.log('API: Fetching persons');

        return churchtoolsClient.getAllPages<Person>('/persons');
    }
});
