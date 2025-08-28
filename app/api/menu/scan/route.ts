import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assertNoMock } from '@/lib/mode';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("image") as File | null;
    
    if (!file) {
      assertNoMock("menu scan: no image uploaded");
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }
    
    // Convert file to base64
    const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
    const base64 = buffer.toString("base64");
    
    console.log('Processing menu image with Gemini Vision OCR...');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are an expert Indian nutrition coach. Analyze this restaurant menu image and provide food recommendations.

Extract all food items with their prices. For each item, categorize as:
- "recommended": High protein, balanced nutrition, fits Indian healthy eating
- "alternate": Moderate choice, acceptable with portion control  
- "avoid": High calorie, processed, or nutritionally poor

Return JSON format:
{
  "ocr_method": "gemini_vision",
  "text": "extracted menu text",
  "recommendations": [
    {
      "name": "Food Item Name",
      "price": "₹XX or extracted price",
      "category": "recommended|alternate|avoid",
      "reason": "Brief nutrition reasoning"
    }
  ]
}`;

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
      return NextResponse.json({
        ...parsedResponse,
        processing_time: "< 2s",
        confidence: 0.9
      });
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.log('Raw Gemini response:', text);
      
      assertNoMock("menu scan: failed to parse AI response");
      
      // Return structured response even if JSON parsing fails
      return NextResponse.json({
        ocr_method: "gemini_vision",
        text: text,
        recommendations: [
          {
            name: "Unable to parse menu items",
            price: "N/A",
            category: "alternate", 
            reason: "Gemini response parsing failed"
          }
        ],
        processing_time: "< 2s",
        confidence: 0.5,
        raw_ai_response: text
      });
    }
    
  } catch (error) {
    console.error('Menu scan error:', error);
    
    assertNoMock("menu scan: processing error");
    
    return NextResponse.json({ 
      error: "Menu scanning failed",
      details: (error as Error).message 
    }, { status: 500 });
  }
}