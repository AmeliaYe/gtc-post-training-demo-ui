'use client';

import { useEffect, useRef, useState } from 'react';

// Standalone inference UI (see ui/README.md). Override per booth with NEXT_PUBLIC_HEALTHCARE_LIVE_URL.
const LIVE_DEMO_URL = process.env.NEXT_PUBLIC_HEALTHCARE_LIVE_URL || 'http://127.0.0.1:4193';
// embed=1 hides the standalone header and patient follow-up panel.
const liveEmbedUrl = (() => {
  try {
    const url = new URL(LIVE_DEMO_URL);
    url.searchParams.set('embed', '1');
    return url.toString();
  } catch {
    return LIVE_DEMO_URL;
  }
})();

type View = 'recorded' | 'live';

export default function HealthcareDemo() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [view, setView] = useState<View>('recorded');
  const [height, setHeight] = useState(900);

  useEffect(() => {
    const resize = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (data?.type !== 'healthcare-demo:resize' || !Number.isFinite(data.height)) return;
      setHeight(Math.max(600, Math.min(12000, data.height)));
    };
    window.addEventListener('message', resize);
    return () => window.removeEventListener('message', resize);
  }, []);

  return <>
    <div className="healthcare-view-switch" role="group" aria-label="Healthcare demo view">
      <button aria-pressed={view === 'recorded'} onClick={() => setView('recorded')}>Cached</button>
      <button aria-pressed={view === 'live'} onClick={() => setView('live')}>Live demo</button>
    </div>
    {view === 'recorded'
      ? <iframe
        ref={frame}
        className="healthcare-frame"
        src="/healthcare/r02/healthcare/index.html?embed=1#how-it-learns"
        title="Healthcare post-training: How It Learns, Before & After, Results, Getting Started"
        style={{ height }}
        allowFullScreen
      />
      : <iframe
        className="healthcare-frame healthcare-live-frame"
        src={liveEmbedUrl}
        title="Healthcare live inference: baseline vs. checkpoint"
        allow="clipboard-read; clipboard-write"
      />}
  </>;
}
