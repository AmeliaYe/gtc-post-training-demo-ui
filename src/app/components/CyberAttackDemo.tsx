'use client';

import { useEffect, useId, useState } from 'react';
import {
  ArrowDownIcon, ArrowPathIcon, ArrowRightIcon, CircleStackIcon,
  CodeBracketIcon, GlobeAltIcon, LockClosedIcon, PauseIcon,
  PlayIcon, ServerIcon, UserIcon,
} from '@heroicons/react/24/outline';
import type { CyberAttack } from '@/lib/cyber-attacks';
import type { CyberScenario } from '@/lib/cyber-fixture';
import styles from './CyberAttackDemo.module.css';

const NODE_ICONS = {
  person: UserIcon,
  server: ServerIcon,
  globe: GlobeAltIcon,
  lock: LockClosedIcon,
  code: CodeBracketIcon,
  data: CircleStackIcon,
};
const STAGE_INTERVAL = 5000;

export function CyberAttackDemo({ attack, scenarioId, step, onStepChange, onInspectSource }: {
  attack: CyberAttack;
  scenarioId: CyberScenario['id'];
  step: number;
  onStepChange: (step: number) => void;
  onInspectSource: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const instanceId = useId();
  const diagramId = `attack-${scenarioId}-${instanceId.replaceAll(':', '')}`;
  const lastStep = attack.stages.length - 1;
  const stage = attack.stages[step];
  const tone = step === 0 ? styles.normal : step === lastStep ? styles.consequence : styles.unsafe;
  const activeRoute = stage.mobilePath.map((id) => attack.nodes.find((node) => node.id === id)).filter((node) => node !== undefined);
  const sourceBlocks = stage.source.nodeIds.map((id) => attack.nodes.find((node) => node.id === id)?.label).filter(Boolean).join(' + ');

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step === lastStep) setPlaying(false);
      else onStepChange(step + 1);
    }, STAGE_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [lastStep, onStepChange, playing, step]);

  useEffect(() => {
    function pauseWhenHidden() {
      if (document.hidden) setPlaying(false);
    }
    function pauseForReducedMotion(event: MediaQueryListEvent) {
      if (event.matches) setPlaying(false);
    }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.addEventListener('visibilitychange', pauseWhenHidden);
    preference.addEventListener('change', pauseForReducedMotion);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      preference.removeEventListener('change', pauseForReducedMotion);
    };
  }, []);

  function navigate(next: number) {
    setPlaying(false);
    onStepChange(Math.max(0, Math.min(lastStep, next)));
  }

  function play() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(step === lastStep ? 0 : step + 1);
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (step === lastStep) onStepChange(0);
    setPlaying(true);
  }

  return (
    <section className={`${styles.attack} ${tone}`} aria-labelledby={`${diagramId}-title`}>
      <header className={styles.heading}>
        <h4 id={`${diagramId}-title`}>{attack.title}</h4>
        <span className={styles.illustrationLabel}>Illustrated example</span>
      </header>
      <div className={styles.experience}>
        <div className={styles.scene}>
          <div className={styles.sceneTopline}>
            <span className={styles.badge}><span aria-hidden="true" />{stage.badge}</span>
            <span className={styles.stepCount}>Step {step + 1} of {attack.stages.length}</span>
          </div>
          <div className={styles.desktopGraph} role="img" aria-label={`Active path: ${activeRoute.map((node) => node.label).join(' → ')}. ${stage.description}`}>
            <svg className={styles.network} viewBox="0 0 1000 380" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <marker id={`${diagramId}-muted`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0 0 L8 4 L0 8Z" fill="#52604e" />
                </marker>
                <marker id={`${diagramId}-active`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0 0 L10 5 L0 10Z" fill="currentColor" />
                </marker>
              </defs>
              {attack.edges.map((edge) => (
                <path key={edge.id} d={edge.path} className={`${styles.route} ${stage.activeEdges.includes(edge.id) ? styles.activeRoute : ''}`} markerEnd={`url(#${diagramId}-${stage.activeEdges.includes(edge.id) ? 'active' : 'muted'})`} />
              ))}
              {playing && attack.edges.filter((edge) => stage.activeEdges.includes(edge.id)).map((edge, index) => (
                <circle key={`${step}-${edge.id}`} r="4.5" opacity="0" className={styles.packet}>
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.9;1" dur="2.4s" begin={`${index * 0.5}s`} repeatCount="indefinite" />
                  <animateMotion path={edge.path} dur="2.4s" begin={`${index * 0.5}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </svg>
            {attack.nodes.map((node) => {
              const Icon = NODE_ICONS[node.icon];
              return (
                <div key={node.id} className={`${styles.node} ${stage.activeNodes.includes(node.id) ? styles.activeNode : ''}`} style={{ left: `${node.x / 10}%`, top: `${node.y / 3.8}%` }}>
                  <span className={styles.nodeIcon}><Icon /></span>
                  <strong>{node.label}</strong>
                  <span className={styles.nodeDetail}>{node.detail}</span>
                </div>
              );
            })}
          </div>
          <ol className={styles.mobileRoute} aria-label="Active path">
            {activeRoute.map((node, index) => {
              const Icon = NODE_ICONS[node.icon];
              return (
                <li key={`${node.id}-${index}`}>
                  {index > 0 && <ArrowDownIcon className={styles.mobileArrow} aria-hidden="true" />}
                  <div className={styles.mobileNode}>
                    <span className={styles.nodeIcon}><Icon /></span>
                    <div><strong>{node.label}</strong><span className={styles.nodeDetail}>{node.detail}</span></div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className={styles.narrative}>
          <span className={styles.narrativeNumber} aria-hidden="true">{String(step + 1).padStart(2, '0')}</span>
          <div>
            <h5>{stage.title}</h5>
            <p>{stage.description}</p>
            <div className={styles.sourceLink}>
              <span>Code in: {sourceBlocks}</span>
              <button type="button" onClick={() => { setPlaying(false); onInspectSource(); }}>
                <CodeBracketIcon />Inspect code for step {step + 1}<ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.controls}>
        <nav className={styles.steps} aria-label="Attack explanation steps" onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
          const focusedStep = buttons.indexOf(event.target as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? lastStep : Math.max(0, Math.min(lastStep, (focusedStep < 0 ? step : focusedStep) + (event.key === 'ArrowRight' ? 1 : -1)));
          navigate(next);
          buttons[next]?.focus();
        }}>
          {attack.stages.map((item, index) => (
            <button key={item.label} type="button" aria-current={index === step ? 'step' : undefined} onClick={() => navigate(index)}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className={styles.playButton} type="button" onClick={play}>
          <span className={styles.autoplayLabel}>
            {playing ? <PauseIcon /> : step === lastStep ? <ArrowPathIcon /> : <PlayIcon />}
            {playing ? 'Pause' : step === lastStep ? 'Replay' : 'Play'}
          </span>
          <span className={styles.manualLabel}>
            {step === lastStep ? <ArrowPathIcon /> : <ArrowRightIcon />}
            {step === lastStep ? 'Start over' : 'Next step'}
          </span>
        </button>
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">Step {step + 1} of {attack.stages.length}: {stage.title}.</span>
      <p className={styles.caveat}>{attack.caveat}</p>
      <details className={styles.term}>
        <summary>What does {attack.term} mean?</summary>
        <p>{attack.termExplanation}</p>
      </details>
    </section>
  );
}
