/**
 * MongoDB Photo Analyses Repository Implementation
 */

import { IPhotoAnalysesRepository, PhotoAnalysis } from '../types';
import { getDatabase } from './connection';

export class MongoPhotoAnalysesRepository implements IPhotoAnalysesRepository {
  private async getCollection() {
    const db = await getDatabase();
    return db.collection('photo_analyses');
  }

  async create(analysis: Omit<PhotoAnalysis, 'id' | 'created_at'>): Promise<PhotoAnalysis> {
    const collection = await this.getCollection();
    
    const analysisWithTimestamps = {
      ...analysis,
      ts: analysis.ts || new Date(),
      created_at: new Date()
    };

    const result = await collection.insertOne(analysisWithTimestamps);
    
    return {
      ...analysisWithTimestamps,
      id: result.insertedId.toString()
    };
  }

  async findByUserId(userId: string): Promise<PhotoAnalysis[]> {
    const collection = await this.getCollection();
    
    const analyses = await collection
      .find({ user_id: userId })
      .sort({ ts: -1 })
      .toArray();
    
    return analyses.map(analysis => ({
      ...analysis,
      id: analysis._id?.toString()
    }));
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ user_id: userId });
    return result.deletedCount > 0;
  }
}