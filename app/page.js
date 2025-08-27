'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, Utensils, MessageSquare, User, Scan, Activity, Settings, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { VoiceButton, CoachSpeaker } from '@/components/VoiceButton';
import { usePostHog } from '@/lib/hooks/usePostHog';
import { FullBPSOnboarding } from '@/components/FullBPSOnboarding';
import { SettingsPage } from '@/components/SettingsPage';

export default function FitbearApp() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('signin');
  const [profile, setProfile] = useState(null);
  const [dailyTargets, setDailyTargets] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  const [foodLogs, setFoodLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [mode, setMode] = useState('Demo');
  const [currentView, setCurrentView] = useState('app');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fqhffciiaztcycvvwrnd.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxaGZmY2lpYXp0Y3ljdnZ3cm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDA3MjMsImV4cCI6MjA3MTgxNjcyM30.uT540CzkZa-IhOCCgVCG-T2vWkZ1lhkwwyktlGGwVqU'
  );
  const { toast } = useToast();
  const { track, getFeatureFlag } = usePostHog();

  useEffect(() => {
    setMounted(true);
    // Check for remembered email
    const savedEmail = localStorage.getItem('fitbear_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    
    // Check if user is coming from password reset link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('type') === 'recovery') {
      setStep('reset-password');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      getProfile();
    }
  }, [mounted]);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        loadDailyTargets();
        setStep('app');
      } else {
        setStep('onboarding');
      }
    }
  };

  const loadDailyTargets = async () => {
    try {
      const response = await fetch('/api/me/targets');
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`Failed to load targets: ${response.status} ${response.statusText}`);
      }
      
      // Get response as text first to check if it's valid JSON
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response from targets API, using defaults');
        setDailyTargets(null);
        return;
      }
      
      try {
        const targets = JSON.parse(responseText);
        setDailyTargets(targets);
      } catch (parseError) {
        console.error('Failed to parse targets JSON:', parseError);
        console.error('Response text was:', responseText);
        setDailyTargets(null);
      }
      
    } catch (error) {
      console.error('Failed to load targets:', error);
      setDailyTargets(null);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (error) throw error;
      
      // Handle "Remember Me" functionality
      if (rememberMe) {
        localStorage.setItem('fitbear_remember_email', email);
      } else {
        localStorage.removeItem('fitbear_remember_email');
      }
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to Fitbear AI.",
      });
      
      await getProfile();
    } catch (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });
      
      setStep('signin');
    } catch (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?type=recovery`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Reset Email Sent!",
        description: "Check your email for password reset instructions.",
      });
      
      setStep('signin');
    } catch (error) {
      toast({
        title: "Reset Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch", 
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      toast({
        title: "Password Updated!",
        description: "Your password has been successfully changed.",
      });
      
      await getProfile();
    } catch (error) {
      toast({
        title: "Reset Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuScan = async (file) => {
    if (!file) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/menu/scan', {
        method: 'POST',
        body: formData,
      });
      
      // Check response status first
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Scan failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const responseText = await response.text();
      const result = JSON.parse(responseText);
      
      if (!response.ok) throw new Error(result.error?.message || 'Scan failed');
      
      setScanResult(result);
      track('menu_scanned', {
        items_found: result.items?.length || 0,
        ocr_method: result.ocr_method,
        confidence: result.confidence
      });
      
      toast({
        title: "Menu Scanned!",
        description: `Found ${result.items?.length || 0} items with recommendations.`,
      });
    } catch (error) {
      toast({
        title: "Scan Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoAnalysis = async (file) => {
    if (!file) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/food/analyze', {
        method: 'POST',
        body: formData,
      });
      
      // Check response status first
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const responseText = await response.text();
      const result = JSON.parse(responseText);
      
      if (!response.ok) throw new Error(result.error?.message || 'Analysis failed');
      
      setPhotoAnalysis(result);
      track('photo_logged', {
        confidence: result.confidence,
        items_detected: result.guess?.length || 0
      });
      
      toast({
        title: "Meal Analyzed!",
        description: `Detected ${result.guess?.length || 0} food items.`,
      });
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCoachChat = async (message) => {
    if (!message.trim()) return;
    
    const userMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/coach/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          profile: profile,
          context_flags: ['nutrition', 'indian_diet']
        }),
      });
      
      // Check response status first
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coach error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const responseText = await response.text();
      const result = JSON.parse(responseText);
      
      if (!response.ok) throw new Error(result.error?.message || 'Coach error');
      
      const coachMessage = { role: 'assistant', content: result.reply };
      setChatMessages(prev => [...prev, coachMessage]);
      
      track('coach_reply_shown', {
        message_length: message.length,
        response_length: result.reply.length
      });
    } catch (error) {
      toast({
        title: "Coach Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogFood = async (foodData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...foodData,
          idempotency_key: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }),
      });
      
      // Check response status first
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Logging failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const responseText = await response.text();
      const result = JSON.parse(responseText);
      
      if (!response.ok) throw new Error(result.error?.message || 'Logging failed');
      
      toast({
        title: "Food Logged!",
        description: `${result.calories} calories added to your diary.`,
      });
      
      await loadFoodLogs();
    } catch (error) {
      toast({
        title: "Logging Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFoodLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        console.error(`Failed to load food logs: ${response.status} ${response.statusText}`);
        setFoodLogs([]);
        return;
      }
      
      // Get response as text first to check if it's valid JSON
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response from food logs API');
        setFoodLogs([]);
        return;
      }
      
      try {
        const logs = JSON.parse(responseText);
        setFoodLogs(logs || []);
      } catch (parseError) {
        console.error('Failed to parse food logs JSON:', parseError);
        console.error('Response text was:', responseText);
        setFoodLogs([]);
      }
      
    } catch (error) {
      console.error('Failed to load food logs:', error);
      setFoodLogs([]);
    }
  };

  const handleRecommendationTap = (item) => {
    track('recommendation_tapped', {
      item_name: item.name,
      calories: item.calories,
      protein: item.protein_g
    });
    handleLogFood({ 
      food_id: item.name.toLowerCase().replace(' ', '-'),
      portion_qty: 1,
      portion_unit: 'serving'
    });
  };

  useEffect(() => {
    if (user && profile) {
      loadFoodLogs();
    }
  }, [user, profile]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-green-700">Loading Fitbear AI...</p>
        </div>
      </div>
    );
  }

  if (step === 'signin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">Welcome Back</CardTitle>
            <p className="text-sm text-muted-foreground">Sign in to your Fitbear AI account</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded"
                  />
                  <span>Remember me</span>
                </label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 text-green-600"
                  onClick={() => setStep('forgot-password')}
                >
                  Forgot password?
                </Button>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 text-green-600"
                  onClick={() => setStep('signup')}
                >
                  Sign up
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">Join Fitbear AI</CardTitle>
            <p className="text-sm text-muted-foreground">Create your nutrition coach account</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 text-green-600"
                  onClick={() => setStep('signin')}
                >
                  Sign in
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'forgot-password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-green-700">Reset Password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Reset Link
              </Button>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-green-600"
                  onClick={() => setStep('signin')}
                >
                  Back to Sign In
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'reset-password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-green-700">Set New Password</CardTitle>
            <p className="text-sm text-muted-foreground">Choose a new password for your account</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'onboarding') {
    return (
      <FullBPSOnboarding
        onComplete={async (profileData, targetsData) => {
          setLoading(true);
          try {
            // Save profile via API endpoint instead of direct Supabase
            const profileResponse = await fetch('/api/me/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, ...profileData })
            });

            if (!profileResponse.ok) {
              const errorText = await profileResponse.text();
              throw new Error(`Failed to save profile: ${profileResponse.status} - ${errorText}`);
            }

            // Save targets via API endpoint  
            const targetsResponse = await fetch('/api/me/targets', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, ...targetsData })
            });

            if (!targetsResponse.ok) {
              const errorText = await targetsResponse.text();
              throw new Error(`Failed to save targets: ${targetsResponse.status} - ${errorText}`);
            }

            track('onboarding_completed', {
              dietary_preferences: {
                veg: profileData.veg_flag,
                jain: profileData.jain_flag,
                halal: profileData.halal_flag
              },
              activity_level: profileData.activity_level,
              locale: profileData.locale
            });

            // Refresh profile data
            await getProfile();
            
            // Show success message
            toast({
              title: "Profile Setup Complete!",
              description: "Your health profile and daily targets have been saved successfully.",
            });
          } catch (error) {
            console.error('Profile setup error:', error);
            toast({
              title: "Setup Error",
              description: error.message,
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        }}
        loading={loading}
      />
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="container mx-auto max-w-4xl">
          <SettingsPage
            profile={profile}
            onUpdateProfile={setProfile}
            onBack={() => setCurrentView('app')}
            mode={mode}
            onModeChange={(newMode) => {
              setMode(newMode);
              toast({
                title: `Switched to ${newMode} Mode`,
                description: newMode === 'Production' ? 'Mock endpoints now disabled' : 'Using sample data'
              });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Mode Banner */}
      <div className={`w-full py-2 px-4 text-center text-sm font-medium ${
        mode === 'Production' 
          ? 'bg-red-600 text-white' 
          : 'bg-yellow-500 text-black'
      }`}>
        <div className="flex items-center justify-center space-x-2">
          <span>🚀</span>
          <span>{mode} Mode</span>
          {mode === 'Demo' && <span>• Sample data shown for demonstration</span>}
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header with Targets */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-700">Fitbear AI</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentView('settings')}
              size="sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => supabase.auth.signOut()}
              size="sm"
            >
              <User className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Daily Targets Dashboard */}
        {dailyTargets && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Today's Targets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{dailyTargets.kcal_budget}</p>
                  <p className="text-sm text-muted-foreground">Calories</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{dailyTargets.protein_g}g</p>
                  <p className="text-sm text-muted-foreground">Protein</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{dailyTargets.water_ml}ml</p>
                  <p className="text-sm text-muted-foreground">Water</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{dailyTargets.steps}</p>
                  <p className="text-sm text-muted-foreground">Steps</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="scanner" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scanner" className="flex items-center space-x-2">
              <Scan className="w-4 h-4" />
              <span>Menu Scanner</span>
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>Meal Photo</span>
            </TabsTrigger>
            <TabsTrigger value="coach" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Coach C</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          {/* Menu Scanner Tab */}
          <TabsContent value="scanner">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Menu Scanner</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Scan restaurant menus to get personalized nutrition recommendations
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer">
                      <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload menu photo or take picture
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleMenuScan(e.target.files[0])}
                      />
                    </div>
                  </label>
                </div>

                {loading && (
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Analyzing menu...</p>
                  </div>
                )}

                {/* OCR Degraded Confidence Banner */}
                {scanResult?.degraded && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Degraded Confidence:</strong> Using fallback OCR. Please verify items below.
                      {scanResult.confidence && ` (Confidence: ${(scanResult.confidence * 100).toFixed(0)}%)`}
                    </AlertDescription>
                  </Alert>
                )}

                {scanResult && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Recommendations for you:</h3>
                      <Badge variant="outline">
                        {scanResult.ocr_method === 'gemini_vision' ? 'AI Vision' : 'Fallback OCR'}
                      </Badge>
                    </div>
                    
                    {scanResult.picks?.length > 0 && (
                      <div>
                        <h4 className="text-green-600 font-medium mb-2">✅ Top Picks</h4>
                        <div className="space-y-2">
                          {scanResult.picks.map((item, idx) => (
                            <div key={idx} className="p-3 border border-green-200 rounded-lg bg-green-50 cursor-pointer hover:bg-green-100"
                                 onClick={() => handleRecommendationTap(item)}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary">{item.calories} kcal</Badge>
                                  <p className="text-xs text-muted-foreground">
                                    P: {item.protein_g}g | F: {item.fiber_g}g
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {scanResult.alternates?.length > 0 && (
                      <div>
                        <h4 className="text-blue-600 font-medium mb-2">🔄 Good Alternatives</h4>
                        <div className="space-y-2">
                          {scanResult.alternates.map((item, idx) => (
                            <div key={idx} className="p-3 border border-blue-200 rounded-lg bg-blue-50 cursor-pointer hover:bg-blue-100"
                                 onClick={() => handleRecommendationTap(item)}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary">{item.calories} kcal</Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {scanResult.avoid?.length > 0 && (
                      <div>
                        <h4 className="text-red-600 font-medium mb-2">❌ Avoid These</h4>
                        <div className="space-y-2">
                          {scanResult.avoid.map((item, idx) => (
                            <div key={idx} className="p-3 border border-red-200 rounded-lg bg-red-50">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant="destructive">{item.calories} kcal</Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {scanResult.assumptions?.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          <strong>Assumptions made:</strong> {scanResult.assumptions.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meal Photo Analyzer Tab */}
          <TabsContent value="photo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Meal Photo Analyzer</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Take a photo of your meal to get instant nutrition analysis and log it
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer">
                      <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-muted-foreground">
                        Click to take meal photo or upload existing image
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoAnalysis(e.target.files[0])}
                      />
                    </div>
                  </label>
                </div>

                {loading && (
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Analyzing your meal...</p>
                  </div>
                )}

                {photoAnalysis && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">What I detected in your meal:</h3>
                    
                    {photoAnalysis.guess?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-green-600 font-medium">🍽️ Food Items Detected</h4>
                        {photoAnalysis.guess.map((item, idx) => (
                          <div key={idx} className="p-4 border border-green-200 rounded-lg bg-green-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-600">
                                  Confidence: {(item.confidence * 100).toFixed(0)}%
                                </p>
                              </div>
                              <div className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleLogFood({ 
                                    food_id: item.food_id || item.name.toLowerCase().replace(' ', '-'),
                                    portion_qty: 1,
                                    portion_unit: 'serving'
                                  })}
                                >
                                  Log This Item
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {photoAnalysis.question && (
                      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                        <h4 className="text-blue-600 font-medium mb-2">❓ Quick Question</h4>
                        <p className="text-sm">{photoAnalysis.question}</p>
                      </div>
                    )}

                    {photoAnalysis.portion_hint && (
                      <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-600">
                          <strong>Portion estimate:</strong> {photoAnalysis.portion_hint}
                        </p>
                      </div>
                    )}

                    {photoAnalysis.on_confirm && (
                      <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                        <h4 className="text-purple-600 font-medium mb-2">📊 Estimated Nutrition</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Calories: <strong>{photoAnalysis.on_confirm.calories}</strong></div>
                          <div>Protein: <strong>{photoAnalysis.on_confirm.protein_g}g</strong></div>
                          <div>Carbs: <strong>{photoAnalysis.on_confirm.carb_g}g</strong></div>
                          <div>Fat: <strong>{photoAnalysis.on_confirm.fat_g}g</strong></div>
                        </div>
                        <Button 
                          className="mt-3 w-full"
                          onClick={() => handleLogFood({ 
                            food_id: 'analyzed-meal',
                            portion_qty: 1,
                            portion_unit: 'meal'
                          })}
                        >
                          Log Complete Meal ({photoAnalysis.on_confirm.calories} cal)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coach Chat Tab with Voice */}
          <TabsContent value="coach">
            <Card className="h-96 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Coach C</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your personal AI nutrition coach for Indian diet
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <div className="flex-1 overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-muted-foreground">
                      <p>👋 Hello! I'm Coach C, your nutrition coach.</p>
                      <p className="text-sm mt-1">Ask me: "What should I eat now?" or "How can I increase my protein?"</p>
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg max-w-xs ${
                        msg.role === 'user'
                          ? 'bg-green-500 text-white ml-auto'
                          : 'bg-white border mr-auto'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      {msg.role === 'assistant' && (
                        <CoachSpeaker text={msg.content} autoSpeak={getFeatureFlag('enable_tts')} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Voice Input Section */}
                <div className="space-y-2">
                  {getFeatureFlag('enable_stt') && (
                    <VoiceButton 
                      onTranscriptComplete={handleCoachChat}
                      className="w-full"
                    />
                  )}
                  
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCoachChat(currentMessage);
                    }}
                    className="flex space-x-2"
                  >
                    <Input
                      placeholder="Ask Coach C anything about nutrition..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      disabled={loading}
                    />
                    <Button type="submit" disabled={loading || !currentMessage.trim()}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Food History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {foodLogs.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Today's Meals</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadFoodLogs}
                      >
                        Refresh
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {foodLogs.map((log, idx) => (
                        <div key={idx} className="p-4 border rounded-lg bg-white">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{log.food_name}</p>
                              <p className="text-sm text-gray-600">
                                {log.portion} • {new Date(log.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">{log.calories} kcal</p>
                              <p className="text-xs text-gray-500">{log.protein_g}g protein</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Today's Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p>Total Calories: <strong>{foodLogs.reduce((sum, log) => sum + log.calories, 0)}</strong></p>
                        </div>
                        <div>
                          <p>Total Protein: <strong>{foodLogs.reduce((sum, log) => sum + log.protein_g, 0).toFixed(1)}g</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No food logged yet today.</p>
                    <p className="text-sm">Use Menu Scanner or Meal Photo to start logging your meals!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}