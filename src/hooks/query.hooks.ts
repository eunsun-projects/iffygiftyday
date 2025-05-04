import { getAllGifts, getIffy, postIffy } from "@/apis/iffy.apis";
import {
	QUERY_KEY_ALL_GIFTS,
	QUERY_KEY_IFFY,
	QUERY_KEY_IFFY_STATUS,
} from "@/constants/iffy.const";
import type { AllGiftsResponse, Iffy } from "@/types/iffy.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useIffyMutation = () => {
	const queryClient = useQueryClient();
	return useMutation<Iffy, Error, { formData: FormData }>({
		mutationFn: ({ formData }: { formData: FormData }) =>
			postIffy({ formData }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEY_IFFY] });
		},
	});
};

export const useIffyQuery = ({ id }: { id: string }) => {
	return useQuery<Iffy, Error>({
		queryKey: [QUERY_KEY_IFFY, id],
		queryFn: () => getIffy({ id }),
		enabled: !!id,
	});
};

export const usePollIffyStatusQuery = (id: string | null) => {
	const POLLING_INTERVAL_MS = 5000;
	const MAX_POLLING_COUNT = 15;
	let pollingCount = 0;
	return useQuery<Iffy, Error>({
		queryKey: [QUERY_KEY_IFFY_STATUS, id],
		queryFn: () => getIffy({ id: id as string }),
		enabled: !!id,
		refetchInterval: (query) => {
			// 11회 즉 55 초까지만 최대 실행 그 이후 return false
			const currentStatus = query.state.data?.status;
			if (currentStatus === "completed" || currentStatus === "failed") {
				console.log(`Polling stopped for ${id}, status: ${currentStatus}`);
				return false;
			}
			if (pollingCount >= MAX_POLLING_COUNT) {
				console.log(`Polling stopped for ${id}, status: ${currentStatus}`);
				return false;
			}
			pollingCount++;
			return POLLING_INTERVAL_MS;
		},
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false,
		retry: 1,
	});
};

export const useAllGiftsQuery = () => {
	return useQuery<AllGiftsResponse, Error>({
		queryKey: [QUERY_KEY_ALL_GIFTS],
		queryFn: getAllGifts,
	});
};
