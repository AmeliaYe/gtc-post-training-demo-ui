'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleStackIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CpuChipIcon,
  DocumentMagnifyingGlassIcon,
  HeartIcon,
  PlayIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

type Model = {
  id: string;
  name: string;
  version: string;
  task: string;
  color: string;
  glow: string;
  icon: typeof ShieldCheckIcon;
  scoreLabel: string;
  scoreBefore: number;
  scoreAfter: number;
  latency: string;
  memory: string;
  samples: string;
  prompt: string;
  before: string;
  after: string;
  tags: string[];
};

const models: Model[] = [
  {
    id: 'cyber', name: 'Cyber Defense', version: 'v3.2', task: 'Cybersecurity · Depthfirst',
    color: '#b7ff54', glow: 'rgba(183, 255, 84, .18)', icon: ShieldCheckIcon,
    scoreLabel: 'Threat accuracy', scoreBefore: 63.4, scoreAfter: 93.1, latency: '39 ms', memory: '5.8 GB', samples: '22.8k',
    prompt: 'Triage the endpoint alert: encoded PowerShell spawned by WINWORD with outbound DNS.',
    before: 'This activity may be suspicious. Review the PowerShell command, inspect the parent process, and check the destination before deciding whether to escalate.',
    after: 'HIGH · Escalate and isolate host. WINWORD → encoded PowerShell plus DNS egress maps to T1204.002, T1059.001, and likely T1071.004. Preserve process tree, decode the command, and hunt the domain across endpoints.',
    tags: ['MITRE-aware', 'SOC-tuned', 'evidence-linked'],
  },
  {
    id: 'health', name: 'Healthcare Simulation', version: 'v2.8', task: 'Agent simulation · NeMo Gym',
    color: '#82aaff', glow: 'rgba(130, 170, 255, .18)', icon: HeartIcon,
    scoreLabel: 'Protocol adherence', scoreBefore: 69.8, scoreAfter: 94.4, latency: '43 ms', memory: '5.5 GB', samples: '16.2k',
    prompt: 'Simulate a patient with new chest pressure during an outpatient intake conversation.',
    before: 'I’m sorry you are experiencing discomfort. Can you tell me when it started and whether anything makes it better or worse?',
    after: 'The patient reports substernal pressure beginning 20 minutes ago with diaphoresis and nausea. Escalation trigger met: stop routine intake, alert the clinical team, and simulate emergency protocol without offering a diagnosis.',
    tags: ['scenario-grounded', 'protocol-safe', 'multi-agent'],
  },
  {
    id: 'bio', name: 'Multimodal Biology', version: 'v4.1', task: 'Biology · multimodal reasoning',
    color: '#ffb86b', glow: 'rgba(255, 184, 107, .18)', icon: CircleStackIcon,
    scoreLabel: 'Grounded reasoning', scoreBefore: 57.6, scoreAfter: 87.9, latency: '58 ms', memory: '6.4 GB', samples: '28.1k',
    prompt: 'Combine this microscopy image, protein sequence, and assay table to explain the phenotype.',
    before: 'The phenotype could be related to altered protein function. Additional experiments may help determine whether the observed cellular changes are significant.',
    after: 'The punctate mitochondrial signal, conserved catalytic-site substitution, and 41% respiration drop support impaired complex-I assembly. Prioritize rescue with wild-type construct and quantify membrane potential before claiming causality.',
    tags: ['image + sequence', 'assay-grounded', 'uncertainty-aware'],
  },
  {
    id: 'coding', name: 'Coding Agent', version: 'v1.9', task: 'Software engineering · JetBrains',
    color: '#ff84b7', glow: 'rgba(255, 132, 183, .18)', icon: CodeBracketIcon,
    scoreLabel: 'Issues resolved', scoreBefore: 51.7, scoreAfter: 86.5, latency: '47 ms', memory: '5.9 GB', samples: '31.5k',
    prompt: 'Resolve GitHub issue #1842: retries can duplicate streamed tool-call arguments.',
    before: 'Add a retry check before processing tool calls and write a test to ensure the arguments are not duplicated.',
    after: 'Root cause is replay after reconnect: the accumulator is keyed by chunk index, which resets. Key by response_id + call_id, ignore sequence ≤ last_sequence, and add a reconnect test covering a split UTF-8 argument. Files: stream.py, state.py, test_reconnect.py.',
    tags: ['repo-aware', 'Mellum', 'test-driven'],
  },
  {
    id: 'computer', name: 'Computer Use', version: 'v2.3', task: 'GUI agent · H Company',
    color: '#9b8cff', glow: 'rgba(155, 140, 255, .18)', icon: CommandLineIcon,
    scoreLabel: 'Task completion', scoreBefore: 46.8, scoreAfter: 84.7, latency: '54 ms', memory: '6.2 GB', samples: '26.4k',
    prompt: 'Reconcile the Q3 invoice in the ERP and attach the matching purchase order.',
    before: 'Open the ERP, search for the invoice, find the purchase order, and attach it to the invoice record.',
    after: 'Plan: open Accounts Payable → search INV-30418 → verify vendor and amount → open linked PO-7712 in a new tab → compare line totals → attach the PDF. Stop for approval before clicking “Post” because it changes financial state.',
    tags: ['UI-grounded', 'approval-aware', 'recoverable'],
  },
];

function MiniChart({ before, after, color }: { before: number; after: number; color: string }) {
  const points = [before - 4, before + 1, before - 2, before + 5, before + 3, after - 7, after - 3, after];
  const path = points.map((value, index) => `${index === 0 ? 'M' : 'L'} ${index * 24} ${44 - ((value - 45) / 55) * 38}`).join(' ');
  return (
    <svg className="mini-chart" viewBox="0 0 168 48" role="img" aria-label="Evaluation score trend">
      <path d="M 0 42 H 168" className="chart-grid" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="168" cy={44 - ((after - 45) / 55) * 38} r="3.5" fill={color} />
    </svg>
  );
}

function ScoreBar({ label, score, color, muted = false }: { label: string; score: number; color: string; muted?: boolean }) {
  return (
    <div className="score-row">
      <div className="score-meta"><span>{label}</span><strong>{score.toFixed(1)}%</strong></div>
      <div className="score-track"><span className={muted ? 'score-fill muted' : 'score-fill'} style={{ width: `${score}%`, backgroundColor: muted ? undefined : color }} /></div>
    </div>
  );
}

function ModelTile({ model }: { model: Model }) {
  const Icon = model.icon;
  const lift = model.scoreAfter - model.scoreBefore;
  return (
    <>
      <span className="mini-window-bar">
        <span className="mini-traffic"><i /><i /><i /></span>
        <code>{model.id}.specialist.local</code>
        <span className="expand-glyph">↗</span>
      </span>
      <span className="tile-topline">
        <span className="tile-icon" style={{ color: model.color, backgroundColor: model.glow }}><Icon /></span>
        <span className="status-pill"><i /> LIVE</span>
      </span>
      <span className="tile-copy"><strong>{model.name}</strong><small>{model.task}</small></span>
      <span className="tile-score">
        <span><small>vs. base</small><strong style={{ color: model.color }}>+{lift.toFixed(1)}</strong><em>pts</em></span>
        <MiniChart before={model.scoreBefore} after={model.scoreAfter} color={model.color} />
      </span>
      <span className="tile-footer"><span>{model.version}</span><span>Click to expand <b>↗</b></span></span>
    </>
  );
}

function OutputPanel({ type, text, model }: { type: 'base' | 'tuned'; text: string; model: Model }) {
  const tuned = type === 'tuned';
  return (
    <section className={`output-panel ${tuned ? 'tuned' : ''}`} style={tuned ? { '--accent': model.color, '--panel-glow': model.glow } as React.CSSProperties : undefined}>
      <header>
        <span className="model-mark">{tuned ? <SparklesIcon /> : <CircleStackIcon />}</span>
        <span><small>{tuned ? 'AFTER · POST-TRAINED' : 'BEFORE · GENERAL MODEL'}</small><strong>{tuned ? `${model.name} ${model.version}` : 'Nemotron base checkpoint'}</strong></span>
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

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runCount, setRunCount] = useState(248);

  const runEvaluation = () => {
    if (isRunning) return;
    setIsRunning(true);
    window.setTimeout(() => { setIsRunning(false); setRunCount((count) => count + 1); }, 900);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-glyph"><span /><span /><span /></span><span>NEMOTRON</span><small>DOMAIN STUDIO</small></div>
        <div className="topbar-center"><span className="crumb-muted">DGX Station</span><span className="crumb-separator">/</span><span>Domain customization</span><ChevronDownIcon /></div>
        <div className="topbar-actions"><span className="local-badge"><i /> LOCAL</span><button className="icon-button" aria-label="Open command menu"><CommandLineIcon /></button><span className="avatar">AY</span></div>
      </header>

      <div className="page-wrap">
        <section className="intro-row">
          <div><p className="eyebrow">NEMOTRON DOMAIN STUDIO <span>05 / 05 WORKLOADS ONLINE</span></p><h1>Your domain. Your model. <em>Your machine.</em></h1><p className="intro-copy">Customize Nemotron for real business needs—with local post-training, inference, and complete control of data and cost. Select a use case to explore the results.</p></div>
          <div className="cluster-card">
            <div className="cluster-icon"><CpuChipIcon /></div>
            <div><small>LOCAL SYSTEM</small><strong>2-node DGX Station <span>·</span> private</strong></div>
            <div className="cluster-stat"><small>STACK</small><strong>NeMo <span>open</span></strong></div>
            <div className="cluster-stat"><small>MODE</small><strong>Train <span>+ serve</span></strong></div>
          </div>
        </section>

        <section className="workspace" aria-label="Specialized model comparison">
          <div className="window-bar">
            <div className="traffic-lights"><i /><i /><i /></div>
            <div className="window-title"><CpuChipIcon /> localhost:8000 / gtc-post-training-demo-ui</div>
            <div className="window-meta">
              {selectedId && <button className="reset-view-button" onClick={() => setSelectedId(null)}><ArrowPathIcon /> Reset view</button>}
              <span><span className="sync-dot" /> Synced just now</span>
            </div>
          </div>

          <div className={`workspace-body ${selectedId ? 'has-selection' : 'gallery-view'}`}>
            <div className="dock-heading">
              <span>{selectedId ? 'MINIMIZED WINDOWS' : 'SELECT A USE CASE'}</span>
              <small>{selectedId ? `${models.length - 1} in dock` : `${models.length} domain demos`}</small>
            </div>
            {models.map((model) => {
              const isSelected = model.id === selectedId;
              const minimizedModels = selectedId ? models.filter((item) => item.id !== selectedId) : models;
              const compactRow = minimizedModels.findIndex((item) => item.id === model.id) + 2;
              const lift = model.scoreAfter - model.scoreBefore;
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
                  onClick={isSelected ? undefined : () => setSelectedId(model.id)}
                  onKeyDown={isSelected ? undefined : (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedId(model.id);
                    }
                  }}
                  role={isSelected ? undefined : 'button'}
                  tabIndex={isSelected ? undefined : 0}
                  aria-label={isSelected ? undefined : `Expand ${model.name}`}
                >
                  {!isSelected ? <ModelTile model={model} /> : <>
                <div className="expanded-window-bar">
                  <span className="expanded-traffic"><i /><i /><i /></span>
                  <code>{model.id}.specialist.local</code>
                  <button className="view-all-button" onClick={() => setSelectedId(null)}>← All use cases</button>
                </div>
                <div className="expanded-header">
                  <div className="expanded-identity">
                    <span className="expanded-icon"><ModelIcon /></span>
                    <div><p><span className="live-dot" /> SELECTED MODEL · RUNNING</p><h2>{model.name} <span>{model.version}</span></h2><small>Customized from Nemotron · {model.samples} post-training examples</small></div>
                  </div>
                  <div className="header-actions">
                    <button className="ghost-button"><DocumentMagnifyingGlassIcon /> Model card</button>
                    <button className={`run-button ${isRunning ? 'running' : ''}`} onClick={runEvaluation}>{isRunning ? <ArrowPathIcon /> : <PlayIcon />}{isRunning ? 'Running…' : 'Run evaluation'}</button>
                  </div>
                </div>

                <div className="prompt-bar"><span className="prompt-label">PROMPT</span><p>{model.prompt}</p><span className="prompt-tag">held-out eval</span></div>

                <div className={`comparison-grid ${isRunning ? 'is-evaluating' : ''}`}>
                  <OutputPanel type="base" text={model.before} model={model} />
                  <div className="comparison-divider"><span>VS</span></div>
                  <OutputPanel type="tuned" text={model.after} model={model} />
                </div>

                <div className="results-strip">
                  <div className="result-summary"><span className="lift-number" style={{ color: model.color }}>+{lift.toFixed(1)}</span><span><strong>point lift</strong><small>on held-out evaluation</small></span></div>
                  <div className="score-bars"><ScoreBar label="Base model" score={model.scoreBefore} color={model.color} muted /><ScoreBar label="Post-trained" score={model.scoreAfter} color={model.color} /></div>
                  <div className="result-metrics"><div><small>{model.scoreLabel}</small><strong>{model.scoreAfter.toFixed(1)}%</strong></div><div><small>p50 latency</small><strong>{model.latency}</strong></div><div><small>VRAM</small><strong>{model.memory}</strong></div></div>
                </div>

                <div className="expanded-footer"><div className="tag-list">{model.tags.map((tag) => <span key={tag}><CheckIcon /> {tag}</span>)}</div><span>Evaluation run #{runCount} · 1,000 prompts · seed 42</span></div>
              </>}
                </motion.article>
              );
            })}
          </div>
        </section>

        <footer className="page-footer"><span><i /> Post-training and inference stay local</span><span className="lineage"><CircleStackIcon /> Nemotron open model <b>→</b> <SparklesIcon /> 5 domain workloads</span><span>NeMo RL · Gym · Data Designer</span></footer>
      </div>
    </main>
  );
}
