// Test script to reproduce the JSON parsing error in FullBPSOnboarding
const testTDEEAPI = async () => {
  console.log('Testing TDEE API call...');
  
  const tdeeRequestData = {
    sex: 'male',
    age: 30,
    height_cm: 175,
    weight_kg: 70.5,
    activity_level: 'moderate'
  };
  
  try {
    console.log('Making request to /api/tools/tdee with data:', tdeeRequestData);
    
    const response = await fetch('/api/tools/tdee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tdeeRequestData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Get response as text first to avoid consumption issues
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    if (!response.ok) {
      console.error('TDEE API Error:', responseText);
      throw new Error(`TDEE calculation failed: ${response.status} ${response.statusText} - ${responseText}`);
    }
    
    // Check if response is empty or invalid
    if (!responseText || responseText.trim() === '') {
      throw new Error('TDEE API returned empty response');
    }
    
    let tdeeData;
    try {
      tdeeData = JSON.parse(responseText);
      console.log('TDEE Parsed data:', tdeeData);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response text was:', responseText);
      throw new Error(`Failed to parse TDEE response as JSON: ${parseError.message}. Response was: ${responseText}`);
    }
    
    // Validate the parsed data
    if (!tdeeData || typeof tdeeData.tdee_kcal !== 'number' || isNaN(tdeeData.tdee_kcal)) {
      throw new Error(`Invalid TDEE response format or NaN result: ${JSON.stringify(tdeeData)}`);
    }
    
    console.log('✅ TDEE API test successful:', tdeeData);
    return tdeeData;
    
  } catch (error) {
    console.error('❌ TDEE API test failed:', error.message);
    throw error;
  }
};

// Test with different scenarios
const testScenarios = [
  {
    name: 'Valid male data',
    data: { sex: 'male', age: 30, height_cm: 175, weight_kg: 70.5, activity_level: 'moderate' }
  },
  {
    name: 'Valid female data',
    data: { sex: 'female', age: 25, height_cm: 160, weight_kg: 55, activity_level: 'light' }
  },
  {
    name: 'Edge case - young age',
    data: { sex: 'male', age: 18, height_cm: 170, weight_kg: 60, activity_level: 'sedentary' }
  },
  {
    name: 'Edge case - older age',
    data: { sex: 'female', age: 65, height_cm: 155, weight_kg: 70, activity_level: 'active' }
  }
];

// Run tests
const runTests = async () => {
  console.log('🧪 Starting TDEE API tests...');
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    try {
      const result = await testTDEEAPI(scenario.data);
      console.log(`✅ ${scenario.name}: PASSED - TDEE: ${result.tdee_kcal} kcal`);
    } catch (error) {
      console.log(`❌ ${scenario.name}: FAILED - ${error.message}`);
    }
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testTDEEAPI = testTDEEAPI;
  window.runTests = runTests;
  console.log('TDEE test functions loaded. Run window.runTests() to start testing.');
}

module.exports = { testTDEEAPI, runTests };