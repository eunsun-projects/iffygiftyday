import { getIffy } from "@/apis/iffy.apis";
import { QUERY_KEY_IFFY } from "@/constants/iffy.const";
import type { IffyResponse } from "@/types/iffy.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useIffyQuery = () => {
  const queryClient = useQueryClient();
  return useMutation<IffyResponse, Error, { formData: FormData }>({
    mutationFn: ({ formData }: { formData: FormData }) => getIffy({ formData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_IFFY] });
    },
  });
};
