import { getMe } from "@/apis/auth.api";
import { QUERY_KEY_ME } from "@/constants/auth.const";
import type { User } from "@supabase/supabase-js";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import { createClient } from "./supabase/server";

export const prefetchMe = async () => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: [QUERY_KEY_ME],
    queryFn: () => getMe(),
  });
  const me: User | undefined = await queryClient.getQueryData([QUERY_KEY_ME]);
  const dehydratedState = dehydrate(queryClient);

  return { me, dehydratedState };
};

export const getMeServer = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  return data.user;
};
