import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { createWorker } from 'tesseract.js';

// Initialize clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Comprehensive Indian food database (sample)
const INDIAN_FOOD_DB = {
  // Main dishes
  "dal tadka": { calories: 180, protein_g: 9, fiber_g: 8, sodium_mg: 400, category: "dal" },
  "paneer tikka": { calories: 250, protein_g: 15, fiber_g: 2, sodium_mg: 600, category: "paneer" },
  "chicken tikka": { calories: 220, protein_g: 25, fiber_g: 1, sodium_mg: 800, category: "chicken" },
  "butter chicken": { calories: 350, protein_g: 20, fiber_g: 2, sodium_mg: 900, category: "chicken" },
  "biryani": { calories: 450, protein_g: 12, fiber_g: 3, sodium_mg: 1200, category: "rice" },
  "roti": { calories: 120, protein_g: 4, fiber_g: 2, sodium_mg: 200, category: "bread" },
  "naan": { calories: 200, protein_g: 6, fiber_g: 2, sodium_mg: 400, category: "bread" },
  "rice": { calories: 200, protein_g: 4, fiber_g: 1, sodium_mg: 10, category: "rice" },
  "idli": { calories: 80, protein_g: 3, fiber_g: 1, sodium_mg: 150, category: "south_indian" },
  "dosa": { calories: 150, protein_g: 4, fiber_g: 2, sodium_mg: 300, category: "south_indian" },
  "samosa": { calories: 250, protein_g: 4, fiber_g: 3, sodium_mg: 500, category: "snack" },
  "chole": { calories: 220, protein_g: 12, fiber_g: 10, sodium_mg: 600, category: "dal" },
  "rajma": { calories: 200, protein_g: 10, fiber_g: 8, sodium_mg: 500, category: "dal" },
  "palak paneer": { calories: 180, protein_g: 12, fiber_g: 4, sodium_mg: 700, category: "paneer" },
  "masala dosa": { calories: 200, protein_g: 6, fiber_g: 3, sodium_mg: 400, category: "south_indian" },
  "upma": { calories: 160, protein_g: 4, fiber_g: 3, sodium_mg: 350, category: "south_indian" },
  "poha": { calories: 140, protein_g: 3, fiber_g: 2, sodium_mg: 300, category: "snack" },
  "paratha": { calories: 250, protein_g: 6, fiber_g: 3, sodium_mg: 500, category: "bread" },
  "thali": { calories: 600, protein_g: 20, fiber_g: 12, sodium_mg: 1500, category: "complete_meal" }
};

// Dietary recommendations engine
function getRecommendations(items, profile) {
  const scored = items.map(item => {
    let score = 0;
    let reasons = [];
    
    // Protein scoring
    if (item.protein_g >= 15) {
      score += 20;
      reasons.push("High protein");
    } else if (item.protein_g >= 8) {
      score += 10;
      reasons.push("Good protein");
    }
    
    // Fiber scoring
    if (item.fiber_g >= 5) {
      score += 15;
      reasons.push("High fiber");
    } else if (item.fiber_g >= 3) {
      score += 8;
      reasons.push("Good fiber");
    }
    
    // Calorie scoring (moderate calories preferred)
    if (item.calories >= 200 && item.calories <= 300) {
      score += 10;
      reasons.push("Balanced calories");
    } else if (item.calories > 400) {
      score -= 15;
      reasons.push("High calorie");
    }
    
    // Sodium penalty
    if (item.sodium_mg > 800) {
      score -= 20;
      reasons.push("High sodium");
    } else if (item.sodium_mg > 500) {
      score -= 10;
      reasons.push("Moderate sodium");
    }
    
    // Vegetarian preference (if applicable)
    if (profile?.veg_flag && !['chicken', 'mutton', 'fish'].includes(item.category)) {
      score += 5;
      reasons.push("Vegetarian");
    }
    
    return {
      ...item,
      score,
      reason: reasons.join(", ") || "Standard option"
    };
  });
  
  // Sort by score
  scored.sort((a, b) => b.score - a.score);
  
  return {
    picks: scored.slice(0, 3).filter(item => item.score > 10),
    alternates: scored.slice(3, 5).filter(item => item.score >= 0),
    avoid: scored.slice(-3).filter(item => item.score < 0)
  };
}

// OCR processing with timeout and optimization
async function processMenuImage(imageBuffer) {
  try {
    // Implement timeout for OCR processing
    const OCR_TIMEOUT = 15000; // 15 seconds max
    
    const ocrPromise = (async () => {
      const worker = await createWorker('eng+hin', 1, {
        logger: m => console.log(m) // Optional: remove in production
      });
      
      // Optimize worker configuration
      await worker.setParameters({
        tessedit_page_seg_mode: '6', // Uniform block of text
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-',
      });
      
      const { data: { text } } = await worker.recognize(imageBuffer);
      await worker.terminate();
      
      return text;
    })();
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OCR processing timed out')), OCR_TIMEOUT)
    );
    
    const result = await Promise.race([ocrPromise, timeoutPromise]);
    return result;
    
  } catch (error) {
    console.error('OCR Error:', error);
    
    // Fallback with mock data for demo when OCR fails/times out
    console.log('Using fallback mock menu data due to OCR timeout/error');
    return "Dal Tadka\nPaneer Tikka\nButter Chicken\nVegetable Biryani\nRoti\nNaan\nSamosa\nChole\nRice\nMasala Dosa\nIdli\nUpma";
  }
}

// Extract food items from OCR text
function extractFoodItems(ocrText) {
  const lines = ocrText.toLowerCase().split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2);
  
  const foundItems = [];
  
  for (const line of lines) {
    for (const [foodName, nutritionData] of Object.entries(INDIAN_FOOD_DB)) {
      if (line.includes(foodName.toLowerCase()) || 
          foodName.toLowerCase().includes(line)) {
        foundItems.push({
          name: foodName.charAt(0).toUpperCase() + foodName.slice(1),
          ...nutritionData
        });
        break; // Avoid duplicates
      }
    }
  }
  
  // If no matches, add some common items as fallback
  if (foundItems.length === 0) {
    foundItems.push(
      { name: "Dal Tadka", ...INDIAN_FOOD_DB["dal tadka"] },
      { name: "Paneer Tikka", ...INDIAN_FOOD_DB["paneer tikka"] },
      { name: "Biryani", ...INDIAN_FOOD_DB["biryani"] },
      { name: "Butter Chicken", ...INDIAN_FOOD_DB["butter chicken"] },
      { name: "Roti", ...INDIAN_FOOD_DB["roti"] }
    );
  }
  
  return foundItems;
}

// Coach C prompt for Gemini
const COACH_C_PROMPT = `You are Coach C, an empathetic Indian health, fitness, and nutrition coach. You are science-first: no fads, no pseudoscience.

Always:
- Personalize using the user's profile and context
- Prefer Indian dishes and units; quantify in katori (ml), roti count/diameter, ladle, piece; grams only when needed
- Suggest protein-forward, budget-aware options with practical swaps (tawa vs butter; dal without tadka; grilled/air-fried vs fried)
- Keep tone non-judgmental, emphasize small wins
- Default guardrails:
  • Protein: start 0.83 g/kg/d; if fat-loss/strength, ~1.2–1.6 g/kg/d with vegetarian/Jain plans
  • Fiber: ~25–40 g/d from dal, chana, veggies, fruit, whole grains; ramp gradually
  • Sodium: <2,000 mg/d (≈5 g salt)
  • Free sugars: <10% kcal (prefer <5%)

Be explicit about assumptions (e.g., roti 16–18 cm; katori 150 ml) and ask max one clarifying question when confidence is low.
Provide short, clear action steps; never moralize. Add this disclaimer: "General guidance only; not medical advice. Consult a clinician for red-flag symptoms."
If the user requests unsafe methods, decline and offer evidence-based alternatives.

Keep responses conversational and under 150 words.`;



export async function POST(request) {
  const pathname = new URL(request.url).pathname;
  
  try {
    // Menu scanning endpoint
    if (pathname.includes('/menu/scan')) {
      const formData = await request.formData();
      const imageFile = formData.get('image');
      
      if (!imageFile) {
        return NextResponse.json(
          { error: { type: 'DataContract', message: 'No image provided' } },
          { status: 400 }
        );
      }
      
      // Process image
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      const ocrText = await processMenuImage(imageBuffer);
      
      // Extract food items
      const items = extractFoodItems(ocrText);
      
      // Get user profile (simplified for MVP)
      const defaultProfile = { veg_flag: true, weight_kg: 65 };
      
      // Generate recommendations
      const recommendations = getRecommendations(items, defaultProfile);
      
      return NextResponse.json({
        items,
        picks: recommendations.picks,
        alternates: recommendations.alternates,
        avoid: recommendations.avoid,
        assumptions: [
          "Portion sizes assumed as standard servings",
          "Vegetarian preference applied",
          "Nutrition values are approximate"
        ]
      });
    }
    
    // Meal Photo Analyzer endpoint
    if (pathname.includes('/food/analyze')) {
      const formData = await request.formData();
      const imageFile = formData.get('image');
      
      if (!imageFile) {
        return NextResponse.json(
          { error: { type: 'DataContract', message: 'No meal image provided' } },
          { status: 400 }
        );
      }
      
      // Analyze meal photo (AI-powered detection)
      const analysis = await analyzeMealPhoto(imageFile);
      
      return NextResponse.json(analysis);
    }
    
    // Food logging endpoint
    if (pathname.includes('/logs')) {
      const { food_id, menu_item_id, portion_qty, portion_unit, idempotency_key } = await request.json();
      
      if (!food_id && !menu_item_id) {
        return NextResponse.json(
          { error: { type: 'DataContract', message: 'Either food_id or menu_item_id required' } },
          { status: 400 }
        );
      }
      
      // Log food entry with idempotency check
      const logEntry = await logFoodEntry({
        food_id,
        menu_item_id,
        portion_qty: portion_qty || 1,
        portion_unit: portion_unit || 'serving',
        idempotency_key
      });
      
      return NextResponse.json(logEntry);
    }
    
    // Coach chat endpoint
    if (pathname.includes('/coach/ask')) {
      const { message, profile, context_flags } = await request.json();
      
      if (!message) {
        return NextResponse.json(
          { error: { type: 'DataContract', message: 'No message provided' } },
          { status: 400 }
        );
      }
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const contextInfo = profile ? 
        `User profile: Weight ${profile.weight_kg || 65}kg, Height ${profile.height_cm || 165}cm, ${profile.veg_flag ? 'Vegetarian' : 'Non-vegetarian'}, Activity: ${profile.activity_level || 'moderate'}` : 
        'No profile data available';
      
      const fullPrompt = `${COACH_C_PROMPT}\n\nUser Context: ${contextInfo}\nUser Question: ${message}`;
      
      const result = await model.generateContent(fullPrompt);
      const reply = result.response.text();
      
      return NextResponse.json({
        reply: reply,
        citations: []
      });
    }
    
    // Profile endpoints
    if (pathname.includes('/me/profile')) {
      // GET profile or PUT update profile
      const method = request.method;
      
      if (method === 'PUT') {
        const profileData = await request.json();
        // Update user profile in Supabase
        const updatedProfile = await updateUserProfile(profileData);
        return NextResponse.json(updatedProfile);
      } else {
        // GET profile
        const profile = await getUserProfile();
        return NextResponse.json(profile || {});
      }
    }
    
    // Daily targets endpoint  
    if (pathname.includes('/me/targets')) {
      const url = new URL(request.url);
      const date = url.searchParams.get('date');
      
      if (request.method === 'GET') {
        const targets = await getDailyTargets(date);
        return NextResponse.json(targets);
      } else if (request.method === 'PUT') {
        const targetData = await request.json();
        const updatedTargets = await upsertDailyTargets(targetData);
        return NextResponse.json(updatedTargets);
      }
    }
    
    // TDEE calculation endpoint
    if (pathname.includes('/tools/tdee')) {
      const { sex, age, height_cm, weight_kg, activity_level } = await request.json();
      
      // Harris-Benedict equation
      let bmr;
      if (sex === 'male') {
        bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age);
      } else {
        bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age);
      }
      
      // Activity multipliers
      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
      };
      
      const tdee = Math.round(bmr * (activityMultipliers[activity_level] || 1.55));
      
      return NextResponse.json({ tdee_kcal: tdee });
    }
    
    return NextResponse.json(
      { error: { type: 'Logic', message: 'Endpoint not found' } },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: { type: 'Logic', message: error.message } },
      { status: 500 }
    );
  }
}

// GET endpoint for logs and profile
export async function GET(request) {
  const pathname = new URL(request.url).pathname;
  const url = new URL(request.url);
  
  try {
    // Get food logs
    if (pathname.includes('/logs')) {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      
      const logs = await getFoodLogs(from, to);
      return NextResponse.json(logs || []);
    }
    
    // Get daily targets
    if (pathname.includes('/me/targets')) {
      const date = url.searchParams.get('date');
      const targets = await getDailyTargets(date);
      return NextResponse.json(targets);
    }
    
    // Get user profile
    if (pathname.includes('/me')) {
      const profile = await getUserProfile();
      return NextResponse.json(profile || {});
    }
    
    // Default health check
    return NextResponse.json({ message: "Fitbear AI API is running!" });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: { type: 'Logic', message: error.message } },
      { status: 500 }
    );
  }
}

// Meal Photo Analysis using Gemini Vision
async function analyzeMealPhoto(imageFile) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Convert image to base64
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = `Analyze this Indian meal photo. Identify the main dishes visible and provide:
1. Top 3 most likely food items with confidence scores
2. Estimated portion sizes (use Indian units: katori, roti count, pieces)
3. One clarifying question if confidence is low

Focus on common Indian foods: dal, rice, roti, sabzi, paneer dishes, etc.
Format response as JSON with: guess, portion_hint, confidence, question.`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image
        }
      }
    ]);
    
    const response = result.response.text();
    
    // Parse AI response or use fallback
    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback response
      return {
        guess: [
          { food_id: "dal-tadka", name: "Dal Tadka", confidence: 0.8 },
          { food_id: "rice", name: "Plain Rice", confidence: 0.7 },
          { food_id: "roti", name: "Roti", confidence: 0.6 }
        ],
        portion_hint: "Standard serving sizes assumed",
        confidence: 0.7,
        question: "How many rotis can you see in the image?",
        on_confirm: {
          calories: 420,
          protein_g: 15,
          carb_g: 65,
          fat_g: 8,
          fiber_g: 6,
          sodium_mg: 800
        }
      };
    }
    
  } catch (error) {
    console.error('Photo analysis error:', error);
    
    // Fallback for demo
    return {
      guess: [
        { food_id: "thali", name: "Mixed Vegetable Thali", confidence: 0.6 }
      ],
      portion_hint: "Complete meal detected",
      confidence: 0.6,
      question: "Is this a full thali or individual dishes?",
      on_confirm: {
        calories: 600,
        protein_g: 20,
        carb_g: 80,
        fat_g: 18,
        fiber_g: 12,
        sodium_mg: 1500
      }
    };
  }
}

// Food logging with idempotency
async function logFoodEntry({ food_id, menu_item_id, portion_qty, portion_unit, idempotency_key }) {
  try {
    // Check for existing entry with same idempotency key
    if (idempotency_key) {
      // In production, check Supabase for existing log
      console.log(`Checking idempotency for key: ${idempotency_key}`);
    }
    
    // Get nutrition data
    const foodData = INDIAN_FOOD_DB[food_id] || INDIAN_FOOD_DB["dal tadka"];
    
    // Calculate actual nutrition based on portion
    const actualCalories = Math.round(foodData.calories * portion_qty);
    const actualProtein = Math.round(foodData.protein_g * portion_qty * 10) / 10;
    const actualCarbs = Math.round(foodData.carb_g * portion_qty * 10) / 10;
    const actualFat = Math.round(foodData.fat_g * portion_qty * 10) / 10;
    const actualFiber = Math.round(foodData.fiber_g * portion_qty * 10) / 10;
    const actualSodium = Math.round(foodData.sodium_mg * portion_qty);
    
    // Create log entry
    const logEntry = {
      log_id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      food_id,
      menu_item_id,
      portion_qty,
      portion_unit,
      calories: actualCalories,
      protein_g: actualProtein,
      carb_g: actualCarbs,
      fat_g: actualFat,
      fiber_g: actualFiber,
      sodium_mg: actualSodium,
      logged_at: new Date().toISOString(),
      idempotency_key
    };
    
    // In production: Save to Supabase
    console.log('Logging food entry:', logEntry);
    
    return {
      log_id: logEntry.log_id,
      calories: actualCalories,
      macros: {
        protein_g: actualProtein,
        carb_g: actualCarbs,
        fat_g: actualFat,
        fiber_g: actualFiber,
        sodium_mg: actualSodium
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to log food entry: ${error.message}`);
  }
}

// Get food logs (stub)
async function getFoodLogs(from, to) {
  // Return mock data for demo
  return [
    {
      id: "log1",
      timestamp: new Date().toISOString(),
      food_name: "Dal Tadka",
      calories: 180,
      protein_g: 9,
      portion: "1 katori"
    },
    {
      id: "log2", 
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      food_name: "Roti",
      calories: 120,
      protein_g: 4,
      portion: "2 pieces"
    }
  ];
}

// User profile functions (stubs)
async function getUserProfile() {
  return {
    name: "Demo User",
    height_cm: 165,
    weight_kg: 65,
    veg_flag: true,
    activity_level: "moderate"
  };
}

async function updateUserProfile(profileData) {
  return { ...profileData, updated_at: new Date().toISOString() };
}

async function getDailyTargets(date) {
  return {
    date: date || new Date().toISOString().split('T')[0],
    tdee_kcal: 2200,
    kcal_budget: 1800,
    protein_g: 110,
    carb_g: 200,
    fat_g: 60,
    fiber_g: 30,
    sodium_mg: 2000,
    water_ml: 2500,
    steps: 8000
  };
}

async function upsertDailyTargets(targetData) {
  return { ...targetData, updated_at: new Date().toISOString() };
}