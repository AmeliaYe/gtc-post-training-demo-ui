'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import HealthcareDemo from './components/HealthcareDemo';
import { trackInteraction, trackUseCaseSelection } from '@/lib/analytics';
import {
  CODING_BASE_TOTAL_SECONDS,
  formatSeconds,
  modelState,
  type ModelRun,
} from '@/lib/coding-fixture';
import {
  ArrowPathIcon,
  CheckIcon,
  CircleStackIcon,
  CodeBracketIcon,
  CommandLineIcon,
  DocumentMagnifyingGlassIcon,
  HeartIcon,
  PlayIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const KERMT_DEMO_URL = 'http://127.0.0.1:5173';
const DGX_STATION_URL = 'https://www.nvidia.com/en-us/products/workstations/dgx-station/';
const NEMO_REPOSITORY_URL = 'https://www.nvidia.com/en-us/ai-data-science/products/nemo/';

type DemoBase = {
  id: string;
  name: string;
  task: string;
  color: string;
  glow: string;
  icon: typeof ShieldCheckIcon;
};

// Static sample content for a use case that has no integrated demo yet.
type PlaceholderDemo = DemoBase & {
  kind: 'placeholder';
  scoreLabel: string;
  scoreBefore: number;
  scoreAfter: number;
  latency: string;
  memory: string;
  prompt: string;
  before: string;
  after: string;
  tags: string[];
};

// A live demo embedded in the expanded card.
type LiveDemo = DemoBase & {
  kind: 'demo';
  embedUrl: string;
  previewLabel?: string;
};

type Demo = PlaceholderDemo | LiveDemo;

const demos: Demo[] = [
  {
    kind: 'placeholder', id: 'cyber', name: 'Cyber Defense', task: 'Cybersecurity · Depthfirst',
    color: '#b7ff54', glow: 'rgba(183, 255, 84, .18)', icon: ShieldCheckIcon,
    scoreLabel: 'Threat accuracy', scoreBefore: 63.4, scoreAfter: 93.1, latency: '39 ms', memory: '5.8 GB',
    prompt: 'Triage the endpoint alert: encoded PowerShell spawned by WINWORD with outbound DNS.',
    before: 'This activity may be suspicious. Review the PowerShell command, inspect the parent process, and check the destination before deciding whether to escalate.',
    after: 'HIGH · Escalate and isolate host. WINWORD → encoded PowerShell plus DNS egress maps to T1204.002, T1059.001, and likely T1071.004. Preserve process tree, decode the command, and hunt the domain across endpoints.',
    tags: ['MITRE-aware', 'SOC-tuned', 'evidence-linked'],
  },
  {
    kind: 'demo', id: 'health', name: 'Healthcare', task: 'Nemotron · Post-training',
    color: '#82aaff', glow: 'rgba(130, 170, 255, .18)', icon: HeartIcon,
    embedUrl: '/healthcare/r01/index.html#how-it-learns', previewLabel: 'Explore demo',
  },
  {
    kind: 'demo', id: 'bio', name: 'Multimodal Biology', task: 'Molecular Reasoning',
    color: '#ffb86b', glow: 'rgba(255, 184, 107, .18)', icon: CircleStackIcon,
    embedUrl: KERMT_DEMO_URL,
  },
  {
    kind: 'placeholder', id: 'coding', name: 'Coding Agent', task: 'Software engineering · JetBrains',
    color: '#ff84b7', glow: 'rgba(255, 132, 183, .18)', icon: CodeBracketIcon,
    scoreLabel: 'Issues resolved', scoreBefore: 51.7, scoreAfter: 86.5, latency: '47 ms', memory: '5.9 GB',
    prompt: 'Resolve DEMO-1842 (acme/py-runtime #16): parent cancellation can be swallowed while child cleanup runs, leaving callers waiting on a task group that should unwind.',
    before: 'Add a retry check before processing tool calls and write a test to ensure the arguments are not duplicated.',
    after: 'Root cause is replay after reconnect: the accumulator is keyed by chunk index, which resets. Key by response_id + call_id, ignore sequence ≤ last_sequence, and add a reconnect test covering a split UTF-8 argument. Files: stream.py, state.py, test_reconnect.py.',
    tags: ['repo-aware', 'Mellum', 'test-driven'],
  },
  {
    kind: 'placeholder', id: 'computer', name: 'Computer Use', task: 'GUI agent · H Company',
    color: '#9b8cff', glow: 'rgba(155, 140, 255, .18)', icon: CommandLineIcon,
    scoreLabel: 'Task completion', scoreBefore: 46.8, scoreAfter: 84.7, latency: '54 ms', memory: '6.2 GB',
    prompt: 'Reconcile the Q3 invoice in the ERP and attach the matching purchase order.',
    before: 'Open the ERP, search for the invoice, find the purchase order, and attach it to the invoice record.',
    after: 'Plan: open Accounts Payable → search INV-30418 → verify vendor and amount → open linked PO-7712 in a new tab → compare line totals → attach the PDF. Stop for approval before clicking “Post” because it changes financial state.',
    tags: ['UI-grounded', 'approval-aware', 'recoverable'],
  },
];

// Fixture seconds advanced per wall-clock second, so a 52s replay fits a booth visit.
const PLAYBACK_RATE = 6;

const codingBaseRun = modelState('base', Number.POSITIVE_INFINITY);
const codingTrainedRun = modelState('trained', Number.POSITIVE_INFINITY);
const codingLatencyReduction = Math.round((1 - codingTrainedRun.totalSeconds / codingBaseRun.totalSeconds) * 100);
const codingToolCallReduction = Math.round((1 - codingTrainedRun.toolCalls / codingBaseRun.toolCalls) * 100);
function NvidiaLogo() {
  return (
    <svg className="nvidia-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z" />
    </svg>
  );
}

function MiniChart({ before, after, color, domain = [45, 100], label = 'Evaluation score trend' }: { before: number; after: number; color: string; domain?: [number, number]; label?: string }) {
  const [low, high] = domain;
  const span = high - low;
  const wobble = [-4, 1, -2, 5, 3, -7, -3, 0];
  const y = (value: number) => 44 - ((value - low) / span) * 38;
  const path = wobble.map((offset, index) => `${index === 0 ? 'M' : 'L'} ${index * 24} ${y((index < 5 ? before : after) + (offset / 55) * span)}`).join(' ');
  return (
    <svg className="mini-chart" viewBox="0 0 168 48" role="img" aria-label={label}>
      <path d="M 0 42 H 168" className="chart-grid" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="168" cy={y(after)} r="3.5" fill={color} />
    </svg>
  );
}

function ScoreBar({ label, display, fill, color, muted = false }: { label: string; display: string; fill: number; color: string; muted?: boolean }) {
  return (
    <div className="score-row">
      <div className="score-meta"><span>{label}</span><strong>{display}</strong></div>
      <div className="score-track"><span className={muted ? 'score-fill muted' : 'score-fill'} style={{ width: `${fill}%`, backgroundColor: muted ? undefined : color }} /></div>
    </div>
  );
}

function ReductionCell({ percent, label, baseDisplay, tunedDisplay, fill, color }: { percent: number; label: string; baseDisplay: string; tunedDisplay: string; fill: number; color: string }) {
  return (
    <div className="reduction-cell">
      <div className="result-summary"><span className="lift-number" style={{ color }}>−{percent}%</span><span><strong>{label}</strong><small>vs. base model</small></span></div>
      <div className="score-bars">
        <ScoreBar label="Base model" display={baseDisplay} fill={100} color={color} muted />
        <ScoreBar label="Post-trained" display={tunedDisplay} fill={fill} color={color} />
      </div>
    </div>
  );
}

function ModelTile({ model }: { model: Demo }) {
  const Icon = model.icon;
  return (
    <>
      <span className="mini-window-bar">
        <span className="mini-traffic"><i /><i /><i /></span>
        <span className="expand-glyph">↗</span>
      </span>
      <span className="tile-topline">
        <span className="tile-icon" style={{ color: model.color, backgroundColor: model.glow }}><Icon /></span>
        <span className="status-pill"><i /> {model.id === 'health' ? 'DEMO' : 'LIVE'}</span>
      </span>
      <span className="tile-copy"><strong>{model.name}</strong><small>{model.task}</small></span>
      {model.kind === 'placeholder' ? (
        <span className="tile-score">
          {model.id === 'coding' ? <>
            <span><small>tool calls</small><strong style={{ color: model.color }}>−{codingToolCallReduction}%</strong><em>vs. base</em></span>
            <MiniChart before={codingBaseRun.toolCalls} after={codingTrainedRun.toolCalls} color={model.color} domain={[4, 18]} label="Tool-call trend" />
          </> : <>
            <span><small>vs. base</small><strong style={{ color: model.color }}>+{(model.scoreAfter - model.scoreBefore).toFixed(1)}</strong><em>pts</em></span>
            <MiniChart before={model.scoreBefore} after={model.scoreAfter} color={model.color} />
          </>}
        </span>
      ) : (
        <span className="tile-score"><span><small>interactive</small><strong style={{ color: model.color }}>{model.previewLabel || 'Live demo'}</strong></span></span>
      )}
      <span className="tile-footer"><span>Click to expand <b>↗</b></span></span>
    </>
  );
}

function OutputPanel({ type, text, model }: { type: 'base' | 'tuned'; text: string; model: PlaceholderDemo }) {
  const tuned = type === 'tuned';
  return (
    <section className={`output-panel ${tuned ? 'tuned' : ''}`} style={tuned ? { '--accent': model.color, '--panel-glow': model.glow } as React.CSSProperties : undefined}>
      <header>
        <span className="model-mark">{tuned ? <SparklesIcon /> : <CircleStackIcon />}</span>
        <span><small>{tuned ? 'AFTER · POST-TRAINED' : 'BEFORE · GENERAL MODEL'}</small><strong>{tuned ? `${model.name}` : 'Nemotron base checkpoint'}</strong></span>
        <span className="token-speed">{tuned ? '148' : '132'} tok/s</span>
      </header>
      <div className="response-copy"><span className="assistant-label">ASSISTANT</span><p>{text}</p></div>
      <footer>
        <span className={tuned ? 'result-chip pass' : 'result-chip'}>{tuned && <CheckIcon />}{tuned ? 'Ideal response' : 'Generic response'}</span>
        <span>local · fp8</span>
      </footer>
    </section>
  );
}

function TrajectoryPanel({ run, model }: { run: ModelRun; model: PlaceholderDemo }) {
  const tuned = run.id === 'trained';
  return (
    <section className={`output-panel ${tuned ? 'tuned' : ''}`} style={tuned ? { '--accent': model.color, '--panel-glow': model.glow } as React.CSSProperties : undefined}>
      <header>
        <span className="model-mark">{tuned ? <SparklesIcon /> : <CircleStackIcon />}</span>
        <span><small>{tuned ? 'AFTER · POST-TRAINED' : 'BEFORE · GENERAL MODEL'}</small><strong>{run.name}</strong></span>
        <span className={`run-state ${run.status}`}><i className="status-dot" />{run.status === 'complete' ? 'COMPLETE' : 'RUNNING'}</span>
      </header>

      <div className="trajectory-body">
        <div className="progress-block">
          <div className="progress-copy"><span>{run.currentStage}</span><strong>{Math.round(run.progress)}%</strong></div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={`${run.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(run.progress)}
          >
            <span style={{ width: `${run.progress}%` }} />
          </div>
        </div>

        <dl className="run-metrics">
          <div><dt>Elapsed</dt><dd>{formatSeconds(run.elapsedSeconds)}</dd></div>
          <div><dt>Tool calls</dt><dd>{run.toolCalls}</dd></div>
          <div><dt>Failures</dt><dd className={run.failures ? 'metric-warning' : 'metric-good'}>{run.failures}</dd></div>
        </dl>

        <ol className="timeline" aria-label={`${run.name} tool timeline`}>
          {run.stages.map((stage, index) => (
            <li className={`timeline-item ${stage.status}`} key={stage.id} aria-current={stage.status === 'active' ? 'step' : undefined}>
              <div className="timeline-rail" aria-hidden="true">
                <span className="timeline-node">{stage.status === 'complete' ? <CheckIcon /> : String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="timeline-content">
                <div className="timeline-title">
                  <strong>{stage.label}</strong>
                  <span>{stage.status === 'queued' ? 'Queued' : `${stage.status === 'active' ? 'Active' : 'Complete'} · +${stage.atSeconds.toFixed(1)}s`}</span>
                </div>
                <div className="stage-attribution">
                  <span className="agent-chip"><i aria-hidden="true" />{stage.agent}<small>Sim</small></span>
                  <code>{stage.tool}</code>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <footer>
        <span className={tuned ? 'result-chip pass' : 'result-chip'}>{tuned && <CheckIcon />}{run.currentStage}</span>
        <span>{run.toolCalls} tool calls · local · fp8</span>
      </footer>
    </section>
  );
}

function PlaceholderBody({ model, isRunning, runCount, codingElapsed }: { model: PlaceholderDemo; isRunning: boolean; runCount: number; codingElapsed: number }) {
  const lift = model.scoreAfter - model.scoreBefore;
  const isCoding = model.id === 'coding';
  return (
    <>
      <div className="prompt-bar"><span className="prompt-label">PROMPT</span><p>{model.prompt}</p><span className="prompt-tag">held-out eval</span></div>

      <div className={`comparison-grid ${isRunning && !isCoding ? 'is-evaluating' : ''}`}>
        {isCoding ? <>
          <TrajectoryPanel run={modelState('base', codingElapsed)} model={model} />
          <div className="comparison-divider"><span>VS</span></div>
          <TrajectoryPanel run={modelState('trained', codingElapsed)} model={model} />
        </> : <>
          <OutputPanel type="base" text={model.before} model={model} />
          <div className="comparison-divider"><span>VS</span></div>
          <OutputPanel type="tuned" text={model.after} model={model} />
        </>}
      </div>

      <div className={`results-strip ${isCoding ? 'trajectory' : ''}`}>
        {isCoding ? <>
          <ReductionCell
            percent={codingLatencyReduction}
            label="latency reduction"
            baseDisplay={formatSeconds(codingBaseRun.totalSeconds)}
            tunedDisplay={formatSeconds(codingTrainedRun.totalSeconds)}
            fill={(codingTrainedRun.totalSeconds / codingBaseRun.totalSeconds) * 100}
            color={model.color}
          />
          <ReductionCell
            percent={codingToolCallReduction}
            label="fewer tool calls"
            baseDisplay={`${codingBaseRun.toolCalls} calls`}
            tunedDisplay={`${codingTrainedRun.toolCalls} calls`}
            fill={(codingTrainedRun.toolCalls / codingBaseRun.toolCalls) * 100}
            color={model.color}
          />
          <div className="result-metrics"><div><small>VRAM</small><strong>{model.memory}</strong></div></div>
        </> : <>
          <div className="result-summary"><span className="lift-number" style={{ color: model.color }}>+{lift.toFixed(1)}</span><span><strong>point lift</strong><small>on held-out evaluation</small></span></div>
          <div className="score-bars"><ScoreBar label="Base model" display={`${model.scoreBefore.toFixed(1)}%`} fill={model.scoreBefore} color={model.color} muted /><ScoreBar label="Post-trained" display={`${model.scoreAfter.toFixed(1)}%`} fill={model.scoreAfter} color={model.color} /></div>
          <div className="result-metrics"><div><small>{model.scoreLabel}</small><strong>{model.scoreAfter.toFixed(1)}%</strong></div><div><small>p50 latency</small><strong>{model.latency}</strong></div><div><small>VRAM</small><strong>{model.memory}</strong></div></div>
        </>}
      </div>

      <div className="expanded-footer"><div className="tag-list">{model.tags.map((tag) => <span key={tag}><CheckIcon /> {tag}</span>)}</div><span>Evaluation run #{runCount} · 1,000 prompts · seed 42</span></div>
    </>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runCount, setRunCount] = useState(248);
  const [codingElapsed, setCodingElapsed] = useState(Number.POSITIVE_INFINITY);
  const frameRef = useRef<number | null>(null);

  const stopPlayback = useCallback(() => {
    if (frameRef.current === null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  const playCodingTrajectory = useCallback(() => {
    stopPlayback();
    const startedAt = performance.now();
    setCodingElapsed(0);
    const step = (now: number) => {
      const elapsed = ((now - startedAt) / 1000) * PLAYBACK_RATE;
      if (elapsed >= CODING_BASE_TOTAL_SECONDS) {
        frameRef.current = null;
        setCodingElapsed(Number.POSITIVE_INFINITY);
        setIsRunning(false);
        setRunCount((count) => count + 1);
        return;
      }
      setCodingElapsed(elapsed);
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [stopPlayback]);

  const runEvaluation = () => {
    if (isRunning) return;
    trackInteraction('evaluation_run', { use_case: selectedId });
    setIsRunning(true);
    if (selectedId === 'coding') {
      playCodingTrajectory();
      return;
    }
    window.setTimeout(() => { setIsRunning(false); setRunCount((count) => count + 1); }, 900);
  };

  const selectUseCase = (useCase: string) => {
    trackUseCaseSelection(useCase, selectedId ? 'dock' : 'gallery');
    stopPlayback();
    setCodingElapsed(Number.POSITIVE_INFINITY);
    setIsRunning(false);
    setSelectedId(useCase);
  };

  const resetView = (source: 'toolbar' | 'window') => {
    trackInteraction('view_reset', { source, selected_use_case: selectedId });
    stopPlayback();
    setCodingElapsed(Number.POSITIVE_INFINITY);
    setIsRunning(false);
    setSelectedId(null);
  };

  return (
    <main className={`app-shell ${selectedId === 'health' ? 'healthcare-selected' : ''}`}>
      <header className="topbar">
        <div className="brand" role="img" aria-label="NVIDIA"><NvidiaLogo /></div>
        <div className="topbar-center"><span className="crumb-muted">DGX Station</span></div>
        <div className="topbar-actions"><span className="local-badge"><i /> LOCAL</span></div>
      </header>

      <div className="page-wrap">
        <section className="intro-row">
          <div><h1>Your Expertise, Your Machine,<br /><em>Your Nemotron</em></h1></div>
          <div className="cluster-card">
            <div className="cluster-icon"><ServerStackIcon /></div>
            <div>
              <small>LOCAL SYSTEM</small>
              <strong>2-Node DGX Station</strong>
              <strong>Powered by <a className="spec-link" href={DGX_STATION_URL} target="_blank" rel="noopener noreferrer">GB300 Superchip</a></strong>
            </div>
          </div>
        </section>

        <section className="workspace" aria-label="Specialized model comparison">
          <div className="window-bar">
            <div className="traffic-lights"><i /><i /><i /></div>
            <div className="window-meta">
              {selectedId && <button className="reset-view-button" onClick={() => resetView('toolbar')}><ArrowPathIcon /> Reset view</button>}
              <span><span className="sync-dot" /> Synced just now</span>
            </div>
          </div>

          <div className={`workspace-body ${selectedId ? 'has-selection' : 'gallery-view'}`}>
            {!selectedId && <div className="dock-heading"></div>}
            {demos.map((model) => {
              const isSelected = model.id === selectedId;
              const minimizedDemos = selectedId ? demos.filter((item) => item.id !== selectedId) : demos;
              const compactRow = minimizedDemos.findIndex((item) => item.id === model.id) + 1;
              const ModelIcon = model.icon;

              return (
                <motion.article
                  layout
                  key={model.id}
                  transition={{ layout: { duration: .42, ease: [.22, 1, .36, 1] } }}
                  className={isSelected ? 'expanded-model' : 'model-tile'}
                  style={isSelected
                    ? { '--accent': model.color, '--panel-glow': model.glow } as React.CSSProperties
                    : selectedId
                      ? { '--tile-glow': model.glow, gridRow: compactRow } as React.CSSProperties
                      : { '--tile-glow': model.glow } as React.CSSProperties}
                  onClick={isSelected ? undefined : () => selectUseCase(model.id)}
                  onKeyDown={isSelected ? undefined : (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectUseCase(model.id);
                    }
                  }}
                  role={isSelected ? undefined : 'button'}
                  tabIndex={isSelected ? undefined : 0}
                  aria-label={isSelected ? undefined : `Expand ${model.name}`}
                >
                  {!isSelected ? <ModelTile model={model} /> : <>
                <div className="expanded-window-bar">
                  <span className="expanded-traffic"><i /><i /><i /></span>
                  <button className="view-all-button" onClick={() => resetView('window')}>← All use cases</button>
                </div>
                <div className="expanded-header">
                  <div className="expanded-identity">
                    <span className="expanded-icon"><ModelIcon /></span>
                    <div><h2>{model.name} </h2></div>
                  </div>
                  <div className="header-actions">
                    {model.id !== 'health' && <button className="ghost-button"><DocumentMagnifyingGlassIcon /> Model card</button>}
                    {model.kind === 'placeholder' && <button className={`run-button ${isRunning ? 'running' : ''}`} onClick={runEvaluation}>{isRunning ? <ArrowPathIcon /> : <PlayIcon />}{isRunning ? 'Running…' : 'Run evaluation'}</button>}
                  </div>
                </div>

                {model.id === 'health' ? <HealthcareDemo /> : model.kind === 'demo'
                  ? <iframe className="embed-frame" src={model.embedUrl} title={`${model.name} demo`} allow="clipboard-read; clipboard-write" />
                  : <PlaceholderBody model={model} isRunning={isRunning} runCount={runCount} codingElapsed={codingElapsed} />}
              </>}
                </motion.article>
              );
            })}
          </div>
        </section>

        <footer className="page-footer"><span><i /> Post-training with DGX Station </span><span className="lineage"></span><a className="stack-link-footer" href={NEMO_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">Built with NeMo<span>↗</span></a></footer>
      </div>
    </main>
  );
}
