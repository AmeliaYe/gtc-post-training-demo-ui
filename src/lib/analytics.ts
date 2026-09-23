'use client';

import posthog from 'posthog-js';

type EventProperties = Record<string, boolean | number | string | null | undefined>;

let initialized = false;
let interactionCount = 0;
let rapidSwitchCount = 0;
let lastSelectionAt = 0;
let lastSelectionId: string | null = null;

export function initializeAnalytics() {
  if (initialized || typeof window === 'undefined') return initialized;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key === 'phc_replace_me') return false;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage',
  });

  posthog.register({
    app_name: 'gtc-post-training-demo-ui',
    demo_station_id: process.env.NEXT_PUBLIC_DEMO_STATION_ID || 'unassigned',
  });

  initialized = true;
  return true;
}

export function track(event: string, properties: EventProperties = {}) {
  if (!initialized) return;
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

export function getInteractionSummary() {
  return { interactionCount, rapidSwitchCount };
}
