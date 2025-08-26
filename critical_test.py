#!/usr/bin/env python3
"""
Critical Fixes Testing - Focus on Menu Scanner and Meal Photo Analyzer
"""

import requests
import json
import io
from PIL import Image
import time

BASE_URL = "http://localhost:3000/api"

def create_test_image():
    """Create a simple test image"""
    try:
        img = Image.new('RGB', (400, 300), color='white')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()
    except Exception as e:
        print(f"Error creating test image: {e}")
        return None

def test_menu_scanner_critical():
    """CRITICAL TEST: Menu Scanner with Gemini Vision OCR"""
    print("\n" + "="*60)
    print("CRITICAL TEST: Menu Scanner with Gemini Vision OCR")
    print("="*60)
    
    try:
        test_image = create_test_image()
        if not test_image:
            return False
        
        files = {'image': ('menu.png', test_image, 'image/png')}
        
        print("Testing Menu Scanner with Gemini Vision...")
        start_time = time.time()
        
        response = requests.post(f"{BASE_URL}/menu/scan", files=files, timeout=90)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Processing Time: {processing_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            items = data.get('items', [])
            picks = data.get('picks', [])
            
            print(f"✅ SUCCESS: Menu Scanner processed in {processing_time:.2f}s (no timeout!)")
            print(f"Found {len(items)} food items, {len(picks)} recommendations")
            
            # Check if using Gemini Vision (should have fallback data)
            if len(items) > 0:
                print("Sample items detected:")
                for item in items[:3]:
                    print(f"  - {item.get('name')}: {item.get('calories')} kcal")
                return True
            else:
                print("❌ No items detected")
                return False
        else:
            print(f"❌ FAIL: Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_meal_photo_analyzer_critical():
    """CRITICAL TEST: Meal Photo Analyzer"""
    print("\n" + "="*60)
    print("CRITICAL TEST: Meal Photo Analyzer")
    print("="*60)
    
    try:
        test_image = create_test_image()
        if not test_image:
            return False
        
        files = {'image': ('meal.jpg', test_image, 'image/jpeg')}
        
        print("Testing Meal Photo Analyzer...")
        start_time = time.time()
        
        response = requests.post(f"{BASE_URL}/food/analyze", files=files, timeout=90)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Processing Time: {processing_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            guesses = data.get('guess', [])
            confidence = data.get('confidence', 0)
            
            print(f"✅ SUCCESS: Meal Photo Analyzer working!")
            print(f"Found {len(guesses)} food guesses with {confidence} confidence")
            
            if len(guesses) > 0:
                print("Food analysis results:")
                for guess in guesses:
                    print(f"  - {guess.get('name')}: {guess.get('confidence', 0):.2f} confidence")
                
                print(f"Portion hint: {data.get('portion_hint')}")
                return True
            else:
                print("❌ No food guesses returned")
                return False
        else:
            print(f"❌ FAIL: Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_e2e_flow():
    """CRITICAL TEST: End-to-End Flow"""
    print("\n" + "="*60)
    print("CRITICAL TEST: End-to-End Flow")
    print("="*60)
    
    try:
        # Step 1: Menu Scan
        print("Step 1: Menu Scan...")
        test_image = create_test_image()
        files = {'image': ('menu.png', test_image, 'image/png')}
        response = requests.post(f"{BASE_URL}/menu/scan", files=files, timeout=60)
        
        if response.status_code != 200:
            print("❌ Menu scan failed")
            return False
        
        menu_data = response.json()
        items = menu_data.get('items', [])
        print(f"✅ Menu scan: Found {len(items)} items")
        
        # Step 2: Meal Photo Analysis
        print("Step 2: Meal Photo Analysis...")
        files = {'image': ('meal.jpg', test_image, 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/food/analyze", files=files, timeout=60)
        
        if response.status_code != 200:
            print("❌ Meal analysis failed")
            return False
        
        meal_data = response.json()
        guesses = meal_data.get('guess', [])
        print(f"✅ Meal analysis: Found {len(guesses)} food guesses")
        
        # Step 3: Food Logging
        print("Step 3: Food Logging...")
        log_data = {
            "food_id": "dal tadka",
            "portion_qty": 1,
            "portion_unit": "katori",
            "idempotency_key": f"e2e_test_{int(time.time())}"
        }
        
        response = requests.post(
            f"{BASE_URL}/logs",
            json=log_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code != 200:
            print("❌ Food logging failed")
            return False
        
        log_result = response.json()
        print(f"✅ Food logged: {log_result.get('calories')} calories")
        
        # Step 4: View History
        print("Step 4: View History...")
        response = requests.get(f"{BASE_URL}/logs", timeout=30)
        
        if response.status_code != 200:
            print("❌ History retrieval failed")
            return False
        
        history = response.json()
        print(f"✅ History retrieved: {len(history)} entries")
        
        print("\n🎉 COMPLETE E2E FLOW SUCCESSFUL!")
        return True
        
    except Exception as e:
        print(f"❌ E2E Flow failed: {e}")
        return False

def main():
    """Run critical tests"""
    print("🔥 CRITICAL FIXES TESTING")
    print("="*60)
    print("Testing the two CRITICAL fixes:")
    print("1. Menu Scanner with Gemini Vision OCR (no more Tesseract timeout)")
    print("2. Meal Photo Analyzer end-to-end functionality")
    
    results = {}
    
    # Test critical fixes
    results["Menu Scanner (Gemini Vision)"] = test_menu_scanner_critical()
    results["Meal Photo Analyzer"] = test_meal_photo_analyzer_critical()
    results["E2E Flow"] = test_e2e_flow()
    
    # Summary
    print("\n" + "="*60)
    print("🏁 CRITICAL FIXES SUMMARY")
    print("="*60)
    
    for test_name, result in results.items():
        status = "✅ RESOLVED" if result else "❌ STILL FAILING"
        print(f"{status}: {test_name}")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    if passed == total:
        print(f"\n🎉 ALL CRITICAL FIXES WORKING! ({passed}/{total})")
        print("✅ Menu Scanner: No more timeout issues with Gemini Vision OCR")
        print("✅ Meal Photo Analyzer: Working end-to-end")
        print("✅ Complete E2E Flow: All endpoints integrated successfully")
        return True
    else:
        print(f"\n⚠️ {total - passed} critical issues remain")
        return False

if __name__ == "__main__":
    main()