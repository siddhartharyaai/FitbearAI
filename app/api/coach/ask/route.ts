import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireUser } from '@/lib/auth';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // Require authentication for coach interactions
    const user = await requireUser();
    
    const { message, user_id, profile, recent_logs } = await req.json();
    
    if (!message || !message.trim()) {
      return NextResponse.json({ 
        error: "No message provided" 
      }, { status: 400 });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: "Gemini API key not configured" 
      }, { status: 500 });
    }
    
    console.log('Processing coach question with Gemini 2.5 Flash...');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Build context from profile and recent logs
    let contextInfo = "";
    if (profile) {
      contextInfo += `User Profile: ${JSON.stringify(profile)}\n`;
    }
    if (recent_logs && recent_logs.length > 0) {
      contextInfo += `Recent Food Logs: ${JSON.stringify(recent_logs)}\n`;
    }
    
    const prompt = `You are Coach C, an empathetic, science-first nutrition coach specializing in Indian diets and mixed dietary preferences. You help users with personalized nutrition advice.

${contextInfo ? `Context:\n${contextInfo}\n` : ''}

User Question: ${message}

Instructions:
- Be warm, encouraging, and conversational
- Provide science-based nutrition advice
- Consider Indian foods, portions, and eating habits
- If relevant to the user's profile/logs, reference their data
- Keep responses concise but helpful (2-3 paragraphs max)
- Use simple language, avoid jargon
- Include practical, actionable tips

Respond as Coach C would - supportive and knowledgeable about nutrition.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();
    
    return NextResponse.json({
      reply: reply,
      coach: "Coach C",
      timestamp: new Date().toISOString(),
      citations: [] // Could add nutrition citations in future
    });
    
  } catch (error) {
    console.error('Coach chat error:', error);
    
    if (error.message === 'unauthorized') {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: "Coach chat failed",
      details: (error as Error).message 
    }, { status: 500 });
  }
}