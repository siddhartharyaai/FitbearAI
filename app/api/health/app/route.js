import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Force Node.js runtime 
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || process.env.MONGODB_DB || 'your_database_name';

export async function GET() {
  try {
    // Test database connection
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Simple ping to verify connection
    await db.admin().ping();
    await client.close();
    
    return NextResponse.json({
      ok: true,
      db: "ok",
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        db_provider: process.env.DB_PROVIDER,
        runtime: 'nodejs'
      }
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      ok: false,
      db: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}