'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowPathIcon, ArrowRightIcon,
  ChevronLeftIcon, PauseIcon, PlayIcon,
} from '@heroicons/react/24/outline';
import { CYBER_SCENARIOS } from '@/lib/cyber-fixture';
import { CyberInvestigation } from './CyberInvestigation';
import { CyberTrainingResults } from './CyberTrainingResults';
import styles from './CyberDefenseDemo.module.css';

const SCENARIO = CYBER_SCENARIOS.find((scenario) => scenario.id === 'openfire')!;
const STEPS = [
  { title: 'Explore the Java codebase', detail: 'Openfire is a Java messaging server. The agent starts by locating the files in its audit scope.' },
  { title: 'Map the SSRF risk', detail: 'Server-side request forgery (SSRF) lets an attacker direct a server’s requests. Here, the destination comes from user input.' },
  { title: 'Trace untrusted input', detail: 'The host parameter is the input source: data from an incoming request that an attacker can control.' },
  { title: 'Trace URL construction', detail: 'Openfire inserts that host into a URL. The request parameter now controls where the server connects.' },
  { title: 'Inspect the network sink', detail: 'The sink is the operation where that input has an effect: here, the server’s outbound HTTP request.' },
  { title: 'Confirm the endpoint mapping', detail: 'The agent checks the servlet mapping: /getFavicon routes incoming requests to the code it just reviewed.' },
  { title: 'Verify the submitted finding', detail: 'The agent reports SSRF. The evaluator matches that report against the known vulnerability in this repository.' },
  { title: 'Compare checkpoint results', detail: 'Both checkpoints inspected FaviconServlet.java. Only the final checkpoint reported its SSRF vulnerability.' },
];
const PHASES = [
  { label: 'Explore', step: 0 },
  { label: 'Threat model', step: 1 },
  { label: 'Trace data flow', step: 2 },
  { label: 'Verify', step: 5 },
  { label: 'Results', step: 7 },
];
const STEP_SECONDS = 12;
const DEMO_SECONDS = STEPS.length * STEP_SECONDS;

export function CyberDefenseDemo() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [presentationMessage, setPresentationMessage] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const step = Math.min(Math.floor(elapsed / STEP_SECONDS), STEPS.length - 1);
  const current = STEPS[step];
  const activePhase = step < 2 ? step : step < 5 ? 2 : step < 7 ? 3 : 4;

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
    <div ref={container} className={styles.demo} role="region" aria-label="Openfire security review demo">
      <div className={styles.content}>
        <header className={styles.header}><div><span>NEMOTRON · SECURITY INVESTIGATION</span><p>Openfire / Java messaging server</p></div><button onClick={toggleFullscreen}>{fullscreen ? <ArrowsPointingInIcon /> : <ArrowsPointingOutIcon />}{fullscreen ? 'Exit full screen' : 'Full screen'}</button></header>
        <nav className={styles.progress} aria-label="Investigation stages">{PHASES.map((phase, index) => <button key={phase.label} aria-current={index === activePhase ? 'step' : undefined} className={index < activePhase ? styles.complete : ''} onClick={() => navigate(phase.step)}><span>{String(index + 1).padStart(2, '0')}</span>{phase.label}<i aria-hidden="true" /></button>)}</nav>
        <section className={styles.scene} aria-labelledby={titleId}>
          <div className={styles.headline}><h3 id={titleId}>{current.title}</h3><p>{current.detail}</p></div>
          {step < 7 ? <CyberInvestigation step={step} playing={playing} /> : <CyberTrainingResults scenario={SCENARIO} />}
        </section>
        <div className={styles.controls} aria-label="Investigation playback">
          <button className={styles.secondary} disabled={step === 0} onClick={() => navigate(step - 1)}><ChevronLeftIcon />Back</button>
          <button className={styles.play} onClick={play}>
            <span className={styles.autoplayLabel}>{playing ? <PauseIcon /> : elapsed >= DEMO_SECONDS ? <ArrowPathIcon /> : <PlayIcon />}{playing ? 'Pause' : elapsed >= DEMO_SECONDS ? 'Replay investigation' : elapsed === 0 ? 'Play investigation' : 'Resume'}</span>
            <span className={styles.manualLabel}>{step === STEPS.length - 1 ? <ArrowPathIcon /> : <ArrowRightIcon />}{step === STEPS.length - 1 ? 'Start over' : 'Next step'}</span>
          </button>
          <button className={styles.secondary} disabled={step === STEPS.length - 1} onClick={() => navigate(step + 1)}>Next<ArrowRightIcon /></button>
        </div>
        <div className={styles.timeline}><input type="range" aria-label="Investigation timeline" aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${current.title}`} min={0} max={STEPS.length - 1} value={step} onChange={(event) => navigate(Number(event.target.value))} /><span>{step + 1} / {STEPS.length}</span></div>
        <p className={styles.replayNote}>Recorded investigation · condensed to {DEMO_SECONDS} seconds</p>
        <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">Step {step + 1} of {STEPS.length}: {current.title}.</span>
        {presentationMessage && <p className={styles.presentationMessage} role="status">{presentationMessage}</p>}
      </div>
    </div>
  );
}
