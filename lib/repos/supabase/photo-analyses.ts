/**
 * Supabase Photo Analyses Repository Implementation (Stub for M1)
 * TODO: Implement for M1 migration
 */

import { IPhotoAnalysesRepository, PhotoAnalysis } from '../types';

export class SupabasePhotoAnalysesRepository implements IPhotoAnalysesRepository {
  async create(analysis: Omit<PhotoAnalysis, 'id' | 'created_at'>): Promise<PhotoAnalysis> {
    // TODO: Implement Supabase photo analyses creation for M1
    throw new Error('Supabase photo analyses repository not implemented yet - planned for M1');
  }

  async findByUserId(userId: string): Promise<PhotoAnalysis[]> {
    // TODO: Implement Supabase photo analyses lookup for M1
    throw new Error('Supabase photo analyses repository not implemented yet - planned for M1');
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    // TODO: Implement Supabase photo analyses deletion for M1
    throw new Error('Supabase photo analyses repository not implemented yet - planned for M1');
  }
}