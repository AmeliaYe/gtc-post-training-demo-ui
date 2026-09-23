'use client';

import { useEffect } from 'react';
import { getInteractionSummary, initializeAnalytics, track } from '@/lib/analytics';

const IDLE_AFTER_MS = 60_000;
const HEARTBEAT_EVERY_MS = 15_000;

export default function AnalyticsTracker() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin/')) return;
    if (!initializeAnalytics()) return;

    const sessionId = crypto.randomUUID();
    const startedAt = Date.now();
    let activeMs = 0;
    let lastTick = performance.now();
    let lastActivity = performance.now();
    let lastHeartbeatAt = 0;
    let finished = false;

    track('demo_viewed', { demo_session_id: sessionId });

    const noteActivity = () => {
      lastActivity = performance.now();
    };

    const updateActiveTime = () => {
      const now = performance.now();
      const elapsed = Math.min(now - lastTick, 2_000);
      const active = document.visibilityState === 'visible' && document.hasFocus() && now - lastActivity < IDLE_AFTER_MS;

      if (active) activeMs += elapsed;
      lastTick = now;

      if (activeMs - lastHeartbeatAt >= HEARTBEAT_EVERY_MS) {
        lastHeartbeatAt = activeMs;
        track('demo_active_heartbeat', {
          demo_session_id: sessionId,
          active_seconds_total: Math.round(activeMs / 1000),
        });
      }
    };

    const finishSession = () => {
      if (finished) return;
      finished = true;
      updateActiveTime();
      const { interactionCount, rapidSwitchCount } = getInteractionSummary();

      track('demo_session_summary', {
        demo_session_id: sessionId,
        active_seconds_total: Math.round(activeMs / 1000),
        elapsed_seconds: Math.round((Date.now() - startedAt) / 1000),
        interaction_count: interactionCount,
        rapid_switch_count: rapidSwitchCount,
        engaged: activeMs >= 30_000 && interactionCount > 0,
      });
    };

    const timer = window.setInterval(updateActiveTime, 1_000);
    window.addEventListener('pointerdown', noteActivity, { passive: true });
    window.addEventListener('keydown', noteActivity);
    window.addEventListener('focus', noteActivity);
    window.addEventListener('pagehide', finishSession);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', noteActivity);
      window.removeEventListener('keydown', noteActivity);
      window.removeEventListener('focus', noteActivity);
      window.removeEventListener('pagehide', finishSession);
      finishSession();
    };
  }, []);

  return null;
}
