import { NextResponse } from 'next/server';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
    }
    
    const audioBuffer = await req.arrayBuffer();
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json({ error: "No audio data provided" }, { status: 400 });
    }
    
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm'
      },
      body: audioBuffer
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Deepgram API error: ${errorText}` }, { status: response.status });
    }
    
    const result = await response.json();
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    
    if (!transcript) {
      return NextResponse.json({ error: "No speech detected" }, { status: 400 });
    }
    
    return NextResponse.json({
      text: transcript
    });
    
  } catch (error) {
    console.error('STT error:', error);
    return NextResponse.json({ error: "Speech-to-text processing failed" }, { status: 500 });
  }
}