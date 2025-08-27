/**
 * Supabase Profile Repository Implementation (Stub for M1)
 * TODO: Implement for M1 migration
 */

import { IProfileRepository, Profile } from '../types';

export class SupabaseProfileRepository implements IProfileRepository {
  async create(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
    // TODO: Implement Supabase profile creation for M1
    throw new Error('Supabase profile repository not implemented yet - planned for M1');
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    // TODO: Implement Supabase profile lookup for M1
    throw new Error('Supabase profile repository not implemented yet - planned for M1');
  }

  async updateByUserId(userId: string, updates: Partial<Profile>): Promise<Profile> {
    // TODO: Implement Supabase profile update for M1
    throw new Error('Supabase profile repository not implemented yet - planned for M1');
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    // TODO: Implement Supabase profile deletion for M1
    throw new Error('Supabase profile repository not implemented yet - planned for M1');
  }
}