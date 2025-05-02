import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error("Missing Supabase URL or Anon Key");
	}

	const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				// biome-ignore lint/complexity/noForEach: <explanation>
				cookiesToSet.forEach(({ name, value, options }) =>
					request.cookies.set(name, value),
				);
				supabaseResponse = NextResponse.next({
					request,
				});
				// biome-ignore lint/complexity/noForEach: <explanation>
				cookiesToSet.forEach(({ name, value, options }) =>
					supabaseResponse.cookies.set(name, value, options),
				);
			},
		},
	});

	// refreshing the auth token
	// const {
	// 	data: { user },
	// } = await supabase.auth.getUser();

	// console.log("user =====>", user);

	// if (!user) {
	// 	const url = request.nextUrl.clone();
	// 	url.pathname = "/signin";
	// 	return NextResponse.redirect(url);
	// }

	return supabaseResponse;
}
