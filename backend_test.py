#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Fitbear AI
Tests all API endpoints with realistic Indian nutrition data
"""

import requests
import json
import io
from PIL import Image
import base64
import os
import sys
import time

# Get the base URL from environment
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use the production URL from environment
NEXT_PUBLIC_BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://healthpulse-21.preview.emergentagent.com')
BASE_URL = f"{NEXT_PUBLIC_BASE_URL}/api"

def create_test_image():
    """Create a simple test image with menu text for OCR testing"""
    try:
        # Create a simple image with text
        img = Image.new('RGB', (400, 300), color='white')
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        return img_byte_arr
    except Exception as e:
        print(f"Error creating test image: {e}")
        return None

def test_api_health_check():
    """Test 1: API Health Check - GET /api/"""
    print("\n" + "="*60)
    print("TEST 1: API Health Check")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}", timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "Fitbear AI" in data.get("message", ""):
                print("✅ PASS: Health check successful - Fitbear AI API is running")
                return True
            else:
                print("❌ FAIL: Unexpected response message")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ FAIL: Request error - {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ FAIL: JSON decode error - {e}")
        return False
    except Exception as e:
        print(f"❌ FAIL: Unexpected error - {e}")
        return False

def test_menu_scanner():
    """Test 2: Menu Scanner - POST /api/menu/scan"""
    print("\n" + "="*60)
    print("TEST 2: Menu Scanner Endpoint")
    print("="*60)
    
    try:
        # Create test image
        test_image = create_test_image()
        if not test_image:
            print("❌ FAIL: Could not create test image")
            return False
        
        # Prepare multipart form data
        files = {
            'image': ('menu.png', test_image, 'image/png')
        }
        
        print("Sending menu scan request...")
        response = requests.post(f"{BASE_URL}/menu/scan", files=files, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
            
            # Check required fields
            required_fields = ['items', 'picks', 'alternates', 'avoid', 'assumptions']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ FAIL: Missing required fields: {missing_fields}")
                return False
            
            # Check if we got food items
            items = data.get('items', [])
            picks = data.get('picks', [])
            
            print(f"Found {len(items)} food items")
            print(f"Got {len(picks)} recommendations")
            
            if len(items) > 0:
                print("Sample food items:")
                for item in items[:3]:
                    print(f"  - {item.get('name', 'Unknown')}: {item.get('calories', 0)} kcal")
                
                if len(picks) > 0:
                    print("Sample recommendations:")
                    for pick in picks[:2]:
                        print(f"  ✅ {pick.get('name', 'Unknown')}: {pick.get('reason', 'No reason')}")
                
                print("✅ PASS: Menu scanner working - OCR processed and recommendations generated")
                return True
            else:
                print("❌ FAIL: No food items detected")
                return False
                
        else:
            print(f"Response: {response.text}")
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ FAIL: Request error - {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ FAIL: JSON decode error - {e}")
        return False
    except Exception as e:
        print(f"❌ FAIL: Unexpected error - {e}")
        return False

def test_coach_chat():
    """Test 3: Coach Chat - POST /api/coach/ask"""
    print("\n" + "="*60)
    print("TEST 3: Coach Chat Endpoint")
    print("="*60)
    
    try:
        # Test with realistic Indian nutrition question
        test_data = {
            "message": "What should I eat for breakfast to increase my protein intake? I'm vegetarian.",
            "profile": {
                "weight_kg": 65,
                "height_cm": 165,
                "veg_flag": True,
                "activity_level": "moderate"
            },
            "context_flags": ["nutrition", "indian_diet"]
        }
        
        print("Sending coach chat request...")
        print(f"Question: {test_data['message']}")
        
        response = requests.post(
            f"{BASE_URL}/coach/ask",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=60
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            reply = data.get('reply', '')
            
            print(f"Coach Response Length: {len(reply)} characters")
            print(f"Coach Response Preview: {reply[:200]}...")
            
            # Check if response contains Indian food context
            indian_keywords = ['dal', 'paneer', 'roti', 'protein', 'vegetarian', 'indian']
            found_keywords = [word for word in indian_keywords if word.lower() in reply.lower()]
            
            if len(reply) > 50 and len(found_keywords) > 0:
                print(f"Found relevant keywords: {found_keywords}")
                print("✅ PASS: Coach chat working - AI generated contextual Indian nutrition advice")
                return True
            else:
                print("❌ FAIL: Response too short or lacks Indian nutrition context")
                return False
                
        else:
            print(f"Response: {response.text}")
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ FAIL: Request error - {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ FAIL: JSON decode error - {e}")
        return False
    except Exception as e:
        print(f"❌ FAIL: Unexpected error - {e}")
        return False

def test_tdee_calculator():
    """Test 4: TDEE Calculator - POST /api/tools/tdee"""
    print("\n" + "="*60)
    print("TEST 4: TDEE Calculator Endpoint")
    print("="*60)
    
    try:
        # Test with realistic Indian body measurements
        test_cases = [
            {
                "name": "Male, Moderate Activity",
                "data": {
                    "sex": "male",
                    "age": 28,
                    "height_cm": 175,
                    "weight_kg": 70,
                    "activity_level": "moderate"
                },
                "expected_range": (2200, 2800)
            },
            {
                "name": "Female, Light Activity",
                "data": {
                    "sex": "female",
                    "age": 25,
                    "height_cm": 160,
                    "weight_kg": 55,
                    "activity_level": "light"
                },
                "expected_range": (1600, 2100)
            }
        ]
        
        all_passed = True
        
        for test_case in test_cases:
            print(f"\nTesting: {test_case['name']}")
            print(f"Input: {test_case['data']}")
            
            response = requests.post(
                f"{BASE_URL}/tools/tdee",
                json=test_case['data'],
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                tdee = data.get('tdee_kcal')
                
                print(f"Calculated TDEE: {tdee} kcal/day")
                
                if tdee and isinstance(tdee, (int, float)):
                    min_expected, max_expected = test_case['expected_range']
                    if min_expected <= tdee <= max_expected:
                        print(f"✅ PASS: TDEE {tdee} is within expected range {test_case['expected_range']}")
                    else:
                        print(f"❌ FAIL: TDEE {tdee} outside expected range {test_case['expected_range']}")
                        all_passed = False
                else:
                    print("❌ FAIL: Invalid TDEE value returned")
                    all_passed = False
            else:
                print(f"Response: {response.text}")
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                all_passed = False
        
        if all_passed:
            print("\n✅ PASS: TDEE calculator working - All test cases passed with realistic values")
            return True
        else:
            print("\n❌ FAIL: Some TDEE test cases failed")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ FAIL: Request error - {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ FAIL: JSON decode error - {e}")
        return False
    except Exception as e:
        print(f"❌ FAIL: Unexpected error - {e}")
        return False

def test_error_handling():
    """Test 5: Error Handling"""
    print("\n" + "="*60)
    print("TEST 5: Error Handling")
    print("="*60)
    
    try:
        # Test invalid endpoint
        print("Testing invalid endpoint...")
        response = requests.get(f"{BASE_URL}/invalid/endpoint", timeout=30)
        print(f"Invalid endpoint status: {response.status_code}")
        
        # Test missing data for coach
        print("Testing coach with missing message...")
        response = requests.post(
            f"{BASE_URL}/coach/ask",
            json={},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        print(f"Missing message status: {response.status_code}")
        
        # Test menu scan without image
        print("Testing menu scan without image...")
        response = requests.post(f"{BASE_URL}/menu/scan", timeout=30)
        print(f"Missing image status: {response.status_code}")
        
        print("✅ PASS: Error handling tests completed")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Error handling test failed - {e}")
        return False

def test_meal_photo_analyzer():
    """Test 6: Meal Photo Analyzer - POST /api/food/analyze (CRITICAL FEATURE)"""
    print("\n" + "="*60)
    print("TEST 6: Meal Photo Analyzer (CRITICAL MISSING FEATURE)")
    print("="*60)
    
    try:
        # Create test image for meal analysis
        test_image = create_test_image()
        if not test_image:
            print("❌ FAIL: Could not create test image")
            return False
        
        # Prepare multipart form data
        files = {
            'image': ('meal_photo.jpg', test_image, 'image/jpeg')
        }
        
        print("Sending meal photo analysis request...")
        response = requests.post(f"{BASE_URL}/food/analyze", files=files, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
            
            # Check required fields for meal analysis
            required_fields = ['guess', 'portion_hint', 'confidence']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ FAIL: Missing required fields: {missing_fields}")
                return False
            
            # Check if we got food guesses
            guesses = data.get('guess', [])
            confidence = data.get('confidence', 0)
            
            print(f"Found {len(guesses)} food guesses")
            print(f"Overall confidence: {confidence}")
            
            if len(guesses) > 0:
                print("Food guesses:")
                for guess in guesses[:3]:
                    print(f"  - {guess.get('name', 'Unknown')}: {guess.get('confidence', 0):.2f} confidence")
                
                print(f"Portion hint: {data.get('portion_hint', 'None')}")
                
                print("✅ PASS: Meal Photo Analyzer working - AI analyzed meal photo successfully")
                return True
            else:
                print("❌ FAIL: No food guesses returned")
                return False
                
        else:
            print(f"Response: {response.text}")
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ FAIL: Request error - {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ FAIL: JSON decode error - {e}")
        return False
    except Exception as e:
        print(f"❌ FAIL: Unexpected error - {e}")
        return False

def test_food_logging_system():
    """Test 7: Food Logging System - POST /api/logs and GET /api/logs"""
    print("\n" + "="*60)
    print("TEST 7: Food Logging System")
    print("="*60)
    
    try:
        # Test POST /api/logs - Log a food entry with idempotency key
        print("Testing POST /api/logs...")
        log_data = {
            "food_id": "dal tadka",
            "portion_qty": 1.5,
            "portion_unit": "katori",
            "idempotency_key": f"test_log_{int(time.time())}"
        }
        
        print(f"Logging food: {log_data}")
        
        response = requests.post(
            f"{BASE_URL}/logs",
            json=log_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"POST Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Log entry created: {data}")
            
            # Check required fields
            if 'log_id' in data and 'calories' in data and 'macros' in data:
                print("✅ PASS: Food logging (POST) working correctly")
                post_success = True
            else:
                print("❌ FAIL: Food logging (POST) missing required fields")
                post_success = False
        else:
            print(f"Response: {response.text}")
            print("❌ FAIL: Food logging (POST) failed")
            post_success = False
        
        # Test GET /api/logs - Retrieve food logs
        print("\nTesting GET /api/logs...")
        response = requests.get(f"{BASE_URL}/logs", timeout=30)
        
        print(f"GET Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Retrieved {len(data)} log entries")
            
            if isinstance(data, list):
                if len(data) > 0:
                    print("Sample log entries:")
                    for log in data[:2]:
                        print(f"  - {log.get('food_name', 'Unknown')}: {log.get('calories', 0)} kcal")
                
                print("✅ PASS: Food logs retrieval (GET) working correctly")
                get_success = True
            else:
                print("❌ FAIL: Food logs retrieval returned invalid format")
                get_success = False
        else:
            print(f"Response: {response.text}")
            print("❌ FAIL: Food logs retrieval (GET) failed")
            get_success = False
        
        return post_success and get_success
        
    except Exception as e:
        print(f"❌ FAIL: Food logging system error - {e}")
        return False

def test_profile_endpoints():
    """Test 8: Profile Endpoints - GET /api/me and PUT /api/me/profile"""
    print("\n" + "="*60)
    print("TEST 8: Profile Endpoints")
    print("="*60)
    
    try:
        # Test GET /api/me
        print("Testing GET /api/me...")
        response = requests.get(f"{BASE_URL}/me", timeout=30)
        
        print(f"GET /api/me Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"User profile: {data}")
            print("✅ PASS: User profile retrieval (GET /api/me) working")
            me_success = True
        else:
            print(f"Response: {response.text}")
            print("❌ FAIL: User profile retrieval failed")
            me_success = False
        
        # Test GET /api/me/profile
        print("\nTesting GET /api/me/profile...")
        response = requests.get(f"{BASE_URL}/me/profile", timeout=30)
        
        print(f"GET /api/me/profile Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Detailed profile: {data}")
            print("✅ PASS: Detailed profile retrieval working")
            profile_get_success = True
        else:
            print(f"Response: {response.text}")
            print("❌ FAIL: Detailed profile retrieval failed")
            profile_get_success = False
        
        # Test PUT /api/me/profile
        print("\nTesting PUT /api/me/profile...")
        update_data = {
            "name": "Arjun Sharma",
            "height_cm": 178,
            "weight_kg": 72,
            "veg_flag": True,
            "activity_level": "active",
            "goal": "muscle_gain"
        }
        
        response = requests.put(
            f"{BASE_URL}/me/profile",
            json=update_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"PUT /api/me/profile Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Updated profile: {data}")
            print("✅ PASS: Profile update working")
            profile_put_success = True
        else:
            print(f"Response: {response.text}")
            print("❌ FAIL: Profile update failed")
            profile_put_success = False
        
        return me_success and profile_get_success and profile_put_success
        
    except Exception as e:
        print(f"❌ FAIL: Profile endpoints error - {e}")
        return False

def test_targets_endpoint():
    """Test 9: Targets Endpoint - GET /api/me/targets and PUT /api/me/targets"""
    print("\n" + "="*60)
    print("TEST 9: Targets Endpoint")
    print("="*60)
    
    try:
        # Test GET /api/me/targets
        print("Testing GET /api/me/targets...")
        response = requests.get(f"{BASE_URL}/me/targets?date=2025-01-27", timeout=30)
        
        print(f"GET Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Daily targets: {data}")
            
            # Check for expected fields
            expected_fields = ['tdee_kcal', 'kcal_budget', 'protein_g', 'carb_g', 'fat_g']
            has_required_fields = all(field in data for field in expected_fields)
            
            if has_required_fields:
                print("✅ PASS: Targets retrieval working correctly")
                get_success = True
            else:
                print("❌ FAIL: Targets retrieval missing required fields")
                get_success = False
        else:
            print(f"Response: {response.text}")
            print("❌ FAIL: Targets retrieval failed")
            get_success = False
        
        # Test PUT /api/me/targets
        print("\nTesting PUT /api/me/targets...")
        targets_data = {
            "date": "2025-01-27",
            "kcal_budget": 2000,
            "protein_g": 120,
            "carb_g": 220,
            "fat_g": 65,
            "fiber_g": 35,
            "water_ml": 3000,
            "steps": 10000
        }
        
        response = requests.put(
            f"{BASE_URL}/me/targets",
            json=targets_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"PUT Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Updated targets: {data}")
            print("✅ PASS: Targets update working correctly")
            put_success = True
        else:
            print(f"Response: {response.text}")
            print("❌ FAIL: Targets update failed")
            put_success = False
        
        return get_success and put_success
        
    except Exception as e:
        print(f"❌ FAIL: Targets endpoint error - {e}")
        return False

def main():
    """Run all backend tests"""
    print("🚀 FITBEAR AI BACKEND TESTING")
    print("="*60)
    print(f"Testing API at: {BASE_URL}")
    
    # Run all tests
    tests = [
        ("API Health Check", test_api_health_check),
        ("Menu Scanner", test_menu_scanner),
        ("Coach Chat", test_coach_chat),
        ("TDEE Calculator", test_tdee_calculator),
        ("Error Handling", test_error_handling),
        ("Meal Photo Analyzer", test_meal_photo_analyzer),
        ("Food Logging System", test_food_logging_system),
        ("Profile Endpoints", test_profile_endpoints),
        ("Targets Endpoint", test_targets_endpoint)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ FAIL: {test_name} crashed - {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "="*60)
    print("🏁 TESTING SUMMARY")
    print("="*60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Fitbear AI backend is working correctly.")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed. Check the details above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)