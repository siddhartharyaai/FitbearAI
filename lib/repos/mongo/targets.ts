/**
 * MongoDB Targets Repository Implementation
 */

import { ITargetsRepository, DailyTarget } from '../types';
import { getDatabase } from './connection';

export class MongoTargetsRepository implements ITargetsRepository {
  private async getCollection() {
    const db = await getDatabase();
    return db.collection('targets');
  }

  async create(target: Omit<DailyTarget, 'id' | 'created_at' | 'updated_at'>): Promise<DailyTarget> {
    const collection = await this.getCollection();
    
    const targetWithTimestamps = {
      ...target,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await collection.insertOne(targetWithTimestamps);
    
    return {
      ...targetWithTimestamps,
      id: result.insertedId.toString()
    };
  }

  async findByUserIdAndDate(userId: string, date: string): Promise<DailyTarget | null> {
    const collection = await this.getCollection();
    const target = await collection.findOne({ user_id: userId, date });
    
    return target ? {
      ...target,
      id: target._id?.toString()
    } : null;
  }

  async findByUserId(userId: string, limit: number = 30): Promise<DailyTarget[]> {
    const collection = await this.getCollection();
    const targets = await collection
      .find({ user_id: userId })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
    
    return targets.map(target => ({
      ...target,
      id: target._id?.toString()
    }));
  }

  async upsertByUserIdAndDate(userId: string, date: string, target: Partial<DailyTarget>): Promise<DailyTarget> {
    const collection = await this.getCollection();
    
    const updateDoc = {
      ...target,
      user_id: userId,
      date,
      updated_at: new Date()
    };

    const result = await collection.findOneAndUpdate(
      { user_id: userId, date },
      { 
        $set: updateDoc,
        $setOnInsert: { created_at: new Date() }
      },
      { returnDocument: 'after', upsert: true }
    );

    if (!result.value) {
      throw new Error('Failed to upsert target');
    }

    return {
      ...result.value,
      id: result.value._id?.toString()
    };
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ user_id: userId });
    return result.deletedCount > 0;
  }
}