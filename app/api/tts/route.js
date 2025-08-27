import { NextResponse } from 'next/server';

// Force Node.js runtime for API calls
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { text, model = 'aura-2-hermes-en' } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 });
    }
    
    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram TTS error:', errorText);
      return NextResponse.json({ error: 'TTS service failed' }, { status: response.status });
    }
    
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
    
  } catch (error) {
    console.error('TTS endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}