import { NextResponse } from 'next/server';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { text, model = "aura-asteria-en" } = await req.json();
    
    if (!text) {
      return new Response(JSON.stringify({ error: "No text" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (!process.env.DEEPGRAM_API_KEY) {
      return new Response(JSON.stringify({ error: "Deepgram API key not configured" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Deepgram API error: ${errorText}` }), { 
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const audio = await response.arrayBuffer();
    return new Response(audio, { 
      headers: { "Content-Type": "audio/mpeg" }
    });
    
  } catch (error) {
    console.error('TTS error:', error);
    return new Response(JSON.stringify({ error: "TTS processing failed" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}