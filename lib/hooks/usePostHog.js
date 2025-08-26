'use client'

import { useEffect } from 'react';
import posthog from 'posthog-js';

let isInitialized = false;

export function usePostHog() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized && process.env.NEXT_PUBLIC_POSTHOG_API_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.debug();
          }
        },
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        bootstrap: {
          featureFlags: {
            'enable_vision_ocr': true,
            'enable_stt': true,
            'enable_tts': true,
            'portion_logic_v2': false
          }
        }
      });
      isInitialized = true;
    }
  }, []);

  const track = (eventName, properties = {}) => {
    if (!isInitialized) return;
    
    const sanitizedProps = sanitizeProperties(properties);
    posthog.capture(eventName, sanitizedProps);
  };

  const identify = (userId, properties = {}) => {
    if (!isInitialized) return;
    
    const sanitizedProps = sanitizeProperties(properties);
    posthog.identify(userId, sanitizedProps);
  };

  const getFeatureFlag = (flagName) => {
    if (!isInitialized) {
      // Return default values when PostHog not initialized
      const defaults = {
        'enable_vision_ocr': true,
        'enable_stt': true,
        'enable_tts': true,
        'portion_logic_v2': false
      };
      return defaults[flagName] || false;
    }
    return posthog.isFeatureEnabled(flagName);
  };

  const sanitizeProperties = (properties) => {
    const sanitized = { ...properties };
    const piiFields = ['email', 'name', 'phone', 'address', 'user_id'];
    
    piiFields.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });
    
    return sanitized;
  };

  return {
    track,
    identify,
    getFeatureFlag,
    posthog: isInitialized ? posthog : null
  };
}