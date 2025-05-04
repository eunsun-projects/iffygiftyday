import type { AllGiftsResponse, GenResponse, Iffy } from "@/types/iffy.types";
import api, { imgApi } from "./axios";

export const postIffy = async ({ formData }: { formData: FormData }) => {
	return api.post<Iffy, Iffy>("/api/gift", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};

export const getIffy = async ({ id }: { id: string }) => {
	return api.get<Iffy, Iffy>(`/api/gift?id=${id}`);
};

export const getAllGifts = async () => {
	return api.get<AllGiftsResponse, AllGiftsResponse>("/api/allgifts");
};

export const getGenerateIffy = async ({ id }: { id: string }) => {
	return imgApi.get<GenResponse, GenResponse>(`/api/generate?id=${id}`);
};
