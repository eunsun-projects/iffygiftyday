import type { Iffy } from "@/types/iffy.types";
import api from "./axios";

export const postIffy = async ({ formData }: { formData: FormData }) => {
	return api.post<Iffy, Iffy>("/api/gift", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};
