import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function requireUser() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookies().get(name)?.value,
        set: () => {}, remove: () => {}
      }
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return user;
}