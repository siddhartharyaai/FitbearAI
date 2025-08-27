/**
 * MongoDB Food Items Repository Implementation
 */

import { IFoodItemsRepository, FoodItem } from '../types';
import { getDatabase } from './connection';

export class MongoFoodItemsRepository implements IFoodItemsRepository {
  private async getCollection() {
    const db = await getDatabase();
    return db.collection('food_items');
  }

  async findByName(name: string): Promise<FoodItem | null> {
    const collection = await this.getCollection();
    const item = await collection.findOne({ canonical_name: name });
    
    return item ? {
      ...item,
      id: item._id?.toString()
    } : null;
  }

  async search(query: string, limit: number = 20): Promise<FoodItem[]> {
    const collection = await this.getCollection();
    
    const items = await collection
      .find({
        $or: [
          { canonical_name: { $regex: query, $options: 'i' } },
          { $text: { $search: query } }
        ]
      })
      .limit(limit)
      .toArray();
    
    return items.map(item => ({
      ...item,
      id: item._id?.toString()
    }));
  }

  async findAll(limit: number = 100): Promise<FoodItem[]> {
    const collection = await this.getCollection();
    
    const items = await collection
      .find({})
      .limit(limit)
      .toArray();
    
    return items.map(item => ({
      ...item,
      id: item._id?.toString()
    }));
  }
}