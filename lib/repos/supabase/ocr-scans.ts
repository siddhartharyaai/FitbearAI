/**
 * Supabase OCR Scans Repository Implementation (Stub for M1)
 * TODO: Implement for M1 migration
 */

import { IOcrScansRepository, OcrScan } from '../types';

export class SupabaseOcrScansRepository implements IOcrScansRepository {
  async create(scan: Omit<OcrScan, 'id' | 'created_at'>): Promise<OcrScan> {
    // TODO: Implement Supabase OCR scans creation for M1
    throw new Error('Supabase OCR scans repository not implemented yet - planned for M1');
  }

  async findByUserId(userId: string): Promise<OcrScan[]> {
    // TODO: Implement Supabase OCR scans lookup for M1
    throw new Error('Supabase OCR scans repository not implemented yet - planned for M1');
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    // TODO: Implement Supabase OCR scans deletion for M1
    throw new Error('Supabase OCR scans repository not implemented yet - planned for M1');
  }
}