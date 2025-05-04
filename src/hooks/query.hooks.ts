import { getAllGifts, getIffy, postIffy } from "@/apis/iffy.apis";
import {
  MAX_POLL_ATTEMPTS,
  POLLING_INTERVAL_MS,
  QUERY_KEY_ALL_GIFTS,
  QUERY_KEY_IFFY,
} from "@/constants/iffy.const";
import type { AllGiftsResponse, Iffy } from "@/types/iffy.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useIffyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<Iffy, Error, { formData: FormData }>({
    mutationFn: ({ formData }: { formData: FormData }) =>
      postIffy({ formData }),
  });
};

export const useIffyQuery = ({ id }: { id: string }) => {
  return useQuery<Iffy, Error>({
    queryKey: [QUERY_KEY_IFFY, id],
    queryFn: () => getIffy({ id }),
    enabled: !!id,
  });
};

export const usePollIffyStatusQuery = (id: string | null, count: number) => {
  return useQuery({
    queryKey: [QUERY_KEY_IFFY, id],
    queryFn: () => {
      console.log(`[Polling ${id}] Executing queryFn (fetch status)`);
      return getIffy({ id: id as string });
    },
    enabled: !!id && count < MAX_POLL_ATTEMPTS,
    refetchInterval: (query) => {
      if (!id) return false;

      const currentStatus = query.state.data?.status;
      if (currentStatus === "completed" || currentStatus === "failed") {
        console.log(
          `[Polling ${id}] Status '${currentStatus}'. Stopping interval.`
        );
        return false;
      }

      if (count >= MAX_POLL_ATTEMPTS) {
        console.log(
          `[Polling ${id}] Max attempts (${MAX_POLL_ATTEMPTS}) reached in interval check. Stopping.`
        );
        return false;
      }

      console.log(
        `[Polling ${id}] Status is '${currentStatus}'. Continuing polling (Attempt ${count}).`
      );
      return POLLING_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 1,
    gcTime: 1000 * 60 * 5,
    staleTime: POLLING_INTERVAL_MS,
  });
};

export const useAllGiftsQuery = () => {
  return useQuery<AllGiftsResponse, Error>({
    queryKey: [QUERY_KEY_ALL_GIFTS],
    queryFn: getAllGifts,
  });
};
