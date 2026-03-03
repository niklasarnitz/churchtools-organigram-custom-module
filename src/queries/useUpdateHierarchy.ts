import { churchtoolsClient } from "@churchtools/churchtools-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Logger } from "../globals/Logger";

interface UpdateHierarchyPayload {
    childrenIds: number[];
    groupId: number;
    parentId?: number;
}

export const useUpdateHierarchy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ childrenIds, groupId, parentId }: UpdateHierarchyPayload) => {
            Logger.log(`API: Updating hierarchy for group ${String(groupId)}`, { childrenIds, parentId });

            const promises = [];

            if (parentId) {
                promises.push(
                    churchtoolsClient.put(`/groups/${String(groupId)}/parents/${String(parentId)}`, {})
                );
            }

            for (const childId of childrenIds) {
                promises.push(
                    churchtoolsClient.put(`/groups/${String(childId)}/parents/${String(groupId)}`, {})
                );
            }

            return Promise.all(promises);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['hierarchies'] });
            void queryClient.invalidateQueries({ queryKey: ['groupHierarchies'] });
        },
    });
};
