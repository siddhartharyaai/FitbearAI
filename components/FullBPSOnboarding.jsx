'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { safeJson } from '@/lib/http';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { usePostHog } from '@/lib/hooks/usePostHog';

export function FullBPSOnboarding({ onComplete, loading = false }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Demographics
    name: '',
    gender: '',
    dob: '',
    height_cm: '',
    weight_kg: '',
    waist_cm: '',
    
    // Lifestyle
    activity_level: 'moderate',
    sleep_hours: '7',
    stress_level: 'moderate',
    
    // Medical
    diabetes: false,
    hypertension: false,
    allergies: '',
    conditions: '',
    
    // Dietary
    veg_flag: false,
    jain_flag: false,
    halal_flag: false,
    eggetarian_flag: false,
    
    // Contextual
    budget_level: 'medium',
    schedule: '',
    cuisines: [],
    pantry: '',
    locale: 'en'
  });

  const { track } = usePostHog();

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setStep(prev => prev + 1);
    track('onboarding_step_completed', { step, total_steps: 5 });
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  // Local TDEE computation using Harris-Benedict equation (same as server)
  function computeLocalTDEE(payload) {
    const { sex, age, height_cm, weight_kg, activity_level } = payload;
    
    const bmr = sex === "male"
      ? 66.47 + 13.75 * weight_kg + 5.003 * height_cm - 6.755 * age
      : 655.1 + 9.563 * weight_kg + 1.850 * height_cm - 4.676 * age;

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    return Math.round(bmr * (activityMultipliers[activity_level] ?? 1.2));
  }

  const handleSubmit = async () => {
    try {
      // Calculate age from DOB with validation
      const rawAge = formData.dob ? new Date().getFullYear() - new Date(formData.dob).getFullYear() : null;
      const age = (rawAge && !isNaN(rawAge) && rawAge > 0 && rawAge < 120) ? rawAge : 25;
      
      // Validate and sanitize all numeric values
      const height_cm = parseInt(formData.height_cm) || 165;
      const weight_kg = parseFloat(formData.weight_kg) || 65;
      
      // Validate and prepare TDEE request data
      const tdeeRequestData = {
        sex: formData.gender || 'male',
        age: age,
        height_cm: height_cm,
        weight_kg: weight_kg,
        activity_level: formData.activity_level || 'moderate'
      };
      
      // Ensure all values are valid and not NaN
      if (isNaN(tdeeRequestData.age) || isNaN(tdeeRequestData.height_cm) || isNaN(tdeeRequestData.weight_kg)) {
        throw new Error('Invalid numerical values in form data. Please check your inputs.');
      }
      
      // Calculate TDEE with safeJson and fallback mechanism
      let tdeeKcal;
      try {
        const tdeeResponse = await fetch('/api/tools/tdee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tdeeRequestData)
        });
        
        const tdeeData = await safeJson(tdeeResponse);
        tdeeKcal = tdeeData?.tdee_kcal;
        
        if (!Number.isFinite(tdeeKcal)) {
          throw new Error('API returned invalid TDEE value');
        }
        
        console.log('✅ TDEE API success:', tdeeKcal, 'kcal');
        
      } catch (apiError) {
        console.warn('TDEE API failed, using local fallback calculation:', apiError.message);
        
        // Local fallback so the user can continue even if the API is flaky
        tdeeKcal = computeLocalTDEE(tdeeRequestData);
        console.log('✅ Local TDEE fallback:', tdeeKcal, 'kcal');
        
        // Optional user notification
        if (typeof alert !== 'undefined') {
          alert('Using offline calculation for your daily needs.');
        }
      }
      
      // Prepare profile data
      const profileData = {
        ...formData,
        height_cm: parseInt(formData.height_cm) || 165,
        weight_kg: parseFloat(formData.weight_kg) || 65,
        waist_cm: parseInt(formData.waist_cm) || 80,
        allergies_json: formData.allergies ? [formData.allergies] : [],
        conditions_json: formData.conditions ? [formData.conditions] : [],
        cuisines_json: formData.cuisines,
        schedule_json: { preferred_meal_times: formData.schedule },
        pantry_json: formData.pantry ? formData.pantry.split(',').map(item => item.trim()) : []
      };

      // Prepare targets
      const proteinMultiplier = formData.activity_level === 'active' || formData.activity_level === 'very_active' ? 1.4 : 1.0;
      const targetsData = {
        date: new Date().toISOString().split('T')[0],
        tdee_kcal: tdeeKcal,
        kcal_budget: Math.round(tdeeKcal * 0.9), // Slight deficit
        protein_g: Math.round(formData.weight_kg * proteinMultiplier),
        carb_g: Math.round((tdeeKcal * 0.45) / 4), // 45% carbs
        fat_g: Math.round((tdeeKcal * 0.25) / 9), // 25% fats
        fiber_g: 30,
        sodium_mg: 2000,
        water_ml: 2500,
        steps: formData.activity_level === 'sedentary' ? 6000 : 8000
      };

      track('onboarding_completed', {
        dietary_preferences: {
          veg: formData.veg_flag,
          jain: formData.jain_flag,
          halal: formData.halal_flag
        },
        activity_level: formData.activity_level,
        locale: formData.locale
      });

      onComplete(profileData, targetsData);
      
    } catch (error) {
      console.error('Onboarding completion error:', error);
      alert(`Setup failed: ${error.message}. Please check your inputs and try again.`);
    }
  };

  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle>Complete Your Health Profile</CardTitle>
          <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => updateField('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => updateField('dob', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="locale">Language</Label>
                  <Select value={formData.locale} onValueChange={(value) => updateField('locale', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hinglish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Body Measurements</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => updateField('height_cm', e.target.value)}
                    placeholder="165"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight_kg}
                    onChange={(e) => updateField('weight_kg', e.target.value)}
                    placeholder="65.0"
                  />
                </div>
                <div>
                  <Label htmlFor="waist">Waist (cm)</Label>
                  <Input
                    id="waist"
                    type="number"
                    value={formData.waist_cm}
                    onChange={(e) => updateField('waist_cm', e.target.value)}
                    placeholder="80"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="activity">Activity Level</Label>
                <Select value={formData.activity_level} onValueChange={(value) => updateField('activity_level', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (desk job, little exercise)</SelectItem>
                    <SelectItem value="light">Light (light exercise 1-3 days/week)</SelectItem>
                    <SelectItem value="moderate">Moderate (moderate exercise 3-5 days/week)</SelectItem>
                    <SelectItem value="active">Active (hard exercise 6-7 days/week)</SelectItem>
                    <SelectItem value="very_active">Very Active (physical job + exercise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Lifestyle & Health</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sleep">Sleep Hours</Label>
                  <Select value={formData.sleep_hours} onValueChange={(value) => updateField('sleep_hours', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 hours</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="7">7 hours</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="9">9+ hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stress">Stress Level</Label>
                  <Select value={formData.stress_level} onValueChange={(value) => updateField('stress_level', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label>Medical Conditions</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="diabetes"
                    checked={formData.diabetes}
                    onCheckedChange={(checked) => updateField('diabetes', checked)}
                  />
                  <Label htmlFor="diabetes">Diabetes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hypertension"
                    checked={formData.hypertension}
                    onCheckedChange={(checked) => updateField('hypertension', checked)}
                  />
                  <Label htmlFor="hypertension">Hypertension</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="allergies">Allergies & Other Conditions</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => updateField('allergies', e.target.value)}
                  placeholder="List any allergies or medical conditions..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dietary Preferences</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="veg"
                    checked={formData.veg_flag}
                    onCheckedChange={(checked) => updateField('veg_flag', checked)}
                  />
                  <Label htmlFor="veg">Vegetarian</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="jain"
                    checked={formData.jain_flag}
                    onCheckedChange={(checked) => updateField('jain_flag', checked)}
                  />
                  <Label htmlFor="jain">Jain (No root vegetables)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="halal"
                    checked={formData.halal_flag}
                    onCheckedChange={(checked) => updateField('halal_flag', checked)}
                  />
                  <Label htmlFor="halal">Halal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="eggetarian"
                    checked={formData.eggetarian_flag}
                    onCheckedChange={(checked) => updateField('eggetarian_flag', checked)}
                  />
                  <Label htmlFor="eggetarian">Eggetarian</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="budget">Budget Level</Label>
                <Select value={formData.budget_level} onValueChange={(value) => updateField('budget_level', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Budget-friendly</SelectItem>
                    <SelectItem value="medium">Moderate</SelectItem>
                    <SelectItem value="high">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preferences & Schedule</h3>
              <div>
                <Label htmlFor="schedule">Meal Schedule</Label>
                <Textarea
                  id="schedule"
                  value={formData.schedule}
                  onChange={(e) => updateField('schedule', e.target.value)}
                  placeholder="e.g., Breakfast 8am, Lunch 1pm, Dinner 8pm"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="pantry">Common Pantry Items</Label>
                <Textarea
                  id="pantry"
                  value={formData.pantry}
                  onChange={(e) => updateField('pantry', e.target.value)}
                  placeholder="e.g., rice, dal, onions, tomatoes, spices..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            {step > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={nextStep} className="ml-auto">
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}