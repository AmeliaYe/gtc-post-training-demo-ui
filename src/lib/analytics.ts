'use client';

import posthog from 'posthog-js';

type EventProperties = Record<string, boolean | number | string | null | undefined>;
export type AnalyticsSurface = 'landing' | 'gallery' | 'resources' | 'computer' | 'health' | 'bio' | 'cyber' | 'defense';

let initialized = false;
let ready = false;
let interactionCount = 0;
let rapidSwitchCount = 0;
let lastSelectionAt = 0;
let lastSelectionId: string | null = null;
let sessionId: string | null = null;
let currentSurface: AnalyticsSurface | null = null;
const surfaceListeners = new Set<(surface: AnalyticsSurface) => void>();
const pendingEvents: Array<{ event: string; properties: EventProperties }> = [];

export function initializeAnalytics() {
  if (initialized || typeof window === 'undefined') return initialized;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key === 'phc_replace_me') return false;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    loaded: () => {
      ready = true;
      pendingEvents.splice(0).forEach(({ event, properties }) => posthog.capture(event, properties));
    },
    person_profiles: 'identified_only',
    persistence: 'localStorage',
  });

  sessionId = crypto.randomUUID();
  posthog.register({
    app_name: 'gtc-post-training-demo-ui',
    demo_session_id: sessionId,
    demo_station_id: process.env.NEXT_PUBLIC_DEMO_STATION_ID || 'unassigned',
  });

  initialized = true;
  return true;
}

export function track(event: string, properties: EventProperties = {}) {
  if (!initialized) return;
  if (!ready) {
    pendingEvents.push({ event, properties });
    return;
  }
  posthog.capture(event, properties);
}

export function trackInteraction(event: string, properties: EventProperties = {}) {
  interactionCount += 1;
  track(event, properties);
}

export function trackUseCaseSelection(useCase: string, source: 'gallery' | 'dock') {
  const now = Date.now();
  const rapidSwitch = lastSelectionId !== null && lastSelectionId !== useCase && now - lastSelectionAt < 900;

  if (rapidSwitch) rapidSwitchCount += 1;
  lastSelectionAt = now;
  lastSelectionId = useCase;

  trackInteraction('use_case_selected', {
    use_case: useCase,
    source,
    rapid_switch: rapidSwitch,
  });
}

export function getAnalyticsSessionId() {
  return sessionId;
}

export function setAnalyticsSurface(surface: AnalyticsSurface) {
  if (surface === currentSurface) return;
  currentSurface = surface;
  surfaceListeners.forEach((listener) => listener(surface));
}

export function subscribeToAnalyticsSurface(listener: (surface: AnalyticsSurface) => void) {
  surfaceListeners.add(listener);
  if (currentSurface) listener(currentSurface);
  return () => surfaceListeners.delete(listener);
}

export function getInteractionSummary() {
  return { interactionCount, rapidSwitchCount };
}
