import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookies().get(name)?.value,
        set: (name, value, options) => cookies().set({ name, value, ...options }),
        remove: (name, options) => cookies().set({ name, value: "", ...options }),
      },
    }
  );
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/", req.url));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";