import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
	const supabase = await createClient();

	const { data, error } = await supabase.from("iffy").select("*", {
		count: "exact",
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const resultCount = data.length;

	return NextResponse.json({ resultCount });
}
