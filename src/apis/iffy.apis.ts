import type { Iffy, IffyResponse } from "@/types/iffy.types";
import api from "./axios";

export const getIffy = async ({ formData }: { formData: FormData }) => {
	return api.post<Iffy, IffyResponse>("/api/gift", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};
