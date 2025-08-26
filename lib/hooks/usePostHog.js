'use client'

import { useEffect } from 'react';
import posthog from 'posthog-js';

let isInitialized = false;

export function usePostHog() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY || '', {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.debug();
          }
        },
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true, // Privacy-first approach
      });
      isInitialized = true;
    }
  }, []);

  const track = (eventName, properties = {}) => {
    // Remove any PII before tracking
    const sanitizedProps = sanitizeProperties(properties);
    posthog.capture(eventName, sanitizedProps);
  };

  const identify = (userId, properties = {}) => {
    // Only track non-PII user properties
    const sanitizedProps = sanitizeProperties(properties);
    posthog.identify(userId, sanitizedProps);
  };

  const getFeatureFlag = (flagName) => {
    return posthog.isFeatureEnabled(flagName);
  };

  const sanitizeProperties = (properties) => {
    // Remove any potential PII
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