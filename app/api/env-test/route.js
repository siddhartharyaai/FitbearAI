import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    APP_MODE: process.env.APP_MODE,
    NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE,
    ALLOW_MOCKS: process.env.ALLOW_MOCKS,
    NEXT_PUBLIC_ALLOW_MOCKS: process.env.NEXT_PUBLIC_ALLOW_MOCKS,
    all_env: Object.keys(process.env).filter(key => key.includes('APP_MODE') || key.includes('ALLOW_MOCKS'))
  });
}