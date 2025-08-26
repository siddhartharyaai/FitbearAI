'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, Utensils, MessageSquare, User, Scan, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function FitbearApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('login'); // login, verify, onboarding, app
  const [profile, setProfile] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  const [foodLogs, setFoodLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [mode, setMode] = useState('Demo'); // Demo | Production
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fqhffciiaztcycvvwrnd.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxaGZmY2lpYXp0Y3ljdnZ3cm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDA3MjMsImV4cCI6MjA3MTgxNjcyM30.uT540CzkZa-IhOCCgVCG-T2vWkZ1lhkwwyktlGGwVqU'
  );
  const { toast } = useToast();

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      // Check if profile exists
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setStep('app');
      } else {
        setStep('onboarding');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: true }
      });
      
      if (error) throw error;
      
      toast({
        title: "OTP Sent!",
        description: "Check your email for the verification code.",
      });
      setStep('verify');
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      
      if (error) throw error;
      
      await getProfile();
    } catch (error) {
      toast({
        title: "Error", 
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
      
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error?.message || 'Scan failed');
      
      setScanResult(result);
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
      
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error?.message || 'Coach error');
      
      const coachMessage = { role: 'assistant', content: result.reply };
      setChatMessages(prev => [...prev, coachMessage]);
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

  // Render login screen
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">Fitbear AI</CardTitle>
            <p className="text-sm text-muted-foreground">Your Indian Health & Nutrition Coach</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Get Started
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render OTP verification
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verify Email</CardTitle>
            <p className="text-sm text-muted-foreground">Enter the code sent to {email}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render onboarding (simplified for MVP)
  if (step === 'onboarding') {
    const completeOnboarding = async () => {
      setLoading(true);
      try {
        // Create basic profile
        const { error } = await supabase
          .from('profiles')
          .insert([{
            user_id: user.id,
            name: user.email?.split('@')[0] || 'User',
            height_cm: 165,
            weight_kg: 65,
            activity_level: 'moderate',
            veg_flag: true,
            locale: 'en'
          }]);
        
        if (error) throw error;
        
        await getProfile();
      } catch (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Welcome to Fitbear!</CardTitle>
            <p className="text-sm text-muted-foreground">Let's set up your profile</p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>For this demo, we'll use default settings.</p>
            <p className="text-sm text-muted-foreground">Full onboarding coming soon!</p>
            <Button onClick={completeOnboarding} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
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
          <Button
            variant="outline"
            onClick={() => supabase.auth.signOut()}
            size="sm"
          >
            <User className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

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

                {scanResult && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Recommendations for you:</h3>
                    
                    {scanResult.picks?.length > 0 && (
                      <div>
                        <h4 className="text-green-600 font-medium mb-2">✅ Top Picks</h4>
                        <div className="space-y-2">
                          {scanResult.picks.map((item, idx) => (
                            <div key={idx} className="p-3 border border-green-200 rounded-lg bg-green-50">
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
                            <div key={idx} className="p-3 border border-blue-200 rounded-lg bg-blue-50">
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

          {/* Coach Chat Tab */}
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
                    </div>
                  ))}
                </div>
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
                <div className="text-center text-muted-foreground py-8">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Food logging and history coming soon!</p>
                  <p className="text-sm">This will track your daily nutrition and progress.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}