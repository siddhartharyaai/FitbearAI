/**
 * Supabase Food Items Repository Implementation (Stub for M1)
 * TODO: Implement for M1 migration
 */

import { IFoodItemsRepository, FoodItem } from '../types';

export class SupabaseFoodItemsRepository implements IFoodItemsRepository {
  async findByName(name: string): Promise<FoodItem | null> {
    // TODO: Implement Supabase food items lookup by name for M1
    throw new Error('Supabase food items repository not implemented yet - planned for M1');
  }

  async search(query: string, limit?: number): Promise<FoodItem[]> {
    // TODO: Implement Supabase food items search for M1
    throw new Error('Supabase food items repository not implemented yet - planned for M1');
  }

  async findAll(limit?: number): Promise<FoodItem[]> {
    // TODO: Implement Supabase food items findAll for M1
    throw new Error('Supabase food items repository not implemented yet - planned for M1');
  }
}