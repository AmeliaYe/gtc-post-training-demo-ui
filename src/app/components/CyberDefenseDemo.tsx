'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowPathIcon, ArrowRightIcon,
  ArrowTopRightOnSquareIcon, ChevronLeftIcon, PauseIcon, PlayIcon,
} from '@heroicons/react/24/outline';
import { CYBER_SCENARIOS } from '@/lib/cyber-fixture';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { CYBER_ATTACKS } from '@/lib/cyber-attacks';
import { CyberAttackDemo } from './CyberAttackDemo';
import { CyberTrainingResults } from './CyberTrainingResults';
import styles from './CyberDefenseDemo.module.css';

const SCENARIO = CYBER_SCENARIOS.find((scenario) => scenario.id === 'openfire')!;
const ATTACK = CYBER_ATTACKS.openfire;
const SCENES = [
  { label: 'The request', title: 'Openfire fetches a website icon', takeaway: 'Give the messaging server a public website address, and it fetches that site’s icon.' },
  { label: 'The flaw', title: 'An unchecked address changes the destination', takeaway: 'An attacker substitutes an internal address. The server may reach a private service.' },
  { label: 'The improvement', title: 'Post-training finds the missed flaw', takeaway: 'Both checkpoints reviewed the same code. Only the later checkpoint reported this flaw.' },
];
const SCENE_SECONDS = 20;
const DEMO_SECONDS = SCENES.length * SCENE_SECONDS;

export function CyberDefenseDemo() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [presentationMessage, setPresentationMessage] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const scene = Math.min(Math.floor(elapsed / SCENE_SECONDS), SCENES.length - 1);
  const current = SCENES[scene];

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
    setElapsed(Math.max(0, Math.min(SCENES.length - 1, next)) * SCENE_SECONDS);
  }

  function play() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(scene === SCENES.length - 1 ? 0 : scene + 1);
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
        <header className={styles.header}><span>CYBER DEFENSE · OPENFIRE</span><button onClick={toggleFullscreen}>{fullscreen ? <ArrowsPointingInIcon /> : <ArrowsPointingOutIcon />}{fullscreen ? 'Exit full screen' : 'Full screen'}</button></header>
        <ol className={styles.progress} aria-label="Demo progress">{SCENES.map((item, index) => <li key={item.label} aria-current={index === scene ? 'step' : undefined} className={index < scene ? styles.complete : ''}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}<div aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, (elapsed - index * SCENE_SECONDS) / SCENE_SECONDS * 100))}%` }} /></div></li>)}</ol>
        <section className={styles.scene} aria-labelledby={titleId}>
          <div className={styles.headline}><h3 id={titleId}>{current.title}</h3><p>{current.takeaway}</p></div>
          {scene < 2 ? <>
            <CyberAttackDemo attack={ATTACK} scenarioId="openfire" step={scene === 0 ? 0 : 2} playing={playing} />
            <p className={styles.caveat}>{scene === 0 ? 'The expected route: requester → Openfire → public website.' : 'Illustrative network: access depends on deployment. No customer-data exposure was demonstrated.'}</p>
          </> : <CyberTrainingResults scenario={SCENARIO} />}
        </section>
        <div className={styles.controls} aria-label="Walkthrough controls">
          <button className={styles.secondary} disabled={scene === 0} onClick={() => navigate(scene - 1)}><ChevronLeftIcon />Back</button>
          <button className={styles.play} onClick={play}>
            <span className={styles.autoplayLabel}>{playing ? <PauseIcon /> : elapsed >= DEMO_SECONDS ? <ArrowPathIcon /> : <PlayIcon />}{playing ? 'Pause' : elapsed >= DEMO_SECONDS ? 'Replay demo' : elapsed === 0 ? 'Play 60-second demo' : 'Resume'}</span>
            <span className={styles.manualLabel}>{scene === SCENES.length - 1 ? <ArrowPathIcon /> : <ArrowRightIcon />}{scene === SCENES.length - 1 ? 'Start over' : 'Next scene'}</span>
          </button>
          <button className={styles.secondary} disabled={scene === SCENES.length - 1} onClick={() => navigate(scene + 1)}>Next<ArrowRightIcon /></button>
        </div>
        {scene === 1 && <details className={styles.details}>
          <summary>Explore the code behind this request</summary>
          <p className={styles.codeIntro}>Inside the Openfire server: chosen host → URL construction → HTTP request.</p>
          {CYBER_VISUALS.openfire.code.map((snippet) => <section key={snippet.title} className={styles.excerpt}>
            <h4>{snippet.title}</h4><p>{snippet.explanation}</p>
            <div className={styles.sourceHeader}><code>{snippet.path.split('/').at(-1)}</code><a href={snippet.url} target="_blank" rel="noopener noreferrer">View source<ArrowTopRightOnSquareIcon /></a></div>
            <pre tabIndex={0} aria-label={snippet.title}>{snippet.lines.map((line) => <span key={line.number} className={line.highlight ? styles.highlight : ''}><span className={styles.lineNumber}>{line.number}</span><code>{line.text || ' '}</code></span>)}</pre>
          </section>)}
          <p>{ATTACK.term}: {ATTACK.termExplanation} Reference: {SCENARIO.cve}.</p>
        </details>}
        <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">Scene {scene + 1} of {SCENES.length}: {current.title}.</span>
        {presentationMessage && <p className={styles.presentationMessage} role="status">{presentationMessage}</p>}
      </div>
    </div>
  );
}
