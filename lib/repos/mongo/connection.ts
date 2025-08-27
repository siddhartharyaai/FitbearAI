/**
 * MongoDB Connection Singleton
 */

import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let database: Db | null = null;

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'your_database_name';

export async function getDatabase(): Promise<Db> {
  if (!database) {
    if (!client) {
      client = new MongoClient(MONGO_URL);
      await client.connect();
    }
    database = client.db(DB_NAME);
  }
  
  return database;
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    database = null;
  }
}