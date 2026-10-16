'use client';

import { useEffect } from 'react';
import {
  type AnalyticsSurface,
  getAnalyticsSessionId,
  getInteractionSummary,
  initializeAnalytics,
  subscribeToAnalyticsSurface,
  track,
} from '@/lib/analytics';

const IDLE_AFTER_MS = 60_000;
const HEARTBEAT_EVERY_MS = 15_000;

type SurfaceVisit = {
  activeMs: number;
  heartbeatAt: number;
  id: string;
  startedAt: number;
  surface: AnalyticsSurface;
};

export default function AnalyticsTracker() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin/')) return;

    // Deferring setup prevents React Strict Mode's development-only effect replay
    // from creating two analytics sessions on booth machines running `next dev`.
    let stopTracking: (() => void) | undefined;
    const startTimer = window.setTimeout(() => {
      if (!initializeAnalytics()) return;

      const sessionId = getAnalyticsSessionId();
      if (!sessionId) return;

      const startedAt = Date.now();
      let activeMs = 0;
      let lastTick = performance.now();
      let lastActivity = performance.now();
      let lastHeartbeatAt = 0;
      let surfaceVisit: SurfaceVisit | null = null;
      let finished = false;

      track('demo_viewed');

      const noteActivity = () => {
        lastActivity = performance.now();
      };

      const updateActiveTime = () => {
        const now = performance.now();
        const elapsed = Math.min(now - lastTick, 2_000);
        const active = document.visibilityState === 'visible' && document.hasFocus() && now - lastActivity < IDLE_AFTER_MS;

        if (active) {
          activeMs += elapsed;
          if (surfaceVisit) surfaceVisit.activeMs += elapsed;
        }
        lastTick = now;

        if (activeMs - lastHeartbeatAt >= HEARTBEAT_EVERY_MS) {
          lastHeartbeatAt = activeMs;
          track('demo_active_heartbeat', {
            active_seconds_total: Math.round(activeMs / 1000),
          });
        }

        if (surfaceVisit && surfaceVisit.activeMs - surfaceVisit.heartbeatAt >= HEARTBEAT_EVERY_MS) {
          surfaceVisit.heartbeatAt = surfaceVisit.activeMs;
          track('demo_surface_heartbeat', {
            surface: surfaceVisit.surface,
            surface_view_id: surfaceVisit.id,
            active_seconds_total: Math.round(surfaceVisit.activeMs / 1000),
          });
        }
      };

      const finishSurfaceVisit = () => {
        if (!surfaceVisit) return;
        const visit = surfaceVisit;
        surfaceVisit = null;
        track('demo_surface_summary', {
          surface: visit.surface,
          surface_view_id: visit.id,
          active_seconds_total: Math.round(visit.activeMs / 1000),
          elapsed_seconds: Math.round((Date.now() - visit.startedAt) / 1000),
          qualified_view: visit.activeMs >= 5_000,
        });
      };

      const startSurfaceVisit = (surface: AnalyticsSurface) => {
        updateActiveTime();
        finishSurfaceVisit();
        lastTick = performance.now();
        surfaceVisit = {
          activeMs: 0,
          heartbeatAt: 0,
          id: crypto.randomUUID(),
          startedAt: Date.now(),
          surface,
        };
        track('demo_surface_viewed', {
          surface,
          surface_view_id: surfaceVisit.id,
        });
      };

      const finishSession = () => {
        if (finished) return;
        finished = true;
        updateActiveTime();
        finishSurfaceVisit();
        const { interactionCount, rapidSwitchCount } = getInteractionSummary();

        track('demo_session_summary', {
          active_seconds_total: Math.round(activeMs / 1000),
          elapsed_seconds: Math.round((Date.now() - startedAt) / 1000),
          interaction_count: interactionCount,
          rapid_switch_count: rapidSwitchCount,
          engaged: activeMs >= 30_000 && interactionCount > 0,
        });
      };

      const unsubscribeFromSurface = subscribeToAnalyticsSurface(startSurfaceVisit);
      const timer = window.setInterval(updateActiveTime, 1_000);
      window.addEventListener('pointerdown', noteActivity, { passive: true });
      window.addEventListener('keydown', noteActivity);
      window.addEventListener('focus', noteActivity);
      window.addEventListener('pagehide', finishSession);

      stopTracking = () => {
        window.clearInterval(timer);
        window.removeEventListener('pointerdown', noteActivity);
        window.removeEventListener('keydown', noteActivity);
        window.removeEventListener('focus', noteActivity);
        window.removeEventListener('pagehide', finishSession);
        unsubscribeFromSurface();
        finishSession();
      };
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      stopTracking?.();
    };
  }, []);

  return null;
}
