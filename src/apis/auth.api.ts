import { createClient } from "@/lib/supabase/client";
import type { SignOutResponse } from "@/types/auth.types";
import type { User } from "@supabase/supabase-js";
import api from "./axios";

export const deleteSignOut = () => {
  const url = "/api/auth/logout";
  return api.delete<SignOutResponse, SignOutResponse>(url);
};

export const getMe = () => {
  const url = "/api/auth/me";
  return api.get<User, User>(url);
};

export const getMeClient = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data.session;
};

export const getProviderLogin = (provider: string, next?: string) => {
  const url = `/api/auth/provider?provider=${provider}&next=${next}`;
  return api.get<{ message: string }, { message: string }>(url);
};
