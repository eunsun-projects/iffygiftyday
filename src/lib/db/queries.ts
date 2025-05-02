import type { Iffy } from "@/types/iffy.types";
import { createClient } from "../supabase/server";

export async function saveIffy({ iffy }: { iffy: Iffy }) {
  const supabase = await createClient();
  try {
    return await supabase.from("iffy").insert(iffy).select().single();
  } catch (error) {
    console.error("Failed to save scenery in database");
    throw error;
  }
}
