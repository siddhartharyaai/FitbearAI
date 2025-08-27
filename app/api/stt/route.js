import { NextResponse } from 'next/server';

// Force Node.js runtime for API calls
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const audioData = await request.arrayBuffer();
    
    if (!audioData || audioData.byteLength === 0) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }
    
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 });
    }
    
    const response = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2-general&punctuate=true&language=en', {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/webm',
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`
      },
      body: audioData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram STT error:', errorText);
      return NextResponse.json({ error: 'STT service failed' }, { status: response.status });
    }
    
    const result = await response.json();
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    
    if (!transcript.trim()) {
      return NextResponse.json({ error: 'No speech detected' }, { status: 400 });
    }
    
    return NextResponse.json({ 
      transcript: transcript.trim(),
      confidence: result?.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 0
    });
    
  } catch (error) {
    console.error('STT endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}