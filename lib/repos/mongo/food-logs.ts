/**
 * MongoDB Food Logs Repository Implementation
 */

import { IFoodLogsRepository, FoodLog } from '../types';
import { getDatabase } from './connection';

export class MongoFoodLogsRepository implements IFoodLogsRepository {
  private async getCollection() {
    const db = await getDatabase();
    return db.collection('food_logs');
  }

  async create(log: Omit<FoodLog, 'id' | 'created_at'>): Promise<FoodLog> {
    const collection = await this.getCollection();
    
    const logWithTimestamps = {
      ...log,
      ts: log.ts || new Date(),
      created_at: new Date()
    };

    const result = await collection.insertOne(logWithTimestamps);
    
    return {
      ...logWithTimestamps,
      id: result.insertedId.toString()
    };
  }

  async findByUserId(userId: string, from?: Date, to?: Date): Promise<FoodLog[]> {
    const collection = await this.getCollection();
    
    const query: any = { user_id: userId };
    
    if (from || to) {
      query.ts = {};
      if (from) query.ts.$gte = from;
      if (to) query.ts.$lte = to;
    }
    
    const logs = await collection
      .find(query)
      .sort({ ts: -1 })
      .toArray();
    
    return logs.map(log => ({
      ...log,
      id: log._id?.toString()
    }));
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ user_id: userId });
    return result.deletedCount > 0;
  }
}