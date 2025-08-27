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
import { useRouter } from 'next/navigation';

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
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { toast } = useToast();
  const { track, getFeatureFlag } = usePostHog();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Check for remembered email
    const savedEmail = localStorage.getItem('fitbear_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      getProfile();
    }
  }, [mounted, user]);

  // Safe JSON parsing for API responses
  const safeJson = async (response) => {
    try {
      const text = await response.text();
      if (!text.trim()) {
        throw new Error('Empty response');
      }
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
  };

  // Get current user and profile
  const getProfile = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        // Fetch profile from MongoDB API
        const response = await fetch(`/api/me/profile?user_id=${currentUser.id}`);
        if (response.ok) {
          const profileData = await safeJson(response);
          setProfile(profileData);
        } else if (response.status === 404) {
          // No profile found, show onboarding
          setStep('onboarding');
        }
      }
    } catch (error) {
      console.error('Error getting profile:', error);
    }
  };

  // Authentication functions
  const handleAuth = async (isSignUp = false) => {
    if (loading) return;

    // Validation
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Validation Error", 
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('fitbear_remember_email', email);
      } else {
        localStorage.removeItem('fitbear_remember_email');
      }

      // Track authentication
      track(isSignUp ? 'user_signed_up' : 'user_signed_in', {
        method: 'email_password',
        remembered: rememberMe
      });

      setUser(result.data.user);
      toast({
        title: isSignUp ? "Account Created" : "Welcome Back",
        description: isSignUp ? "Please check your email to verify your account" : "You've successfully signed in",
      });

    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions",
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

  // Menu scanning
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
        throw new Error(`Menu scan failed: ${errorText}`);
      }
      
      const result = await safeJson(response);
      setScanResult(result);
      
      // Track menu scan
      track('menu_scanned', {
        method: result.method || 'unknown',
        confidence: result.confidence || 0,
        items_detected: result.recommendations?.length || 0
      });
      
      toast({
        title: "Menu Scanned Successfully",
        description: `Found ${result.recommendations?.length || 0} food recommendations`,
      });
      
    } catch (error) {
      console.error('Menu scan error:', error);
      toast({
        title: "Scan Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Photo analysis
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
        throw new Error(`Photo analysis failed: ${errorText}`);
      }
      
      const result = await safeJson(response);
      setPhotoAnalysis(result);
      
      // Track photo analysis
      track('meal_photo_analyzed', {
        guesses: result.guess?.length || 0,
        confidence: result.guess?.[0]?.confidence || 0
      });
      
      toast({
        title: "Meal Analyzed",
        description: `Detected: ${result.guess?.[0]?.name || 'Unknown food'}`,
      });
      
    } catch (error) {
      console.error('Photo analysis error:', error);
      toast({
        title: "Analysis Error", 
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Chat with Coach C
  const handleSendMessage = async (message) => {
    if (!message.trim()) return;
    
    const userMessage = { role: 'user', content: message, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/coach/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          user_id: user?.id,
          profile: profile,
          recent_logs: foodLogs.slice(-3)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coach chat failed: ${errorText}`);
      }

      const result = await safeJson(response);
      const coachMessage = { 
        role: 'assistant', 
        content: result.response || result.message,
        timestamp: Date.now() 
      };
      
      setChatMessages(prev => [...prev, coachMessage]);
      
      // Track chat interaction
      track('coach_chat_sent', {
        message_length: message.length,
        response_length: (result.response || result.message || '').length,
        context_provided: !!(profile && foodLogs.length > 0)
      });
      
    } catch (error) {
      console.error('Coach chat error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I experienced an issue. Please try again.', 
        timestamp: Date.now(),
        error: true 
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Chat Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  // Auth screens
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-green-700">
              🐻 Fitbear AI
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Your Indian Nutrition Coach
            </p>
          </CardHeader>
          <CardContent>
            {step === 'signin' && (
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember" className="text-sm text-muted-foreground">
                    Remember me
                  </label>
                </div>
                <Button 
                  onClick={() => handleAuth(false)} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
                <div className="text-center space-y-2">
                  <Button
                    variant="link"
                    onClick={() => setStep('forgot')}
                    className="text-sm"
                  >
                    Forgot Password?
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Button
                      variant="link"
                      onClick={() => setStep('signup')}
                      className="p-0"
                    >
                      Sign up
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 'signup' && (
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember-signup"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember-signup" className="text-sm text-muted-foreground">
                    Remember me
                  </label>
                </div>
                <Button 
                  onClick={() => handleAuth(true)} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign Up
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Button
                    variant="link"
                    onClick={() => setStep('signin')}
                    className="p-0"
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            )}

            {step === 'forgot' && (
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleForgotPassword} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Reset Email
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  <Button
                    variant="link"
                    onClick={() => setStep('signin')}
                    className="p-0"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarding screen
  if (step === 'onboarding' || !profile) {
    return (
      <FullBPSOnboarding
        user={user}
        onComplete={async (profileData, targetData) => {
          setLoading(true);
          try {
            // Save profile
            const profileResponse = await fetch('/api/me/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, ...profileData })
            });

            if (!profileResponse.ok) {
              const errorText = await profileResponse.text();
              throw new Error(`Failed to save profile: ${profileResponse.status} - ${errorText}`);
            }

            // Save targets
            const targetResponse = await fetch('/api/me/targets', {
              method: 'PUT', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, ...targetData })
            });

            if (!targetResponse.ok) {
              const errorText = await targetResponse.text();
              throw new Error(`Failed to save targets: ${targetResponse.status} - ${errorText}`);
            }

            const savedProfile = await safeJson(profileResponse);
            const savedTargets = await safeJson(targetResponse);

            setProfile(savedProfile);
            setDailyTargets(savedTargets);
            setStep('app');
            
            // Track onboarding completion
            track('onboarding_completed', {
              profile_completeness: Object.keys(profileData).length,
              has_targets: !!targetData
            });

            toast({
              title: "Setup Complete!",
              description: "Your profile and targets have been saved",
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

  // Main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
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
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push('/profile')}
              size="sm"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
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

        {/* Mode Banner */}
        {mode === 'Demo' && (
          <Alert className="mb-4 border-orange-300 bg-orange-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Mode:</strong> Using sample data for demonstration. Switch to Production in Settings for live features.
            </AlertDescription>
          </Alert>
        )}

        {/* Daily Targets */}
        {dailyTargets && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Daily Targets</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{dailyTargets.calories || dailyTargets.budget_kcal}k</div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{dailyTargets.protein_g}g</div>
                  <div className="text-sm text-muted-foreground">Protein</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{dailyTargets.water_ml || dailyTargets.hydration_ml}ml</div>
                  <div className="text-sm text-muted-foreground">Water</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{dailyTargets.steps || dailyTargets.steps_target}</div>
                  <div className="text-sm text-muted-foreground">Steps</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="scan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scan" className="flex items-center space-x-2">
              <Scan className="w-4 h-4" />
              <span>Menu Scan</span>
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>Meal Photo</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Coach C</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          {/* Menu Scan Tab */}
          <TabsContent value="scan">
            <Card>
              <CardHeader>
                <CardTitle>Menu Scanner</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload a restaurant menu photo to get personalized recommendations
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMenuScan(e.target.files[0])}
                      className="hidden"
                      id="menu-upload"
                    />
                    <label htmlFor="menu-upload" className="cursor-pointer">
                      <Scan className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">Upload Menu Photo</p>
                      <p className="text-sm text-muted-foreground">Click to select image</p>
                    </label>
                  </div>

                  {scanResult && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h3 className="font-medium text-green-800 mb-2">Recommendations</h3>
                        {scanResult.recommendations?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2">
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <Badge className={`ml-2 ${
                                item.category === 'recommended' ? 'bg-green-100 text-green-800' :
                                item.category === 'alternate' ? 'bg-blue-100 text-blue-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.category}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meal Photo Tab */}
          <TabsContent value="photo">
            <Card>
              <CardHeader>
                <CardTitle>Meal Photo Analyzer</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Take a photo of your meal for nutrition analysis and logging
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoAnalysis(e.target.files[0])}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">Take/Upload Meal Photo</p>
                      <p className="text-sm text-muted-foreground">Click to capture or select</p>
                    </label>
                  </div>

                  {photoAnalysis && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-medium text-blue-800 mb-2">Meal Analysis</h3>
                        {photoAnalysis.guess?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2">
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <Badge className="ml-2 bg-gray-100 text-gray-800">
                                {Math.round(item.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <Button size="sm" onClick={() => {
                              // Log this food item
                              toast({
                                title: "Logged!",
                                description: `${item.name} added to your food log`,
                              });
                            }}>
                              Log it
                            </Button>
                          </div>
                        ))}
                        {photoAnalysis.nutrition && (
                          <div className="mt-4 p-3 bg-white rounded border">
                            <h4 className="font-medium mb-2">Estimated Nutrition</h4>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>Calories: {photoAnalysis.nutrition.calories}</div>
                              <div>Protein: {photoAnalysis.nutrition.protein}g</div>
                              <div>Carbs: {photoAnalysis.nutrition.carbs}g</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coach Chat Tab */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Coach C - Your AI Nutrition Coach</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ask questions about nutrition, recipes, and your health goals
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Chat Messages */}
                  <div className="h-96 overflow-y-auto space-y-4 p-4 border rounded-lg bg-gray-50">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Start a conversation with Coach C!</p>
                        <p className="text-sm">Try asking: "What should I eat for protein?"</p>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            msg.role === 'user' 
                              ? 'bg-green-500 text-white' 
                              : msg.error
                                ? 'bg-red-100 text-red-800'
                                : 'bg-white border'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            {msg.role === 'assistant' && !msg.error && (
                              <CoachSpeaker text={msg.content} />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white border rounded-lg px-4 py-2">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Coach C is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Ask Coach C anything about nutrition..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(currentMessage);
                        }
                      }}
                      disabled={loading}
                    />
                    <Button 
                      onClick={() => handleSendMessage(currentMessage)}
                      disabled={loading || !currentMessage.trim()}
                    >
                      Send
                    </Button>
                  </div>

                  {/* Voice Input */}
                  <VoiceButton 
                    onTranscriptComplete={(transcript) => {
                      setCurrentMessage(transcript);
                      handleSendMessage(transcript);
                    }}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Food & Activity History</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track your daily nutrition and progress
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {foodLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No food logs yet</p>
                      <p className="text-sm">Use Menu Scan or Meal Photo to start logging!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {foodLogs.map((log, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{log.food_name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {log.portion} • {log.calories} cal
                            </span>
                          </div>
                          <Badge variant="outline">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}