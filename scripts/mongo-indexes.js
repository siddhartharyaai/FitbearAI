/**
 * MongoDB Indexes for Fitbear AI M0
 * Run with: npm run db:indexes
 */

const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'your_database_name';

const INDEXES = [
  // Profiles collection
  {
    collection: 'profiles',
    indexes: [
      { key: { user_id: 1 }, unique: true, name: 'idx_profiles_user_id' },
      { key: { created_at: 1 }, name: 'idx_profiles_created_at' },
      { key: { veg_flag: 1, jain_flag: 1, halal_flag: 1 }, name: 'idx_profiles_dietary_flags' },
      { key: { activity_level: 1 }, name: 'idx_profiles_activity_level' }
    ]
  },
  
  // Daily targets collection
  {
    collection: 'targets',
    indexes: [
      { key: { user_id: 1, date: -1 }, unique: true, name: 'idx_targets_user_date' },
      { key: { user_id: 1 }, name: 'idx_targets_user_id' },
      { key: { date: -1 }, name: 'idx_targets_date' },
      { key: { created_at: 1 }, name: 'idx_targets_created_at' }
    ]
  },
  
  // Food logs collection
  {
    collection: 'food_logs',
    indexes: [
      { key: { user_id: 1, ts: -1 }, name: 'idx_food_logs_user_ts' },
      { key: { user_id: 1 }, name: 'idx_food_logs_user_id' },
      { key: { ts: -1 }, name: 'idx_food_logs_ts' },
      { key: { source_enum: 1 }, name: 'idx_food_logs_source' },
      { key: { food_id: 1 }, name: 'idx_food_logs_food_id' },
      { key: { created_at: 1 }, name: 'idx_food_logs_created_at' }
    ]
  },
  
  // Food items master collection  
  {
    collection: 'food_items',
    indexes: [
      { key: { canonical_name: 1 }, unique: true, name: 'idx_food_items_name' },
      { key: { category_enum: 1 }, name: 'idx_food_items_category' },
      { key: { region_enum: 1 }, name: 'idx_food_items_region' },
      { key: { source_enum: 1 }, name: 'idx_food_items_source' },
      { key: { kcal_per_unit: 1 }, name: 'idx_food_items_kcal' },
      { key: { canonical_name: 'text' }, name: 'idx_food_items_text_search' }
    ]
  },
  
  // OCR scans collection
  {
    collection: 'ocr_scans',
    indexes: [
      { key: { user_id: 1, ts: -1 }, name: 'idx_ocr_scans_user_ts' },
      { key: { user_id: 1 }, name: 'idx_ocr_scans_user_id' },
      { key: { ts: -1 }, name: 'idx_ocr_scans_ts' },
      { key: { language_detected: 1 }, name: 'idx_ocr_scans_language' },
      { key: { source_confidence: 1 }, name: 'idx_ocr_scans_confidence' },
      { key: { created_at: 1 }, name: 'idx_ocr_scans_created_at' }
    ]
  },
  
  // Photo analyses collection
  {
    collection: 'photo_analyses',
    indexes: [
      { key: { user_id: 1, ts: -1 }, name: 'idx_photo_analyses_user_ts' },
      { key: { user_id: 1 }, name: 'idx_photo_analyses_user_id' },
      { key: { ts: -1 }, name: 'idx_photo_analyses_ts' },
      { key: { chosen_food_id: 1 }, name: 'idx_photo_analyses_food_id' },
      { key: { confidence: 1 }, name: 'idx_photo_analyses_confidence' },
      { key: { created_at: 1 }, name: 'idx_photo_analyses_created_at' }
    ]
  },
  
  // Dish synonyms collection (for OCR matching)
  {
    collection: 'dish_synonyms',
    indexes: [
      { key: { food_id: 1 }, name: 'idx_dish_synonyms_food_id' },
      { key: { term: 1 }, name: 'idx_dish_synonyms_term' },
      { key: { lang_enum: 1 }, name: 'idx_dish_synonyms_lang' },
      { key: { weight: -1 }, name: 'idx_dish_synonyms_weight' },
      { key: { term: 'text' }, name: 'idx_dish_synonyms_text_search' }
    ]
  }
];

async function createIndexes() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    for (const { collection, indexes } of INDEXES) {
      console.log(`\n📚 Creating indexes for collection: ${collection}`);
      
      const coll = db.collection(collection);
      
      for (const indexSpec of indexes) {
        try {
          const result = await coll.createIndex(indexSpec.key, {
            name: indexSpec.name,
            unique: indexSpec.unique || false,
            background: true
          });
          console.log(`  ✅ Created index: ${indexSpec.name} -> ${result}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`  ⚠️  Index already exists: ${indexSpec.name}`);
          } else {
            console.error(`  ❌ Failed to create index ${indexSpec.name}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 Index creation completed!');
    
    // Show index statistics
    console.log('\n📊 Index Statistics:');
    for (const { collection } of INDEXES) {
      const coll = db.collection(collection);
      const indexStats = await coll.listIndexes().toArray();
      console.log(`  ${collection}: ${indexStats.length} indexes`);
    }
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  createIndexes().catch(console.error);
}

module.exports = { createIndexes, INDEXES };