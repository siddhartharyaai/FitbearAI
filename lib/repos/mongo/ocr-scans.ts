/**
 * MongoDB OCR Scans Repository Implementation
 */

import { IOcrScansRepository, OcrScan } from '../types';
import { getDatabase } from './connection';

export class MongoOcrScansRepository implements IOcrScansRepository {
  private async getCollection() {
    const db = await getDatabase();
    return db.collection('ocr_scans');
  }

  async create(scan: Omit<OcrScan, 'id' | 'created_at'>): Promise<OcrScan> {
    const collection = await this.getCollection();
    
    const scanWithTimestamps = {
      ...scan,
      ts: scan.ts || new Date(),
      created_at: new Date()
    };

    const result = await collection.insertOne(scanWithTimestamps);
    
    return {
      ...scanWithTimestamps,
      id: result.insertedId.toString()
    };
  }

  async findByUserId(userId: string): Promise<OcrScan[]> {
    const collection = await this.getCollection();
    
    const scans = await collection
      .find({ user_id: userId })
      .sort({ ts: -1 })
      .toArray();
    
    return scans.map(scan => ({
      ...scan,
      id: scan._id?.toString()
    }));
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ user_id: userId });
    return result.deletedCount > 0;
  }
}