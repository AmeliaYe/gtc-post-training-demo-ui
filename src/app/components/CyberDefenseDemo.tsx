'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import localFont from 'next/font/local';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowPathIcon,
  ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon,
} from '@heroicons/react/24/outline';
import { CyberInvestigation } from './CyberInvestigation';
import { CyberTrainingResults } from './CyberTrainingResults';
import { CyberFindings } from './CyberFindings';
import { CyberTrainingLoop } from './CyberTrainingLoop';
import { CyberPromptDemo } from './CyberPromptDemo';
import styles from './CyberDefenseDemo.module.css';

const inter = localFont({
  src: '../../../public/cyber/inter-latin-variable.woff2',
  display: 'swap',
  variable: '--font-cyber-inter',
  weight: '100 900',
});
type DemoStep = {
  title: string;
  seconds: number;
  detail?: string;
  hideCaption?: boolean;
} & ({ scene: 'investigation'; investigationStep: number } | { scene: 'prompt' | 'findings' | 'results' | 'training' });

const STEPS: (DemoStep & { startsAt: number })[] = ([
  { scene: 'investigation', title: 'Example vulnerability: Server-side request forgery (SSRF)', seconds: 3, investigationStep: 1, detail: 'An attacker may use the server to reach private services.' },
  { scene: 'investigation', title: 'Agent locates the files in the audit scope', seconds: 3, investigationStep: 0 },
  { scene: 'investigation', title: 'Agent traces untrusted input from the request', seconds: 3, investigationStep: 2 },
  { scene: 'investigation', title: 'Agent follows the input into URL construction', seconds: 3, investigationStep: 3 },
  { scene: 'investigation', title: 'Agent inspects the code that sends the HTTP request', seconds: 3, investigationStep: 4 },
  { scene: 'investigation', title: 'Agent confirms how the endpoint reaches this code', seconds: 3, investigationStep: 5 },
  { scene: 'findings', title: 'Security findings and vulnerability discovery', seconds: 3 },
  { scene: 'results', title: 'Post-training improves vulnerability recall', seconds: 3 },
  { scene: 'prompt', title: 'Agent is tasked with finding the vulnerability in the audit slice', seconds: 3 },
  { scene: 'training', title: 'Continuous local training on new open-source vulnerabilities', seconds: 3, detail: 'For individuals and teams.' },
] satisfies DemoStep[]).map((step, index, steps) => ({
  ...step,
  seconds: step.seconds,
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
  const reducedMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [playbackNotice, setPlaybackNotice] = useState<'Pause' | 'Resume' | null>(null);
  const [pressedArrow, setPressedArrow] = useState<{ direction: 'left' | 'right'; sequence: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [presentationMessage, setPresentationMessage] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const step = Math.max(0, STEPS.findLastIndex((stage) => elapsed >= stage.startsAt));
  const current = STEPS[step];
  const progress = (elapsed - current.startsAt) / current.seconds;
  const presentationTitle = current.scene === 'findings' ? progress < .5 ? 'Agent submits its security findings' : 'Post-training enables vulnerability discovery' : current.title;

  useEffect(() => {
    if (!playbackNotice) return;
    const timer = window.setTimeout(() => setPlaybackNotice(null), 1400);
    return () => window.clearTimeout(timer);
  }, [playbackNotice]);

  useEffect(() => {
    if (!pressedArrow) return;
    const timer = window.setTimeout(() => setPressedArrow(null), 180);
    return () => window.clearTimeout(timer);
  }, [pressedArrow]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(Math.round((elapsed + TICK_SECONDS) * 10) / 10, DEMO_SECONDS);
      setElapsed(next === DEMO_SECONDS ? 0 : next);
    }, TICK_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [elapsed, playing]);

  useEffect(() => {
    window.scrollTo(0, 0);
    container.current?.focus({ preventScroll: true });
    function updateFullscreen() {
      setFullscreen(document.fullscreenElement === container.current);
    }
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  function navigate(next: number) {
    setElapsed(STEPS[Math.max(0, Math.min(STEPS.length - 1, next))].startsAt);
  }

  function play() {
    if (playing) {
      setPlaybackNotice('Pause');
      setPlaying(false);
      return;
    }
    if (elapsed >= DEMO_SECONDS) setElapsed(0);
    setPlaybackNotice('Resume');
    setPlaying(true);
  }

  function replay() {
    setElapsed(0);
    setPlaying(true);
    setPlaybackNotice(null);
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
    <div ref={container} className={`${styles.demo} ${inter.variable}`} role="region" aria-label="Messaging server security review demo" tabIndex={-1}
      onKeyDown={(event) => {
        if (!['Space', 'ArrowLeft', 'ArrowRight'].includes(event.code) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        event.preventDefault();
        if (event.repeat) return;
        if (event.code === 'Space') play();
        else {
          const direction = event.code === 'ArrowLeft' ? 'left' : 'right';
          setPressedArrow(previous => ({ direction, sequence: (previous?.sequence ?? 0) + 1 }));
          navigate(direction === 'left' ? Math.max(0, step - 1) : step === STEPS.length - 1 ? 0 : step + 1);
        }
      }}>
      <header className={styles.header}>
        <div className={styles.headerAction}>{onExit && <button onClick={onExit} aria-label="Back to all demos" title="All demos"><ChevronLeftIcon aria-hidden="true" /></button>}</div>
        <div className={styles.brandBlock}>
          <div className={styles.brand}><span>Nemotron post-trained by</span><Image src="/cyber/depthfirst.svg" alt="depthfirst" width={205} height={34} loading="eager" /></div>
          <p className={styles.brandDescription}>Smaller, open models can enable AI-native workflows at scale</p>
        </div>
        <div className={styles.headerAction}><button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} title={fullscreen ? 'Exit full screen' : 'Full screen'}>{fullscreen ? <ArrowsPointingInIcon aria-hidden="true" /> : <ArrowsPointingOutIcon aria-hidden="true" />}</button></div>
      </header>
      <section className={styles.presentation} aria-labelledby={titleId}>
        <div className={styles.topline}>
            <div className={styles.stepProgress} role="group" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((stage, index) => <button key={stage.title} className={styles.stepButton} onClick={() => navigate(index)} aria-label={`Go to step ${index + 1}: ${stage.title}`} aria-current={index === step ? 'step' : undefined} title={stage.title}>
                <span className={`${styles.stepDot} ${index === step ? styles.activeStep : ''}`}>
                  <span className={styles.stepLabel}>{index === step ? `Step ${index + 1}` : index + 1}</span>
                  {index === step && <span className={styles.timelineFill} role="progressbar" aria-label={`Step ${step + 1} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})`, transitionDuration: playing ? `${TICK_SECONDS}s` : '0s' }} />}
                </span>
              </button>)}
            </div>
          <div className={styles.playbackControls}>
            <button className={styles.play} onClick={play} aria-keyshortcuts="Space" title="Play or pause (Space)">
              <span className={styles.autoplayLabel}>{playing ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}<span>{playing ? 'Pause' : 'Resume'}</span></span>
            </button>
          </div>
        </div>
        <FittedScene>
          {current.scene === 'investigation' ? <CyberInvestigation step={current.investigationStep} progress={progress} playing={playing} onInteract={() => {}} />
            : current.scene === 'prompt' ? <CyberPromptDemo onInteract={() => {}} />
            : current.scene === 'findings' ? <CyberFindings showFeedback={progress >= .5} />
            : current.scene === 'results' ? <CyberTrainingResults onInteract={() => {}} />
            : <CyberTrainingLoop progress={elapsed >= DEMO_SECONDS ? 0 : progress} />}
        </FittedScene>
        <footer className={styles.navigation} aria-label="Investigation playback">
          <button className={styles.arrow} data-key-pressed={pressedArrow?.direction === 'left'} disabled={step === 0} onClick={() => navigate(step - 1)} aria-label="Previous step" aria-keyshortcuts="ArrowLeft" title="Previous step (Left arrow)"><ChevronLeftIcon aria-hidden="true" /></button>
          <div className={styles.caption}>
            <AnimatePresence mode="wait" initial={false}>
            <motion.div key={presentationTitle} className={styles.captionCopy}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -3 }}
              transition={{ duration: reducedMotion ? 0 : .22, ease: [.22, 1, .36, 1] }}>
            <h1 id={titleId} className={current.hideCaption ? styles.srOnly : undefined}>{presentationTitle}</h1>
            {current.detail && <p>{current.detail}</p>}
            </motion.div>
            </AnimatePresence>

          </div>
          {step === STEPS.length - 1
            ? <button className={`${styles.arrow} ${styles.replayArrow}`} data-key-pressed={pressedArrow?.direction === 'right'} onClick={replay} aria-label="Replay investigation" aria-keyshortcuts="ArrowRight" title="Replay investigation (Right arrow)"><ArrowPathIcon aria-hidden="true" /><span>Replay</span></button>
            : <button className={`${styles.arrow} ${styles.nextArrow}`} data-key-pressed={pressedArrow?.direction === 'right'} onClick={() => navigate(step + 1)} aria-label="Next step" aria-keyshortcuts="ArrowRight" title="Next step (Right arrow)"><ChevronRightIcon aria-hidden="true" /></button>}
        </footer>
        <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">Step {step + 1} of {STEPS.length}: {presentationTitle}.</span>
        {playbackNotice && <div key={playbackNotice} className={styles.pauseChip} role="status"><span>{playbackNotice === 'Pause' ? 'Paused' : 'Resumed'}</span></div>}
        {presentationMessage && <p className={styles.presentationMessage} role="status">{presentationMessage}</p>}
      </section>
    </div>
  );
}
