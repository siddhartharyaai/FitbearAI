'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useToast } from '@/components/ui/use-toast';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.push('/');
        return;
      }
      
      setUser(currentUser);
      
      // Load profile data
      const response = await fetch(`/api/me?user_id=${currentUser.id}`);
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        setEditedProfile(profileData);
      } else {
        console.error('Failed to load profile');
        setProfile({});
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile({});
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          ...editedProfile 
        })
      });
      
      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to update profile: ${errorText}`);
      }
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-900 flex-1">My Profile</h1>
          
          {!editing ? (
            <Button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                className="flex items-center gap-2"
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                {editing ? (
                  <Input
                    value={editedProfile.name || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="text-lg font-medium">{profile?.name || '—'}</div>
                )}
              </div>
              
              <div>
                <Label>Gender</Label>
                {editing ? (
                  <Select 
                    value={editedProfile.gender || ''} 
                    onValueChange={(value) => setEditedProfile({...editedProfile, gender: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-lg">{profile?.gender || '—'}</div>
                )}
              </div>
            </div>

            {/* Physical Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Height (cm)</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedProfile.height_cm || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, height_cm: parseInt(e.target.value) || ''})}
                    placeholder="170"
                  />
                ) : (
                  <div className="text-lg">{profile?.height_cm ? `${profile.height_cm} cm` : '—'}</div>
                )}
              </div>
              
              <div>
                <Label>Weight (kg)</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedProfile.weight_kg || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, weight_kg: parseFloat(e.target.value) || ''})}
                    placeholder="70"
                  />
                ) : (
                  <div className="text-lg">{profile?.weight_kg ? `${profile.weight_kg} kg` : '—'}</div>
                )}
              </div>
              
              <div>
                <Label>Waist (cm)</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedProfile.waist_cm || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, waist_cm: parseInt(e.target.value) || ''})}
                    placeholder="80"
                  />
                ) : (
                  <div className="text-lg">{profile?.waist_cm ? `${profile.waist_cm} cm` : '—'}</div>
                )}
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <Label>Activity Level</Label>
              {editing ? (
                <Select 
                  value={editedProfile.activity_level || ''} 
                  onValueChange={(value) => setEditedProfile({...editedProfile, activity_level: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
                    <SelectItem value="light">Light (1-3 days/week)</SelectItem>
                    <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                    <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                    <SelectItem value="very_active">Very Active (2x/day)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-lg capitalize">{profile?.activity_level?.replace('_', ' ') || '—'}</div>
              )}
            </div>

            {/* Dietary Preferences */}
            <div>
              <Label>Dietary Preferences</Label>
              {editing ? (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="veg"
                      checked={editedProfile.veg_flag || false}
                      onCheckedChange={(checked) => setEditedProfile({...editedProfile, veg_flag: checked})}
                    />
                    <label htmlFor="veg">Vegetarian</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="jain"
                      checked={editedProfile.jain_flag || false}
                      onCheckedChange={(checked) => setEditedProfile({...editedProfile, jain_flag: checked})}
                    />
                    <label htmlFor="jain">Jain</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="halal"
                      checked={editedProfile.halal_flag || false}
                      onCheckedChange={(checked) => setEditedProfile({...editedProfile, halal_flag: checked})}
                    />
                    <label htmlFor="halal">Halal</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="eggetarian"
                      checked={editedProfile.eggetarian_flag || false}
                      onCheckedChange={(checked) => setEditedProfile({...editedProfile, eggetarian_flag: checked})}
                    />
                    <label htmlFor="eggetarian">Eggetarian</label>
                  </div>
                </div>
              ) : (
                <div className="text-lg">
                  {[
                    profile?.veg_flag && "Vegetarian",
                    profile?.jain_flag && "Jain",
                    profile?.halal_flag && "Halal",
                    profile?.eggetarian_flag && "Eggetarian"
                  ].filter(Boolean).join(", ") || "None specified"}
                </div>
              )}
            </div>

            {/* Last Updated */}
            {profile?.updated_at && (
              <div>
                <Label>Last Updated</Label>
                <div className="text-sm text-gray-500">
                  {new Date(profile.updated_at).toLocaleString()}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}