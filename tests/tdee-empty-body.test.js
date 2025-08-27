/**
 * Test to ensure TDEE endpoint always returns JSON and never empty body
 * This prevents the "Unexpected end of JSON input" error
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

describe('TDEE endpoint JSON safety', () => {
  test('returns JSON on happy path', async () => {
    const response = await fetch(`${BASE_URL}/api/tools/tdee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sex: 'male',
        age: 30,
        height_cm: 175,
        weight_kg: 70,
        activity_level: 'moderate'
      }),
    });

    expect(response.ok).toBe(true);
    const text = await response.text();
    expect(text).toMatch(/tdee_kcal/);
    
    // Should be valid JSON
    const data = JSON.parse(text);
    expect(typeof data.tdee_kcal).toBe('number');
    expect(data.tdee_kcal).toBeGreaterThan(0);
  });

  test('returns JSON even on bad payload (no empty body)', async () => {
    const response = await fetch(`${BASE_URL}/api/tools/tdee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    // Should return 400 but still JSON
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toMatch(/"tdee_kcal":null/);
    expect(text).toMatch(/"error":/);
    
    // Should be valid JSON even on error
    const data = JSON.parse(text);
    expect(data.error).toBeTruthy();
    expect(data.tdee_kcal).toBeNull();
  });

  test('handles malformed JSON gracefully', async () => {
    const response = await fetch(`${BASE_URL}/api/tools/tdee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    // Should return 400 but still JSON  
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toMatch(/"error":/);
    expect(text).toMatch(/"tdee_kcal":null/);
    
    // Should be valid JSON even on parse error
    const data = JSON.parse(text);
    expect(data.error).toBeTruthy();
  });
});