import type { Iffy } from "@/types/iffy.types";
import api from "./axios";

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
