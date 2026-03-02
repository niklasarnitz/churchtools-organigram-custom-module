import { arrayToIndexedObject } from "../helpers/arrayToIndexedObject";
import { useMemo } from "react";
import { usePersons } from "../queries/usePersons";

export const usePersonsById = () => {
    const { data: persons } = usePersons();

    return useMemo(() => arrayToIndexedObject(persons ?? [], 'id'), [persons])
}
