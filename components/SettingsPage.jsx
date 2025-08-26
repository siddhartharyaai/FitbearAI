'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Download, Trash2, Shield, Flag, Globe } from 'lucide-react';
import { usePostHog } from '@/lib/hooks/usePostHog';
import { useToast } from '@/components/ui/use-toast';

export function SettingsPage({ profile, onUpdateProfile, onBack, mode, onModeChange }) {
  const [language, setLanguage] = useState(profile?.locale || 'en');
  const [dietaryFlags, setDietaryFlags] = useState({
    veg_flag: profile?.veg_flag || false,
    jain_flag: profile?.jain_flag || false,
    halal_flag: profile?.halal_flag || false,
    eggetarian_flag: profile?.eggetarian_flag || false
  });
  const [featureFlags, setFeatureFlags] = useState({
    enable_vision_ocr: true,
    enable_stt: true,
    enable_tts: true,
    portion_logic_v2: false
  });
  
  const { track, getFeatureFlag } = usePostHog();
  const { toast } = useToast();

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    onUpdateProfile({ ...profile, locale: newLang });
    track('language_set', { language: newLang });
    toast({
      title: "Language Updated",
      description: `Language changed to ${newLang === 'en' ? 'English' : 'Hinglish'}`,
    });
  };

  const handleDietaryFlagChange = (flag, value) => {
    const newFlags = { ...dietaryFlags, [flag]: value };
    setDietaryFlags(newFlags);
    onUpdateProfile({ ...profile, ...newFlags });
    toast({
      title: "Dietary Preferences Updated",
      description: "Your food preferences have been saved",
    });
  };

  const handleExportData = async () => {
    try {
      // Collect user data (no secrets/PII beyond what user entered)
      const exportData = {
        profile: {
          name: profile?.name,
          height_cm: profile?.height_cm,
          weight_kg: profile?.weight_kg,
          dietary_preferences: dietaryFlags,
          locale: language
        },
        targets: await fetch('/api/me/targets').then(async r => {
          if (!r.ok) return {};
          const text = await r.text();
          try { return JSON.parse(text); } catch { return {}; }
        }).catch(() => ({})),
        food_logs: await fetch('/api/logs').then(async r => {
          if (!r.ok) return [];
          const text = await r.text();
          try { return JSON.parse(text); } catch { return []; }
        }).catch(() => []),
        exported_at: new Date().toISOString()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `fitbear-data-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      track('data_exported', { 
        export_date: new Date().toISOString(),
        data_size: dataStr.length
      });

      toast({
        title: "Data Exported",
        description: "Your data has been downloaded as a JSON file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      // In production, this would call a real delete API
      const response = await fetch('/api/me/delete', { method: 'DELETE' });
      
      if (mode === 'Production') {
        if (!response.ok) {
          throw new Error('Account deletion failed');
        }
      }

      track('account_deleted', { 
        deletion_date: new Date().toISOString() 
      });

      toast({
        title: "Account Deleted",
        description: mode === 'Demo' ? "Demo account deletion simulated" : "Your account has been permanently deleted",
      });

      // In demo mode, just show success
      // In production, would redirect to login
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Settings</h2>
        <Button variant="outline" onClick={onBack}>
          Back to App
        </Button>
      </div>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Language & Localization</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="language">Preferred Language</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hinglish</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dietary Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="veg">Vegetarian</Label>
            <Switch
              id="veg"
              checked={dietaryFlags.veg_flag}
              onCheckedChange={(value) => handleDietaryFlagChange('veg_flag', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="jain">Jain (No root vegetables)</Label>
            <Switch
              id="jain"
              checked={dietaryFlags.jain_flag}
              onCheckedChange={(value) => handleDietaryFlagChange('jain_flag', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="halal">Halal</Label>
            <Switch
              id="halal"
              checked={dietaryFlags.halal_flag}
              onCheckedChange={(value) => handleDietaryFlagChange('halal_flag', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="eggetarian">Eggetarian</Label>
            <Switch
              id="eggetarian"
              checked={dietaryFlags.eggetarian_flag}
              onCheckedChange={(value) => handleDietaryFlagChange('eggetarian_flag', value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Flag className="w-5 h-5" />
            <span>Feature Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="vision_ocr">Gemini Vision OCR</Label>
              <p className="text-sm text-muted-foreground">Use AI-powered OCR for menu scanning</p>
            </div>
            <Switch
              id="vision_ocr"
              checked={featureFlags.enable_vision_ocr}
              onCheckedChange={(value) => setFeatureFlags(prev => ({ ...prev, enable_vision_ocr: value }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="voice_input">Voice Input</Label>
              <p className="text-sm text-muted-foreground">Enable push-to-talk for Coach C</p>
            </div>
            <Switch
              id="voice_input"
              checked={featureFlags.enable_stt}
              onCheckedChange={(value) => setFeatureFlags(prev => ({ ...prev, enable_stt: value }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="voice_output">Voice Output</Label>
              <p className="text-sm text-muted-foreground">Enable text-to-speech responses</p>
            </div>
            <Switch
              id="voice_output"
              checked={featureFlags.enable_tts}
              onCheckedChange={(value) => setFeatureFlags(prev => ({ ...prev, enable_tts: value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mode Control */}
      <Card>
        <CardHeader>
          <CardTitle>App Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Current Mode: {mode}</Label>
              <p className="text-sm text-muted-foreground">
                {mode === 'Demo' ? 'Using sample data for demonstration' : 'Production mode with live data'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onModeChange(mode === 'Demo' ? 'Production' : 'Demo')}
            >
              Switch to {mode === 'Demo' ? 'Production' : 'Demo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Privacy & Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Export Your Data</Label>
              <p className="text-sm text-muted-foreground">Download all your data as a JSON file</p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Delete Account</Label>
              <p className="text-sm text-muted-foreground text-red-600">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {mode === 'Production' && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You are in Production mode. All actions affect real data. Mock endpoints are disabled.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}