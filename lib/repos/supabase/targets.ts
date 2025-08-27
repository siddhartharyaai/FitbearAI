/**
 * Supabase Targets Repository Implementation (Stub for M1)
 * TODO: Implement for M1 migration
 */

import { ITargetsRepository, DailyTarget } from '../types';

export class SupabaseTargetsRepository implements ITargetsRepository {
  async create(target: Omit<DailyTarget, 'id' | 'created_at' | 'updated_at'>): Promise<DailyTarget> {
    // TODO: Implement Supabase targets creation for M1
    throw new Error('Supabase targets repository not implemented yet - planned for M1');
  }

  async findByUserIdAndDate(userId: string, date: string): Promise<DailyTarget | null> {
    // TODO: Implement Supabase targets lookup by date for M1
    throw new Error('Supabase targets repository not implemented yet - planned for M1');
  }

  async findByUserId(userId: string, limit?: number): Promise<DailyTarget[]> {
    // TODO: Implement Supabase targets lookup for M1
    throw new Error('Supabase targets repository not implemented yet - planned for M1');
  }

  async upsertByUserIdAndDate(userId: string, date: string, target: Partial<DailyTarget>): Promise<DailyTarget> {
    // TODO: Implement Supabase targets upsert for M1
    throw new Error('Supabase targets repository not implemented yet - planned for M1');
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    // TODO: Implement Supabase targets deletion for M1
    throw new Error('Supabase targets repository not implemented yet - planned for M1');
  }
}