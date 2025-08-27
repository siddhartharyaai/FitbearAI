import { NextResponse } from "next/server";

// Force Node.js runtime for MongoDB operations  
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function computeTDEE(payload) {
  // Harris-Benedict equation (works fine for MVP)
  const { sex, age, height_cm, weight_kg, activity_level } = payload;
  
  const bmr = sex === "male"
    ? 66.47 + 13.75 * weight_kg + 5.003 * height_cm - 6.755 * age
    : 655.1 + 9.563 * weight_kg + 1.850 * height_cm - 4.676 * age;

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  return Math.round(bmr * (activityMultipliers[activity_level] ?? 1.2));
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Validate quickly and return JSON on every path
    if (
      !body ||
      (body.sex !== "male" && body.sex !== "female") ||
      !Number.isFinite(body.age) ||
      !Number.isFinite(body.height_cm) ||
      !Number.isFinite(body.weight_kg) ||
      !body.activity_level
    ) {
      return NextResponse.json(
        { error: "Invalid payload", tdee_kcal: null },
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json", 
            "Cache-Control": "no-store" 
          } 
        }
      );
    }

    const tdee = computeTDEE(body);

    return NextResponse.json(
      { tdee_kcal: tdee },
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json", 
          "Cache-Control": "no-store" 
        } 
      }
    );
  } catch (err) {
    // Bad JSON or unexpected error — still return JSON, never empty
    return NextResponse.json(
      { error: "Bad request", tdee_kcal: null },
      { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}