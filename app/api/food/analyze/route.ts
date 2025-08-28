import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assertNoMock } from '@/lib/mode';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      assertNoMock("meal photo analysis: content type must be multipart/form-data");
      return NextResponse.json({ 
        error: "Content-Type must be multipart/form-data" 
      }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("image") as File | null;
    
    if (!file) {
      assertNoMock("meal photo analysis: no image uploaded");
      return NextResponse.json({ error: "No meal image provided" }, { status: 400 });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: "Gemini API key not configured" 
      }, { status: 500 });
    }
    
    // Convert file to base64
    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = Buffer.from(bytes).toString("base64");
    
    console.log('Processing meal photo with Gemini Vision AI...');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are an expert nutrition coach. Analyze this meal photo and identify the food items.

Look carefully at the image and identify specific dishes. If you can see Indian foods like:
- Pani puri/Golgappa, Bhel puri, Chaat items
- Dal (various types), Rice, Roti, Naan
- Sabzi (vegetable curries), Paneer dishes
- South Indian: Dosa, Idli, Vada, Sambar
- Snacks: Samosa, Pakora, Dhokla

Or any other cuisine, identify what you actually see - don't invent dishes.

For each identified food item, estimate:
1. Confidence score (0.1 to 1.0)
2. Portion size hints
3. Basic nutrition estimates

Return JSON format:
{
  "guess": [
    {
      "food_id": "kebab-case-name",
      "name": "Proper Food Name", 
      "confidence": 0.85,
      "portion_hints": "1 plate, 2 pieces, etc."
    }
  ],
  "nutrition": {
    "calories": 350,
    "protein": 15,
    "carbs": 45,
    "fat": 12
  },
  "processing_time": "< 2s"
}

If you're unsure about specific items, ask ONE clarifying question. Only identify what you can actually see in the image.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType: file.type || "image/jpeg"
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // Parse Gemini response as JSON
    try {
      const parsedResponse = JSON.parse(text);
      return NextResponse.json(parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse Gemini Vision response as JSON:', parseError);
      console.log('Raw response:', text);
      
      assertNoMock("meal photo analysis: failed to parse AI response");
      
      // Return structured fallback
      return NextResponse.json({
        guess: [
          {
            food_id: "unknown-meal",
            name: "Unidentified Food Item",
            confidence: 0.3,
            portion_hints: "Unable to determine portion"
          }
        ],
        nutrition: {
          calories: 250,
          protein: 8,
          carbs: 30,
          fat: 10
        },
        processing_time: "< 2s",
        raw_ai_response: text,
        note: "Gemini response parsing failed"
      });
    }
    
  } catch (error) {
    console.error('Photo analysis error:', error);
    
    if (error.message.includes('Mock path blocked')) {
      throw error; // Re-throw production guard errors
    }
    
    return NextResponse.json({ 
      error: "Meal photo analysis failed",
      details: (error as Error).message 
    }, { status: 500 });
  }
}