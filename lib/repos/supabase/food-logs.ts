/**
 * Supabase Food Logs Repository Implementation (Stub for M1)
 * TODO: Implement for M1 migration
 */

import { IFoodLogsRepository, FoodLog } from '../types';

export class SupabaseFoodLogsRepository implements IFoodLogsRepository {
  async create(log: Omit<FoodLog, 'id' | 'created_at'>): Promise<FoodLog> {
    // TODO: Implement Supabase food logs creation for M1
    throw new Error('Supabase food logs repository not implemented yet - planned for M1');
  }

  async findByUserId(userId: string, from?: Date, to?: Date): Promise<FoodLog[]> {
    // TODO: Implement Supabase food logs lookup for M1
    throw new Error('Supabase food logs repository not implemented yet - planned for M1');
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    // TODO: Implement Supabase food logs deletion for M1
    throw new Error('Supabase food logs repository not implemented yet - planned for M1');
  }
}