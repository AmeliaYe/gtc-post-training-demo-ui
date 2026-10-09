'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import localFont from 'next/font/local';
import {
  ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowPathIcon, ArrowRightIcon,
  ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon,
} from '@heroicons/react/24/outline';
import { CyberInvestigation } from './CyberInvestigation';
import { CyberTrainingResults } from './CyberTrainingResults';
import { CyberFindings } from './CyberFindings';
import { CyberTrainingLoop } from './CyberTrainingLoop';
import styles from './CyberDefenseDemo.module.css';

const inter = localFont({
  src: '../../../public/cyber/inter-latin-variable.woff2',
  display: 'swap',
  variable: '--font-cyber-inter',
  weight: '100 900',
});
const STEPS = [
  { title: 'Understanding the attack path', seconds: 12, investigationStep: 1, detail: 'Server-side request forgery (SSRF): user input directs a request made by the server.' },
  { title: 'Exploring your codebase', seconds: 6, investigationStep: 0 },
  { title: 'Trace untrusted input', seconds: 6 },
  { title: 'Trace URL construction', seconds: 6 },
  { title: 'Inspect the network sink', seconds: 6 },
  { title: 'Confirm the endpoint mapping', seconds: 6 },
  { title: 'Reviewing the submitted findings', seconds: 12, detail: 'Select a report to inspect the evidence behind it.' },
  { title: 'Scoring the verified findings', seconds: 12 },
  { title: 'Training results', seconds: 12, hideCaption: true },
  { title: 'Smaller open models. AI-native workflows.', seconds: 12, detail: 'Continual local training for individuals and teams as open-source code evolves.' },
].map((step, index, steps) => ({
  ...step,
  startsAt: steps.slice(0, index).reduce((seconds, previous) => seconds + previous.seconds, 0),
}));
const DEMO_SECONDS = STEPS.reduce((seconds, step) => seconds + step.seconds, 0);
const TICK_SECONDS = 0.1;

function FittedScene({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const fit = useCallback(() => {
    const frame = viewport.current;
    const content = canvas.current;
    if (!frame || !content || !content.offsetHeight || !content.offsetWidth) return;
    const scale = Math.min(frame.clientWidth / content.offsetWidth, frame.clientHeight / content.offsetHeight);
    if (scale > 0) content.style.setProperty('--scene-scale', String(scale));
  }, []);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(fit);
    if (viewport.current) observer.observe(viewport.current);
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [fit]);
  useLayoutEffect(fit, [children, fit]);

  return <div ref={viewport} className={styles.scene}><div ref={canvas} className={styles.sceneCanvas}>{children}</div></div>;
}

export function CyberDefenseDemo({ onExit }: { onExit?: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [presentationMessage, setPresentationMessage] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const step = Math.max(0, STEPS.findLastIndex((stage) => elapsed >= stage.startsAt));
  const current = STEPS[step];
  const progress = (elapsed - current.startsAt) / current.seconds;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(Math.round((elapsed + TICK_SECONDS) * 10) / 10, DEMO_SECONDS);
      setElapsed(next);
      if (next === DEMO_SECONDS) setPlaying(false);
    }, TICK_SECONDS * 1000);
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
    setElapsed(STEPS[Math.max(0, Math.min(STEPS.length - 1, next))].startsAt);
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

  function replay() {
    setElapsed(0);
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
          <div className={styles.exampleContext}><span>Openfire <span className={styles.repoDescription}>/ Java messaging server</span></span><span className={styles.historical}>Historical vulnerability</span></div>
          <div className={styles.timeline} role="progressbar" aria-label={`Step ${step + 1} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-valuetext={`${Math.round(progress * 100)}% of ${current.title}`}>
            <span key={step} className={styles.timelineFill} style={{ transform: `scaleX(${progress})`, transitionDuration: playing ? `${TICK_SECONDS}s` : '0s' }} />
          </div>
        </div>
        <FittedScene>
          {step < 6 ? <CyberInvestigation step={current.investigationStep ?? step} playing={playing} progress={progress} onInteract={() => setPlaying(false)} /> : step < 8 ? <CyberFindings key={step} showFeedback={step === 7} onInteract={() => setPlaying(false)} /> : step === 8 ? <CyberTrainingResults onInteract={() => setPlaying(false)} /> : <CyberTrainingLoop progress={elapsed >= DEMO_SECONDS ? 0 : progress} />}
        </FittedScene>
        <footer className={styles.navigation} aria-label="Investigation playback">
          <button className={styles.arrow} disabled={step === 0} onClick={() => navigate(step - 1)} aria-label="Previous step" title="Previous step"><ChevronLeftIcon aria-hidden="true" /></button>
          <div className={styles.caption}>
            <div className={styles.captionCopy}>
            <h1 id={titleId} className={current.hideCaption ? styles.srOnly : undefined}>{current.title}</h1>
            {current.detail && <p>{current.detail}</p>}
            </div>
            <button className={styles.play} onClick={play}>
              <span className={styles.autoplayLabel}>{playing ? <PauseIcon aria-hidden="true" /> : elapsed >= DEMO_SECONDS ? <ArrowPathIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}{playing ? 'Pause' : elapsed >= DEMO_SECONDS ? 'Replay investigation' : elapsed === 0 ? 'Play investigation' : 'Resume'}</span>
              <span className={styles.manualLabel}>{step === STEPS.length - 1 ? <ArrowPathIcon aria-hidden="true" /> : <ArrowRightIcon aria-hidden="true" />}{step === STEPS.length - 1 ? 'Start over' : 'Next step'}</span>
            </button>
          </div>
          {step === STEPS.length - 1
            ? <button className={`${styles.arrow} ${styles.replayArrow}`} onClick={replay} aria-label="Replay investigation" title="Replay investigation"><ArrowPathIcon aria-hidden="true" /><span>Replay</span></button>
            : <button className={styles.arrow} onClick={() => navigate(step + 1)} aria-label="Next step" title="Next step"><ChevronRightIcon aria-hidden="true" /></button>}
        </footer>
        <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">Step {step + 1} of {STEPS.length}: {current.title}.</span>
        {presentationMessage && <p className={styles.presentationMessage} role="status">{presentationMessage}</p>}
      </section>
    </div>
  );
}
