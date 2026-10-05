/**
 * ===================================================================================
 * HARDWARE TIER DETECTION MODULE (useDeviceHardware.ts)
 * ===================================================================================
 * 
 * Classifies mobile and desktop devices into hardware performance tiers:
 * - 'Low' (RAM <= 2GB or CPU cores <= 2)
 * - 'Medium' (RAM <= 4GB, CPU cores <= 4, or standard mobile iOS Safari)
 * - 'High' (RAM > 4GB and CPU cores > 4)
 * 
 * Safely handles iOS Safari & non-Chromium browsers where navigator.deviceMemory is undefined.
 */

import { useState, useEffect } from 'react';

export type DeviceTier = 'Low' | 'Medium' | 'High';

export interface HardwareProfile {
  tier: DeviceTier;
  cores: number;
  memoryGB: number | null;
  isMobile: boolean;
  isLowOrMedium: boolean;
  minStopZoom: number; // 15.5 for Low/Medium, 14.0 for High
  preferCanvasStops: boolean;
}

/**
 * Pure evaluation function (can be used in Vue, React, or Vanilla JS)
 */
export function detectDeviceHardware(): HardwareProfile {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      tier: 'High',
      cores: 8,
      memoryGB: 8,
      isMobile: false,
      isLowOrMedium: false,
      minStopZoom: 14.0,
      preferCanvasStops: false,
    };
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (typeof window !== 'undefined' && window.innerWidth <= 768);

  const cores = navigator.hardwareConcurrency || 4;
  const memoryGB = (navigator as any).deviceMemory || null;

  let tier: DeviceTier = 'Medium';

  // 1. Devices with explicit deviceMemory API (Chromium / Android)
  if (typeof memoryGB === 'number') {
    if (memoryGB <= 2 || cores <= 2) {
      tier = 'Low';
    } else if (memoryGB <= 4 || cores <= 4) {
      tier = 'Medium';
    } else {
      tier = 'High';
    }
  } 
  // 2. Safe Fallback for iOS Safari & Firefox
  else {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      // Older iPhones (SE, 8, X) typically report 2-4 cores
      if (cores <= 2) {
        tier = 'Low';
      } else if (cores <= 4) {
        tier = 'Medium';
      } else {
        tier = 'High';
      }
    } else {
      // General non-Chromium fallback based on cores & screen resolution
      const isSmallScreen = window.innerWidth * window.innerHeight < 600000;
      if (cores <= 2 || (isMobile && isSmallScreen)) {
        tier = 'Low';
      } else if (cores <= 4) {
        tier = 'Medium';
      } else {
        tier = 'High';
      }
    }
  }

  const isLowOrMedium = tier === 'Low' || tier === 'Medium';

  return {
    tier,
    cores,
    memoryGB,
    isMobile,
    isLowOrMedium,
    minStopZoom: isLowOrMedium ? 15.0 : 14.0,
    preferCanvasStops: isLowOrMedium,
  };
}

/**
 * React Hook implementation
 */
export function useDeviceHardware(): HardwareProfile {
  const [profile, setProfile] = useState<HardwareProfile>(detectDeviceHardware);

  useEffect(() => {
    setProfile(detectDeviceHardware());
  }, []);

  return profile;
}
