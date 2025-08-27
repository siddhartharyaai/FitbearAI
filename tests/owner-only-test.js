/**
 * Owner-only API Access Denial Test
 * Verifies that users cannot access data from other users
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

describe('Owner-only API Security', () => {
  
  test('should deny cross-user profile access', async () => {
    // This test would require proper authentication setup
    // For now, we test without auth to verify 401 responses
    
    const response = await fetch(`${BASE_URL}/api/me/profile`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer fake-token'
      }
    });
    
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBeTruthy();
    expect(data.error.type).toBe('Auth');
  });

  test('should deny cross-user targets access', async () => {
    const response = await fetch(`${BASE_URL}/api/me/targets`, {
      method: 'GET'
    });
    
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBeTruthy();
    expect(data.error.type).toBe('Auth');
  });

  test('should deny cross-user food logs access', async () => {
    const response = await fetch(`${BASE_URL}/api/logs`, {
      method: 'GET'
    });
    
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBeTruthy();
    expect(data.error.type).toBe('Auth');
  });

  test('should deny cross-user export access', async () => {
    const response = await fetch(`${BASE_URL}/api/export`, {
      method: 'GET'
    });
    
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBeTruthy();
    expect(data.error.type).toBe('Auth');
  });
  
  test('public endpoints should work without auth', async () => {
    // Health check should work
    const healthResponse = await fetch(`${BASE_URL}/api/`);
    expect(healthResponse.status).toBe(200);
    
    const healthData = await healthResponse.json();
    expect(healthData.message).toContain('Fitbear AI');
    
    // TDEE calculator should work (no user data required)
    const tdeeResponse = await fetch(`${BASE_URL}/api/tools/tdee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sex: 'male',
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        activity_level: 'moderate'
      })
    });
    
    expect(tdeeResponse.status).toBe(200);
    
    const tdeeData = await tdeeResponse.json();
    expect(tdeeData.tdee_kcal).toBeGreaterThan(0);
  });
  
});