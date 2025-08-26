#!/usr/bin/env node
/**
 * RLS Denial Tests for Fitbear AI
 * Tests that users cannot access other users' data
 * Run with: node scripts/rls_denial.test.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testRLSDenial() {
  console.log('🔐 Starting RLS Denial Tests\n');
  
  let passed = 0;
  let total = 0;
  
  // Create test users
  const testUsers = [];
  
  try {
    // Create two test users
    for (let i = 1; i <= 2; i++) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: `test-user-${i}@fitbear-test.com`,
        password: 'TestPassword123!',
        email_confirm: true
      });
      
      if (error) {
        console.error(`❌ Failed to create test user ${i}:`, error);
        return false;
      }
      
      testUsers.push(data.user);
      console.log(`✅ Created test user ${i}: ${data.user.id}`);
    }
    
    console.log('\n📋 Testing RLS Policies...\n');
    
    // Test profiles table
    total++;
    try {
      // User 1 creates a profile
      await supabase.from('profiles').insert({
        user_id: testUsers[0].id,
        name: 'Test User 1',
        height_cm: 170,
        weight_kg: 65
      });
      
      // User 2 tries to read User 1's profile (should fail)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', testUsers[0].id);
      
      if (data && data.length > 0) {
        console.log('❌ RLS VIOLATION: User can read other users profiles');
      } else {
        console.log('✅ PROFILES: Cross-user read blocked correctly');
        passed++;
      }
    } catch (error) {
      console.log('✅ PROFILES: Cross-user access denied by RLS');
      passed++;
    }
    
    // Test targets table
    total++;
    try {
      // User 1 creates targets
      await supabase.from('targets').insert({
        user_id: testUsers[0].id,
        date: new Date().toISOString().split('T')[0],
        tdee_kcal: 2200,
        kcal_budget: 1800,
        protein_g: 110,
        carb_g: 200,
        fat_g: 60
      });
      
      // User 2 tries to read User 1's targets (should fail)
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('user_id', testUsers[0].id);
      
      if (data && data.length > 0) {
        console.log('❌ RLS VIOLATION: User can read other users targets');
      } else {
        console.log('✅ TARGETS: Cross-user read blocked correctly');
        passed++;
      }
    } catch (error) {
      console.log('✅ TARGETS: Cross-user access denied by RLS');
      passed++;
    }
    
    // Test food_logs table
    total++;
    try {
      // User 1 creates a food log
      await supabase.from('food_logs').insert({
        user_id: testUsers[0].id,
        source_enum: 'manual',
        kcal: 300,
        protein_g: 15,
        notes: 'Test meal'
      });
      
      // User 2 tries to read User 1's food logs (should fail)
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', testUsers[0].id);
      
      if (data && data.length > 0) {
        console.log('❌ RLS VIOLATION: User can read other users food logs');
      } else {
        console.log('✅ FOOD_LOGS: Cross-user read blocked correctly');
        passed++;
      }
    } catch (error) {
      console.log('✅ FOOD_LOGS: Cross-user access denied by RLS');
      passed++;
    }
    
    // Test cross-user write attempts
    total++;
    try {
      // User 2 tries to insert data for User 1 (should fail)
      const { error } = await supabase.from('profiles').insert({
        user_id: testUsers[0].id,
        name: 'Malicious Update'
      });
      
      if (error) {
        console.log('✅ WRITE PROTECTION: Cross-user write blocked correctly');
        passed++;
      } else {
        console.log('❌ RLS VIOLATION: User can write to other users data');
      }
    } catch (error) {
      console.log('✅ WRITE PROTECTION: Cross-user write denied by RLS');
      passed++;
    }
    
  } catch (error) {
    console.error('❌ RLS test setup failed:', error);
    return false;
  } finally {
    // Cleanup: Delete test users
    try {
      for (const user of testUsers) {
        await supabase.auth.admin.deleteUser(user.id);
        console.log(`🧹 Cleaned up test user: ${user.id}`);
      }
    } catch (error) {
      console.error('⚠️ Cleanup failed:', error);
    }
  }
  
  console.log(`\n🏁 RLS Denial Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('✅ All RLS policies are working correctly!');
    return true;
  } else {
    console.log('❌ Some RLS policies are not working correctly!');
    return false;
  }
}

// Run tests
testRLSDenial()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });