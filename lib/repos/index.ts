/**
 * Repository Layer Provider Switch
 */

import { 
  IProfileRepository, 
  ITargetsRepository, 
  IFoodLogsRepository, 
  IOcrScansRepository,
  IPhotoAnalysesRepository,
  IFoodItemsRepository 
} from './types';

// Import implementations
import { MongoProfileRepository } from './mongo/profiles';
import { MongoTargetsRepository } from './mongo/targets';
import { MongoFoodLogsRepository } from './mongo/food-logs';
import { MongoOcrScansRepository } from './mongo/ocr-scans';
import { MongoPhotoAnalysesRepository } from './mongo/photo-analyses';
import { MongoFoodItemsRepository } from './mongo/food-items';

// Supabase stubs (TODO: implement for M1)
import { SupabaseProfileRepository } from './supabase/profiles';
import { SupabaseTargetsRepository } from './supabase/targets';
import { SupabaseFoodLogsRepository } from './supabase/food-logs';
import { SupabaseOcrScansRepository } from './supabase/ocr-scans';
import { SupabasePhotoAnalysesRepository } from './supabase/photo-analyses';
import { SupabaseFoodItemsRepository } from './supabase/food-items';

const DB_PROVIDER = process.env.DB_PROVIDER || 'mongo';

// Repository factory
function createRepositories() {
  if (DB_PROVIDER === 'supabase') {
    return {
      profiles: new SupabaseProfileRepository(),
      targets: new SupabaseTargetsRepository(),
      foodLogs: new SupabaseFoodLogsRepository(),
      ocrScans: new SupabaseOcrScansRepository(),
      photoAnalyses: new SupabasePhotoAnalysesRepository(),
      foodItems: new SupabaseFoodItemsRepository(),
    };
  }
  
  // Default to MongoDB
  return {
    profiles: new MongoProfileRepository(),
    targets: new MongoTargetsRepository(),
    foodLogs: new MongoFoodLogsRepository(),
    ocrScans: new MongoOcrScansRepository(),
    photoAnalyses: new MongoPhotoAnalysesRepository(),
    foodItems: new MongoFoodItemsRepository(),
  };
}

// Export singleton repositories
export const repositories = createRepositories();

export type Repositories = {
  profiles: IProfileRepository;
  targets: ITargetsRepository;
  foodLogs: IFoodLogsRepository;
  ocrScans: IOcrScansRepository;
  photoAnalyses: IPhotoAnalysesRepository;
  foodItems: IFoodItemsRepository;
};