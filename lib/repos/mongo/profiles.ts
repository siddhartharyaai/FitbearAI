/**
 * MongoDB Profile Repository Implementation
 */

import { MongoClient } from 'mongodb';
import { IProfileRepository, Profile } from '../types';
import { getDatabase } from './connection';

export class MongoProfileRepository implements IProfileRepository {
  private async getCollection() {
    const db = await getDatabase();
    return db.collection('profiles');
  }

  async create(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
    const collection = await this.getCollection();
    
    const profileWithTimestamps = {
      ...profile,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await collection.insertOne(profileWithTimestamps);
    
    return {
      ...profileWithTimestamps,
      id: result.insertedId.toString()
    };
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const collection = await this.getCollection();
    const profile = await collection.findOne({ user_id: userId });
    
    return profile ? {
      ...profile,
      id: profile._id?.toString()
    } : null;
  }

  async updateByUserId(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const collection = await this.getCollection();
    
    const updateDoc = {
      ...updates,
      updated_at: new Date()
    };

    const result = await collection.findOneAndUpdate(
      { user_id: userId },
      { $set: updateDoc },
      { returnDocument: 'after', upsert: true }
    );

    if (!result.value) {
      throw new Error('Failed to update profile');
    }

    return {
      ...result.value,
      id: result.value._id?.toString()
    };
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ user_id: userId });
    return result.deletedCount > 0;
  }
}