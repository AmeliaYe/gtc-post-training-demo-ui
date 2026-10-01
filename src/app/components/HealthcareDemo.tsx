'use client';

import { useEffect, useRef, useState } from 'react';

export default function HealthcareDemo() {
  const frame = useRef<HTMLIFrameElement>(null);
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

  return <iframe
    ref={frame}
    className="healthcare-frame"
    src="/healthcare/r01/index.html#how-it-learns"
    title="Healthcare post-training: How It Learns, Before & After, Results, Get Started"
    style={{ height }}
    allowFullScreen
  />;
}
