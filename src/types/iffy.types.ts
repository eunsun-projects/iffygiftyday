import type { Tables } from "./supabase";

export type Iffy = Tables<"iffy">;

export type IffyResponse = Omit<Iffy, "created_at" | "id">;

export interface LoadingState {
  open: boolean;
  isError: boolean;
}

export type AllGiftsResponse = {
  resultCount: number;
};

export type GenResponse = {
  status: "success" | "error";
  message: string;
};
