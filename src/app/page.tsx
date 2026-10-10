'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import HealthcareDemo from './components/HealthcareDemo';
import { CyberDefenseDemo } from './components/CyberDefenseDemo';
import ComputerUseDemo from './components/ComputerUseDemo';
import DreamDemoContent from './components/dream/DreamDemo';
import { trackInteraction, trackUseCaseSelection } from '@/lib/analytics';
import {
  ArrowPathIcon,
  CheckIcon,
  CircleStackIcon,
  CommandLineIcon,
  DocumentMagnifyingGlassIcon,
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
  description: string;
  color: string;
  glow: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// Static sample content for a use case that has no integrated demo yet.
type PlaceholderDemo = DemoBase & {
  kind: 'placeholder';
  scoreLabel: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreLift?: number;
  latency: string;
  memory: string;
  prompt: string;
  before: string;
  after: string;
  tags: string[];
};

// An interactive experience embedded in the expanded card.
type LiveDemo = DemoBase & {
  kind: 'demo';
  embedUrl: string;
};

type CyberDemo = DemoBase & {
  kind: 'cyber';
};

type ComputerDemo = DemoBase & {
  kind: 'computer';
};

type Demo = PlaceholderDemo | LiveDemo | CyberDemo | ComputerDemo;

const demos: Demo[] = [
  {
    kind: 'computer', id: 'computer', name: 'Computer Use', task: 'GUI agent · H Company',
    description: 'Complete software tasks by seeing and using the screen.',
    color: '#9b8cff', glow: 'rgba(155, 140, 255, .18)', icon: CommandLineIcon,
  },
  {
    kind: 'demo', id: 'health', name: 'Healthcare', task: 'Nemotron · Post-training',
    description: 'Practice safer decisions before working with patients.',
    color: '#82aaff', glow: 'rgba(130, 170, 255, .18)', icon: RodOfAsclepiusIcon,
    embedUrl: '/healthcare/r02/healthcare/index.html?embed=1#how-it-learns',
  },
  {
    kind: 'demo', id: 'bio', name: 'Multimodal Biology', task: 'Molecular Reasoning',
    description: 'Reason across molecules, structures, and scientific data.',
    color: '#ffb86b', glow: 'rgba(255, 184, 107, .18)', icon: CircleStackIcon,
    embedUrl: KERMT_DEMO_URL,
  },
  {
    kind: 'cyber', id: 'cyber', name: 'Cyber Defense', task: 'Cybersecurity · Depthfirst',
    description: 'Find security weaknesses before attackers do.',
    color: '#b7ff54', glow: 'rgba(183, 255, 84, .18)', icon: ShieldCheckIcon,
  },
  {
    kind: 'placeholder', id: 'defense', name: 'National Defense', task: 'Cybersecurity · Dream',
    description: 'Analyze threats, choose defenses, and diagnose vulnerabilities.',
    color: '#ff536b', glow: 'rgba(255, 83, 107, .18)', icon: NationalDefenseIcon,
    scoreLabel: 'Overall security knowledge', scoreBefore: 65.4, scoreAfter: 74.1, scoreLift: 8.8, latency: '44 ms', memory: '5.9 GB',
    prompt: 'Connect the observed campaign activity to the complete attack path targeting protected state infrastructure.',
    before: 'The activity may indicate a coordinated intrusion. Review the available threat intelligence and monitor the affected systems for additional indicators.',
    after: 'HIGH · The evidence forms a complete path: initial access → credential theft → privileged movement → protected infrastructure. Isolate exposed access points, revoke compromised credentials, and validate segmentation before restoring connectivity.',
    tags: ['CTI-grounded', 'attack-path aware', 'evidence-linked'],
  },
];

type IntroStage = 'landing' | 'how-it-learns' | 'gallery';
function NvidiaLogo() {
  return (
    <svg className="nvidia-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z" />
    </svg>
  );
}

function NationalDefenseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="1.5" y="7" width="8.5" height="8" rx="1.3" />
      <path d="m3.5 9.5 2 1.5-2 1.5M6.8 12.7h1.4M10.7 11h5.1" />
      <path d="m17 8.1 6.5-4.4L30 8.1M18.1 9.2h10.8M19.1 9.2v7.1M23.5 9.2v7.1M27.9 9.2v7.1M17.7 16.3h11.6M16.8 19h13.4" />
    </svg>
  );
}

function RodOfAsclepiusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 2.2v19.6" />
      <circle cx="15.8" cy="5" r="1.1" />
      <path d="M15 5.8c-5.7.2-6.5 3.4-1.1 4.1 4.8.7 4.3 3.8-1.3 4.5-4.5.6-4 3.5.5 4.1 2.5.3 2.4 1.7-1.1 2.4" />
      <path d="M10.3 3.1h3.4" />
    </svg>
  );
}

function PageSwitcher({ stage, onChange }: { stage: IntroStage; onChange: (stage: IntroStage) => void }) {
  const pages: Array<[IntroStage, string, string]> = [
    ['landing', '1', 'Robot introduction'],
    ['how-it-learns', '2', 'Post-training workflow'],
    ['gallery', '3', 'Use cases'],
  ];
  return (
    <nav className="page-switcher" aria-label="Demo pages">
      {pages.map(([value, label, title]) => (
        <button key={value} type="button" aria-label={`${label}. ${title}`} title={title} aria-pressed={stage === value} onClick={() => onChange(value)}>{label}</button>
      ))}
    </nav>
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

function ModelTile({ model }: { model: Demo }) {
  const Icon = model.icon;
  return (
    <>
      <span className="mini-window-bar">
        <span className="mini-traffic"><i /><i /><i /></span>
        <span className="expand-glyph">↗</span>
      </span>
      <span className="tile-topline"><span className="status-pill"><i /> {model.id === 'health' || model.kind === 'cyber' ? 'DEMO' : 'LIVE'}</span></span>
      <span className="tile-icon" style={{ color: model.color, backgroundColor: model.glow }}><Icon /></span>
      <span className="tile-copy">
        <strong>{model.name}</strong>
        <small>{model.description}</small>
        <em>{model.task}</em>
      </span>
      {model.kind === 'placeholder' && model.id !== 'defense' ? (
        <span className="tile-score">
          <span><strong style={{ color: model.color }}>+{(model.scoreLift ?? model.scoreAfter - model.scoreBefore).toFixed(1)}</strong><em>pts</em></span>
          <MiniChart before={model.scoreBefore} after={model.scoreAfter} color={model.color} />
        </span>
      ) : (
        <span className="tile-spacer" aria-hidden="true" />
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

function PlaceholderBody({ model, isRunning, runCount }: { model: PlaceholderDemo; isRunning: boolean; runCount: number }) {
  const lift = model.scoreLift ?? model.scoreAfter - model.scoreBefore;
  return (
    <>
      <div className="prompt-bar"><span className="prompt-label">PROMPT</span><p>{model.prompt}</p><span className="prompt-tag">held-out eval</span></div>

      <div className={`comparison-grid ${isRunning ? 'is-evaluating' : ''}`}>
        <OutputPanel type="base" text={model.before} model={model} />
        <div className="comparison-divider"><span>VS</span></div>
        <OutputPanel type="tuned" text={model.after} model={model} />
      </div>

      <div className="results-strip">
        <div className="result-summary"><span className="lift-number" style={{ color: model.color }}>+{lift.toFixed(1)}</span><span><strong>point lift</strong><small>on held-out evaluation</small></span></div>
        <div className="score-bars"><ScoreBar label="Base model" display={`${model.scoreBefore.toFixed(1)}%`} fill={model.scoreBefore} color={model.color} muted /><ScoreBar label="Post-trained" display={`${model.scoreAfter.toFixed(1)}%`} fill={model.scoreAfter} color={model.color} /></div>
        <div className="result-metrics"><div><small>{model.scoreLabel}</small><strong>{model.scoreAfter.toFixed(1)}%</strong></div><div><small>p50 latency</small><strong>{model.latency}</strong></div><div><small>VRAM</small><strong>{model.memory}</strong></div></div>
      </div>

      <div className="expanded-footer"><div className="tag-list">{model.tags.map((tag) => <span key={tag}><CheckIcon /> {tag}</span>)}</div><span>Evaluation run #{runCount} · 1,000 prompts · seed 42</span></div>
    </>
  );
}

export default function Home() {
  const [introStage, setIntroStage] = useState<IntroStage>('landing');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runCount, setRunCount] = useState(248);
  const introFrameRef = useRef<HTMLIFrameElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stage = new URLSearchParams(window.location.search).get('stage');
    if (stage && ['landing', 'how-it-learns', 'gallery'].includes(stage)) setIntroStage(stage as IntroStage);
  }, []);

  useEffect(() => {
    if (introStage === 'gallery') return;
    const advanceIntro = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== introFrameRef.current?.contentWindow) return;
      if (introStage === 'landing' && event.data?.type === 'gtc-demo:enter') {
        setIntroStage('how-it-learns');
      }
      if (introStage === 'how-it-learns' && event.data?.type === 'gtc-demo:enter-gallery') {
        setIntroStage('gallery');
      }
      if (event.data?.type === 'gtc-demo:navigate' && ['landing', 'how-it-learns', 'gallery'].includes(event.data.stage)) {
        setIntroStage(event.data.stage as IntroStage);
      }
    };
    window.addEventListener('message', advanceIntro);
    return () => window.removeEventListener('message', advanceIntro);
  }, [introStage]);

  const runEvaluation = () => {
    if (isRunning) return;
    trackInteraction('evaluation_run', { use_case: selectedId });
    setIsRunning(true);
    window.setTimeout(() => { setIsRunning(false); setRunCount((count) => count + 1); }, 900);
  };

  const selectUseCase = (useCase: string) => {
    trackUseCaseSelection(useCase, selectedId ? 'dock' : 'gallery');
    setIsRunning(false);
    setSelectedId(useCase);
    window.requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ block: 'start' }));
  };

  const resetView = (source: 'toolbar' | 'window') => {
    trackInteraction('view_reset', { source, selected_use_case: selectedId });
    setIsRunning(false);
    setSelectedId(null);
  };

  if (introStage !== 'gallery') {
    return (
      <main className="demo-landing">
        <iframe
          ref={introFrameRef}
          src={introStage === 'landing' ? '/healthcare/r02/introduction/index.html?embed=1' : '/healthcare/r01/how-it-learns.html?embed=1'}
          title={introStage === 'landing' ? 'Post-training with practice and feedback' : 'How post-training works'}
        />
      </main>
    );
  }

  return (
    <main className={`app-shell ${selectedId === 'health' ? 'healthcare-selected' : ''}`}>
      <header className="topbar">
        <div className="brand" role="img" aria-label="NVIDIA"><NvidiaLogo /></div>
        <div className="topbar-center"><span className="crumb-muted">DGX Station</span></div>
        <div className="topbar-actions"><PageSwitcher stage={introStage} onChange={setIntroStage} /><span className="local-badge"><i /> LOCAL</span></div>
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

        <section ref={workspaceRef} className="workspace" aria-label="Specialized model comparison">
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
                    {model.kind !== 'cyber' && model.id !== 'health' && <button className="ghost-button"><DocumentMagnifyingGlassIcon /> Model card</button>}
                    {model.kind === 'placeholder' && <button className={`run-button ${isRunning ? 'running' : ''}`} onClick={runEvaluation}>{isRunning ? <ArrowPathIcon /> : <PlayIcon />}{isRunning ? 'Running…' : 'Run evaluation'}</button>}
                  </div>
                </div>

                {model.kind === 'cyber' ? <CyberDefenseDemo /> : model.id === 'health' ? <HealthcareDemo /> : model.id === 'defense' ? <DreamDemoContent /> : model.kind === 'computer' ? <ComputerUseDemo /> : model.kind === 'demo'
                  ? <iframe className="embed-frame" src={model.embedUrl} title={`${model.name} demo`} allow="clipboard-read; clipboard-write" />
                  : <PlaceholderBody model={model} isRunning={isRunning} runCount={runCount} />}
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
