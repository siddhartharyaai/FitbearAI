-- Fitbear AI Database Schema - Production Migrations
-- Migration 001: Initial Schema with RLS
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create custom types
CREATE TYPE activity_level_enum AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE region_enum AS ENUM ('north_indian', 'south_indian', 'western', 'eastern', 'fusion', 'international');
CREATE TYPE category_enum AS ENUM ('dal', 'paneer', 'chicken', 'mutton', 'fish', 'rice', 'bread', 'snack', 'dessert', 'beverage', 'south_indian', 'complete_meal');
CREATE TYPE lang_enum AS ENUM ('en', 'hi', 'ta', 'te', 'ka', 'ml', 'bn', 'gu', 'mr', 'pa');
CREATE TYPE script_enum AS ENUM ('latin', 'devanagari', 'tamil', 'telugu', 'kannada', 'malayalam', 'bengali', 'gujarati');
CREATE TYPE source_enum AS ENUM ('menu', 'photo', 'manual');
CREATE TYPE nudge_type_enum AS ENUM ('daily_reminder', 'water_reminder', 'meal_suggestion', 'achievement');

-- Migration 002: Core Tables
-- Profiles table
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    dob DATE,
    height_cm INTEGER CHECK (height_cm > 0 AND height_cm < 300),
    weight_kg NUMERIC(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
    waist_cm INTEGER CHECK (waist_cm > 0 AND waist_cm < 200),
    activity_level activity_level_enum DEFAULT 'moderate',
    veg_flag BOOLEAN DEFAULT FALSE,
    jain_flag BOOLEAN DEFAULT FALSE,
    halal_flag BOOLEAN DEFAULT FALSE,
    eggetarian_flag BOOLEAN DEFAULT FALSE,
    allergies_json JSONB DEFAULT '[]'::jsonb,
    conditions_json JSONB DEFAULT '[]'::jsonb,
    budget_level TEXT CHECK (budget_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
    cuisines_json JSONB DEFAULT '[]'::jsonb,
    schedule_json JSONB DEFAULT '{}'::jsonb,
    pantry_json JSONB DEFAULT '[]'::jsonb,
    locale lang_enum DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily targets table
CREATE TABLE targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tdee_kcal INTEGER NOT NULL CHECK (tdee_kcal > 0),
    kcal_budget INTEGER NOT NULL CHECK (kcal_budget > 0),
    protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
    carb_g INTEGER NOT NULL CHECK (carb_g >= 0),
    fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
    sugar_g INTEGER DEFAULT 0 CHECK (sugar_g >= 0),
    fiber_g INTEGER DEFAULT 0 CHECK (fiber_g >= 0),
    sodium_mg INTEGER DEFAULT 0 CHECK (sodium_mg >= 0),
    water_ml INTEGER DEFAULT 2000 CHECK (water_ml >= 0),
    steps INTEGER DEFAULT 8000 CHECK (steps >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Food items master table
CREATE TABLE food_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    canonical_name TEXT NOT NULL UNIQUE,
    region_enum region_enum DEFAULT 'north_indian',
    category_enum category_enum NOT NULL,
    unit_default TEXT DEFAULT 'serving',
    kcal_per_unit NUMERIC(6,2) NOT NULL CHECK (kcal_per_unit >= 0),
    protein_g NUMERIC(6,2) DEFAULT 0 CHECK (protein_g >= 0),
    carb_g NUMERIC(6,2) DEFAULT 0 CHECK (carb_g >= 0),
    fat_g NUMERIC(6,2) DEFAULT 0 CHECK (fat_g >= 0),
    fiber_g NUMERIC(6,2) DEFAULT 0 CHECK (fiber_g >= 0),
    sodium_mg NUMERIC(6,2) DEFAULT 0 CHECK (sodium_mg >= 0),
    source_enum TEXT CHECK (source_enum IN ('ifct', 'usda', 'manual', 'calculated')) DEFAULT 'manual',
    ifct_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dish synonyms for OCR matching
CREATE TABLE dish_synonyms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    food_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    lang_enum lang_enum DEFAULT 'en',
    script_enum script_enum DEFAULT 'latin',
    weight INTEGER DEFAULT 100 CHECK (weight > 0 AND weight <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items from restaurants
CREATE TABLE menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID, -- Future: link to restaurants table
    display_name TEXT NOT NULL,
    ocr_regex TEXT,
    canonical_food_id UUID REFERENCES food_items(id),
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Food logs
CREATE TABLE food_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    ts TIMESTAMPTZ DEFAULT NOW(),
    source_enum source_enum NOT NULL,
    food_id UUID REFERENCES food_items(id),
    menu_item_id UUID REFERENCES menu_items(id),
    portion_units TEXT DEFAULT 'serving',
    portion_qty_numeric NUMERIC(6,2) DEFAULT 1 CHECK (portion_qty_numeric > 0),
    kcal NUMERIC(6,2) NOT NULL CHECK (kcal >= 0),
    protein_g NUMERIC(6,2) DEFAULT 0 CHECK (protein_g >= 0),
    carb_g NUMERIC(6,2) DEFAULT 0 CHECK (carb_g >= 0),
    fat_g NUMERIC(6,2) DEFAULT 0 CHECK (fat_g >= 0),
    fiber_g NUMERIC(6,2) DEFAULT 0 CHECK (fiber_g >= 0),
    sodium_mg NUMERIC(6,2) DEFAULT 0 CHECK (sodium_mg >= 0),
    notes TEXT,
    assumptions_json JSONB DEFAULT '[]'::jsonb,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (food_id IS NOT NULL OR menu_item_id IS NOT NULL)
);

-- OCR scans
CREATE TABLE ocr_scans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    ts TIMESTAMPTZ DEFAULT NOW(),
    image_url TEXT,
    ocr_text TEXT,
    language_detected lang_enum DEFAULT 'en',
    parsed_json JSONB DEFAULT '{}'::jsonb,
    results_json JSONB DEFAULT '{}'::jsonb,
    source_confidence NUMERIC(3,2) CHECK (source_confidence >= 0 AND source_confidence <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo analyses (meal photos)
CREATE TABLE photo_analyses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    ts TIMESTAMPTZ DEFAULT NOW(),
    image_url TEXT,
    detections_json JSONB DEFAULT '[]'::jsonb,
    chosen_food_id UUID REFERENCES food_items(id),
    portion_hint TEXT,
    confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    macros_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nudges/notifications
CREATE TABLE nudges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    ts TIMESTAMPTZ DEFAULT NOW(),
    type_enum nudge_type_enum NOT NULL,
    payload_json JSONB DEFAULT '{}'::jsonb,
    delivered_bool BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 003: Indexes for Performance
CREATE INDEX idx_targets_user_date ON targets(user_id, date DESC);
CREATE INDEX idx_food_logs_user_ts ON food_logs(user_id, ts DESC);
CREATE INDEX idx_food_logs_idempotency ON food_logs(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_dish_synonyms_term_gin ON dish_synonyms USING gin(term gin_trgm_ops);
CREATE INDEX idx_food_items_name_gin ON food_items USING gin(canonical_name gin_trgm_ops);
CREATE INDEX idx_ocr_scans_user_ts ON ocr_scans(user_id, ts DESC);
CREATE INDEX idx_photo_analyses_user_ts ON photo_analyses(user_id, ts DESC);

-- Migration 004: Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

-- Profiles policies (Owner-only access)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Targets policies (Owner-only access)
CREATE POLICY "Users can view own targets" ON targets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own targets" ON targets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own targets" ON targets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own targets" ON targets
    FOR DELETE USING (auth.uid() = user_id);

-- Food logs policies (Owner-only access)
CREATE POLICY "Users can view own food logs" ON food_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs" ON food_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs" ON food_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs" ON food_logs
    FOR DELETE USING (auth.uid() = user_id);

-- OCR scans policies (Owner-only access)
CREATE POLICY "Users can view own ocr scans" ON ocr_scans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ocr scans" ON ocr_scans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Photo analyses policies (Owner-only access)
CREATE POLICY "Users can view own photo analyses" ON photo_analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photo analyses" ON photo_analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Nudges policies (Owner-only access)
CREATE POLICY "Users can view own nudges" ON nudges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nudges" ON nudges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Food items and synonyms are public (read-only for users)
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Food items are viewable by everyone" ON food_items FOR SELECT USING (true);
CREATE POLICY "Dish synonyms are viewable by everyone" ON dish_synonyms FOR SELECT USING (true);
CREATE POLICY "Menu items are viewable by everyone" ON menu_items FOR SELECT USING (true);

-- Migration 005: Seed Indian Food Data
INSERT INTO food_items (canonical_name, category_enum, kcal_per_unit, protein_g, carb_g, fat_g, fiber_g, sodium_mg) VALUES
('Dal Tadka', 'dal', 180, 9, 20, 8, 8, 400),
('Paneer Tikka', 'paneer', 250, 15, 8, 18, 2, 600),
('Chicken Tikka', 'chicken', 220, 25, 3, 12, 1, 800),
('Butter Chicken', 'chicken', 350, 20, 10, 25, 2, 900),
('Vegetable Biryani', 'rice', 450, 12, 65, 15, 3, 1200),
('Roti', 'bread', 120, 4, 22, 2, 2, 200),
('Naan', 'bread', 200, 6, 35, 4, 2, 400),
('Plain Rice', 'rice', 200, 4, 44, 1, 1, 10),
('Idli', 'south_indian', 80, 3, 15, 1, 1, 150),
('Masala Dosa', 'south_indian', 200, 6, 35, 5, 3, 400),
('Samosa', 'snack', 250, 4, 30, 12, 3, 500),
('Chole', 'dal', 220, 12, 35, 5, 10, 600),
('Rajma', 'dal', 200, 10, 30, 3, 8, 500),
('Palak Paneer', 'paneer', 180, 12, 8, 12, 4, 700),
('Upma', 'south_indian', 160, 4, 28, 4, 3, 350),
('Poha', 'snack', 140, 3, 25, 3, 2, 300),
('Aloo Paratha', 'bread', 250, 6, 40, 8, 3, 500),
('Vegetable Thali', 'complete_meal', 600, 20, 80, 18, 12, 1500) ON CONFLICT (canonical_name) DO NOTHING;

-- Add dish synonyms for better OCR matching
INSERT INTO dish_synonyms (food_id, term, lang_enum, weight) VALUES
((SELECT id FROM food_items WHERE canonical_name = 'Dal Tadka'), 'dal tadka', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Dal Tadka'), 'toor dal', 'en', 80),
((SELECT id FROM food_items WHERE canonical_name = 'Dal Tadka'), 'tadka dal', 'en', 90),
((SELECT id FROM food_items WHERE canonical_name = 'Paneer Tikka'), 'paneer tikka', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Paneer Tikka'), 'paneer kebab', 'en', 85),
((SELECT id FROM food_items WHERE canonical_name = 'Chicken Tikka'), 'chicken tikka', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Chicken Tikka'), 'tikka chicken', 'en', 90),
((SELECT id FROM food_items WHERE canonical_name = 'Butter Chicken'), 'butter chicken', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Butter Chicken'), 'murgh makhani', 'en', 95),
((SELECT id FROM food_items WHERE canonical_name = 'Vegetable Biryani'), 'veg biryani', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Vegetable Biryani'), 'vegetable biryani', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Vegetable Biryani'), 'biryani', 'en', 80),
((SELECT id FROM food_items WHERE canonical_name = 'Roti'), 'roti', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Roti'), 'chapati', 'en', 95),
((SELECT id FROM food_items WHERE canonical_name = 'Naan'), 'naan', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Naan'), 'nan', 'en', 90),
((SELECT id FROM food_items WHERE canonical_name = 'Idli'), 'idli', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Idli'), 'idly', 'en', 95),
((SELECT id FROM food_items WHERE canonical_name = 'Masala Dosa'), 'masala dosa', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Masala Dosa'), 'dosa', 'en', 80),
((SELECT id FROM food_items WHERE canonical_name = 'Samosa'), 'samosa', 'en', 100),
((SELECT id FROM food_items WHERE canonical_name = 'Samosa'), 'samosas', 'en', 95) ON CONFLICT DO NOTHING;

-- Migration 006: Utility Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON food_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();