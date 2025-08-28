import { NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { APP_MODE, allowMocks } from '@/lib/mode';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    
    return NextResponse.json({
      user: user?.email || null,
      app_mode: APP_MODE,
      allow_mocks: allowMocks,
      authenticated: !!user
    });
  } catch (error) {
    return NextResponse.json({
      user: null,
      app_mode: APP_MODE,
      allow_mocks: allowMocks,
      authenticated: false,
      error: 'Failed to get user'
    });
  }
}