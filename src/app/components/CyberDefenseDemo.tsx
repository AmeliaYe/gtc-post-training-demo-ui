'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import localFont from 'next/font/local';
import {
  ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowPathIcon, ArrowRightIcon,
  ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon,
} from '@heroicons/react/24/outline';
import { CYBER_SCENARIOS } from '@/lib/cyber-fixture';
import { CyberInvestigation } from './CyberInvestigation';
import { CyberTrainingResults } from './CyberTrainingResults';
import { CyberFindings } from './CyberFindings';
import styles from './CyberDefenseDemo.module.css';

const SCENARIO = CYBER_SCENARIOS.find((scenario) => scenario.id === 'openfire')!;
const inter = localFont({
  src: '../../../public/cyber/inter-latin-variable.woff2',
  display: 'swap',
  variable: '--font-cyber-inter',
  weight: '100 900',
});
const STEPS = [
  { title: 'Exploring your codebase' },
  { title: 'Producing the threat model & findings', detail: 'Server-side request forgery (SSRF): user input directs a request made by the server.' },
  { title: 'Trace untrusted input' },
  { title: 'Trace URL construction' },
  { title: 'Inspect the network sink' },
  { title: 'Confirm the endpoint mapping' },
  { title: 'Reviewing the submitted findings', detail: 'Select a report to inspect the evidence behind it.' },
  { title: 'Scoring the verified findings', detail: 'One reference match in this recorded evaluation. RL rewards successful vulnerability detection.' },
  { title: 'Compare checkpoint results', detail: 'Both checkpoints inspected FaviconServlet.java. Only the final checkpoint reported its SSRF vulnerability.' },
];
const STEP_SECONDS = 12;
const DEMO_SECONDS = STEPS.length * STEP_SECONDS;

export function CyberDefenseDemo({ onExit }: { onExit?: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [presentationMessage, setPresentationMessage] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const step = Math.min(Math.floor(elapsed / STEP_SECONDS), STEPS.length - 1);
  const current = STEPS[step];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(elapsed + 1, DEMO_SECONDS);
      setElapsed(next);
      if (next === DEMO_SECONDS) setPlaying(false);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [elapsed, playing]);

  useEffect(() => {
    window.scrollTo(0, 0);
    container.current?.focus({ preventScroll: true });
    function pauseWhenHidden() {
      if (document.hidden) setPlaying(false);
    }
    function pauseForReducedMotion(event: MediaQueryListEvent) {
      if (event.matches) setPlaying(false);
    }
    function updateFullscreen() {
      setFullscreen(document.fullscreenElement === container.current);
    }
    function pauseForDetails(event: Event) {
      if (event.target instanceof HTMLDetailsElement && event.target.open) setPlaying(false);
    }
    const root = container.current;
    root?.addEventListener('toggle', pauseForDetails, true);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.addEventListener('visibilitychange', pauseWhenHidden);
    document.addEventListener('fullscreenchange', updateFullscreen);
    preference.addEventListener('change', pauseForReducedMotion);
    return () => {
      root?.removeEventListener('toggle', pauseForDetails, true);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      document.removeEventListener('fullscreenchange', updateFullscreen);
      preference.removeEventListener('change', pauseForReducedMotion);
    };
  }, []);

  function navigate(next: number) {
    setPlaying(false);
    setElapsed(Math.max(0, Math.min(STEPS.length - 1, next)) * STEP_SECONDS);
  }

  function play() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(step === STEPS.length - 1 ? 0 : step + 1);
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (elapsed >= DEMO_SECONDS) setElapsed(0);
    setPlaying(true);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === container.current) await document.exitFullscreen();
      else await container.current?.requestFullscreen();
      setPresentationMessage('');
    } catch {
      setPresentationMessage('Fullscreen is unavailable here. Expand the browser window to present.');
    }
  }

  return (
    <div ref={container} className={`${styles.demo} ${inter.variable}`} role="region" aria-label="Openfire security review demo" tabIndex={-1}>
      <header className={styles.header}>
        <div className={styles.headerAction}>{onExit && <button onClick={onExit} aria-label="Back to all demos" title="All demos"><ChevronLeftIcon aria-hidden="true" /></button>}</div>
        <div className={styles.brand}><span>Nemotron post-trained by</span><Image src="/cyber/depthfirst.svg" alt="depthfirst" width={205} height={34} loading="eager" /></div>
        <div className={styles.headerAction}><button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} title={fullscreen ? 'Exit full screen' : 'Full screen'}>{fullscreen ? <ArrowsPointingInIcon aria-hidden="true" /> : <ArrowsPointingOutIcon aria-hidden="true" />}</button></div>
      </header>
      <section className={styles.presentation} aria-labelledby={titleId}>
        <div className={styles.topline}>
          <span>Openfire <span className={styles.repoDescription}>/ Java messaging server</span></span>
          <input className={styles.timeline} type="range" aria-label="Investigation timeline" aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${current.title}`} min={0} max={STEPS.length - 1} value={step} onChange={(event) => navigate(Number(event.target.value))} style={{ background: `linear-gradient(to right, #2870ff ${(step + 1) / STEPS.length * 100}%, #dddde3 ${(step + 1) / STEPS.length * 100}%)` }} />
          <span className={styles.replayNote}>Recorded replay · {DEMO_SECONDS} seconds</span>
        </div>
        <div className={`${styles.scene} ${step === 1 ? styles.wideScene : ''}`}>
          {step < 6 ? <CyberInvestigation step={step} playing={playing} progress={(elapsed % STEP_SECONDS) / STEP_SECONDS} onInteract={() => setPlaying(false)} /> : step < 8 ? <CyberFindings key={step} showFeedback={step === 7} onInteract={() => setPlaying(false)} /> : <CyberTrainingResults scenario={SCENARIO} />}
        </div>
        <footer className={styles.navigation} aria-label="Investigation playback">
          <button className={styles.arrow} disabled={step === 0} onClick={() => navigate(step - 1)} aria-label="Previous step" title="Previous step"><ChevronLeftIcon aria-hidden="true" /></button>
          <div className={styles.caption}>
            <h1 id={titleId}>{current.title}</h1>
            {current.detail && <p>{current.detail}</p>}
            <button className={styles.play} onClick={play}>
              <span className={styles.autoplayLabel}>{playing ? <PauseIcon aria-hidden="true" /> : elapsed >= DEMO_SECONDS ? <ArrowPathIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}{playing ? 'Pause' : elapsed >= DEMO_SECONDS ? 'Replay investigation' : elapsed === 0 ? 'Play investigation' : 'Resume'}</span>
              <span className={styles.manualLabel}>{step === STEPS.length - 1 ? <ArrowPathIcon aria-hidden="true" /> : <ArrowRightIcon aria-hidden="true" />}{step === STEPS.length - 1 ? 'Start over' : 'Next step'}</span>
            </button>
          </div>
          <button className={styles.arrow} disabled={step === STEPS.length - 1} onClick={() => navigate(step + 1)} aria-label="Next step" title="Next step"><ChevronRightIcon aria-hidden="true" /></button>
        </footer>
        <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">Step {step + 1} of {STEPS.length}: {current.title}.</span>
        {presentationMessage && <p className={styles.presentationMessage} role="status">{presentationMessage}</p>}
      </section>
    </div>
  );
}
