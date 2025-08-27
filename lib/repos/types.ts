/**
 * Repository Layer Types for Fitbear AI
 * Abstracts database operations for easy provider switching
 */

export interface User {
  id: string;
  email?: string;
  created_at?: Date;
}

export interface Profile {
  user_id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  dob?: Date;
  height_cm?: number;
  weight_kg?: number;
  waist_cm?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  veg_flag?: boolean;
  jain_flag?: boolean;
  halal_flag?: boolean;
  eggetarian_flag?: boolean;
  allergies_json?: string[];
  conditions_json?: string[];
  budget_level?: 'low' | 'medium' | 'high';
  cuisines_json?: string[];
  schedule_json?: any;
  pantry_json?: string[];
  locale?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface DailyTarget {
  id?: string;
  user_id: string;
  date: string; // ISO date string
  tdee_kcal: number;
  kcal_budget: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  sugar_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  water_ml?: number;
  steps?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface FoodItem {
  id: string;
  canonical_name: string;
  region_enum?: string;
  category_enum: string;
  unit_default?: string;
  kcal_per_unit: number;
  protein_g?: number;
  carb_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  source_enum?: string;
  ifct_id?: string;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface FoodLog {
  id?: string;
  user_id: string;
  ts?: Date;
  source_enum: 'menu' | 'photo' | 'manual';
  food_id?: string;
  menu_item_id?: string;
  portion_units?: string;
  portion_qty_numeric?: number;
  kcal: number;
  protein_g?: number;
  carb_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  notes?: string;
  assumptions_json?: string[];
  created_at?: Date;
}

export interface OcrScan {
  id?: string;
  user_id: string;
  ts?: Date;
  image_url?: string;
  ocr_text?: string;
  language_detected?: string;
  parsed_json?: any;
  results_json?: any;
  source_confidence?: number;
  created_at?: Date;
}

export interface PhotoAnalysis {
  id?: string;
  user_id: string;
  ts?: Date;
  image_url?: string;
  detections_json?: any[];
  chosen_food_id?: string;
  portion_hint?: string;
  confidence?: number;
  macros_json?: any;
  created_at?: Date;
}

// Repository interfaces
export interface IProfileRepository {
  create(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile>;
  findByUserId(userId: string): Promise<Profile | null>;
  updateByUserId(userId: string, updates: Partial<Profile>): Promise<Profile>;
  deleteByUserId(userId: string): Promise<boolean>;
}

export interface ITargetsRepository {
  create(target: Omit<DailyTarget, 'id' | 'created_at' | 'updated_at'>): Promise<DailyTarget>;
  findByUserIdAndDate(userId: string, date: string): Promise<DailyTarget | null>;
  findByUserId(userId: string, limit?: number): Promise<DailyTarget[]>;
  upsertByUserIdAndDate(userId: string, date: string, target: Partial<DailyTarget>): Promise<DailyTarget>;
  deleteByUserId(userId: string): Promise<boolean>;
}

export interface IFoodLogsRepository {
  create(log: Omit<FoodLog, 'id' | 'created_at'>): Promise<FoodLog>;
  findByUserId(userId: string, from?: Date, to?: Date): Promise<FoodLog[]>;
  deleteByUserId(userId: string): Promise<boolean>;
}

export interface IOcrScansRepository {
  create(scan: Omit<OcrScan, 'id' | 'created_at'>): Promise<OcrScan>;
  findByUserId(userId: string): Promise<OcrScan[]>;
  deleteByUserId(userId: string): Promise<boolean>;
}

export interface IPhotoAnalysesRepository {
  create(analysis: Omit<PhotoAnalysis, 'id' | 'created_at'>): Promise<PhotoAnalysis>;
  findByUserId(userId: string): Promise<PhotoAnalysis[]>;
  deleteByUserId(userId: string): Promise<boolean>;
}

export interface IFoodItemsRepository {
  findByName(name: string): Promise<FoodItem | null>;
  search(query: string, limit?: number): Promise<FoodItem[]>;
  findAll(limit?: number): Promise<FoodItem[]>;
}