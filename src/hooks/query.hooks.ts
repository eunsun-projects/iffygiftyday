import { getIffy, postIffy } from "@/apis/iffy.apis";
import { QUERY_KEY_IFFY } from "@/constants/iffy.const";
import type { Iffy } from "@/types/iffy.types";
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
