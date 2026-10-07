'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import NvidiaLogo from './NvidiaLogo';
import { AcademicCapIcon, BookOpenIcon, CheckBadgeIcon, ChevronRightIcon, PencilSquareIcon, TrophyIcon } from '@heroicons/react/24/outline';

// Plain-language version of the training pipeline, from Dream's MiST write-up
// (seed corpus, four rewrite flows, verifier, mid-training) and the Dreamer RL stage.
const STEPS = [
  {
    icon: BookOpenIcon, title: 'Gather expert knowledge', short: '~220,000 trusted security documents',
    tags: ['Vulnerability records', 'Attack techniques', 'Defense guidance', 'Threat reports'],
    detail: 'We start from a hand-picked library of about 220,000 trusted security documents. They are accurate but terse: a vulnerability record is often just a few lines.',
  },
  {
    icon: PencilSquareIcon, title: 'Turn it into lessons', short: 'Each document rewritten four ways',
    tags: ['Explanations', 'Q&A', 'Paraphrases', 'Analysis'],
    detail: 'An AI model rewrites every document as study material: textbook-style explanations, question-and-answer drills, paraphrases and guided analysis, so the knowledge sticks.',
  },
  {
    icon: CheckBadgeIcon, title: 'Check every lesson', short: 'Below 8 out of 10 is discarded',
    tags: ['Factual', 'Coherent', 'On topic'],
    detail: 'A reviewer model scores every lesson on accuracy and quality. Anything below 8 out of 10 is thrown away, leaving about a billion words of high-quality material.',
  },
  {
    icon: AcademicCapIcon, title: 'Nemotron studies', short: 'Mid-training on NVIDIA DGX',
    tags: ['NVIDIA Nemotron', 'NeMo', 'DGX'],
    detail: 'NVIDIA Nemotron studies the lessons in a dedicated training stage, gaining deep security knowledge while keeping its general skills.',
  },
  {
    icon: TrophyIcon, title: 'Practice on real tasks', short: 'Safe replica, never real data',
    tags: ['Analyst questions', 'Synthetic network'],
    detail: 'Finally it practices answering real analyst questions inside a synthetic copy of a network, improving with feedback. No customer data is ever used.',
  },
];
const STEP_MS = 4000;


export default function TrainingStory() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (reduce || !auto) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce, auto]);
  const step = STEPS[active];

  return (
    <div className="ts">
      <p className="ts-lead">Like training a security analyst: give it the best books, turn them into lessons, check them, let it study, then let it practice.</p>

      <ol className="ts-steps" style={{ '--progress': `${(active / (STEPS.length - 1)) * 100}%` } as React.CSSProperties}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className={i === active ? 'active' : i < active ? 'done' : ''}>
              <button onClick={() => { setAuto(false); setActive(i); }} aria-current={i === active ? 'step' : undefined}>
                <span className="ts-icon"><Icon /><b>{i + 1}</b></span>
                <strong>{s.title}</strong>
                <small>{s.short}</small>
              </button>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={active} className="ts-detail" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .25 }}>
          <p><b>{active + 1}. {step.title}.</b> {step.detail}</p>
          <div className="ts-tags">{step.tags.map((t) => <span key={t}>{t}</span>)}</div>
        </motion.div>
      </AnimatePresence>

      <SimpleRuntime />

      <div className="ts-result">
        <span>Result</span>
        <strong>A security-expert model that runs entirely on the nation&apos;s own hardware</strong>
        <ChevronRightIcon />
        <em>+8.8 security score · general skills kept intact</em>
      </div>
    </div>
  );
}

// Simplified version of the Dreamer runtime diagram (Technical view): same two paths, plain names.
type Kind = 'core' | 'live' | 'train';
const NODES: { x: number; y: number; w: number; kind: Kind; title: string; sub: string; hero?: boolean }[] = [
  { x: 20, y: 30, w: 200, kind: 'train', title: 'Security library', sub: 'Expert documents as lessons' },
  { x: 20, y: 150, w: 200, kind: 'train', title: 'Mid-training', sub: 'Learns security knowledge' },
  { x: 20, y: 270, w: 200, kind: 'train', title: 'Practice & feedback', sub: 'Improves from every answer' },
  { x: 340, y: 30, w: 300, kind: 'core', title: 'Dream AI agent', sub: 'Answers analyst questions' },
  { x: 340, y: 150, w: 300, kind: 'core', title: 'NVIDIA Nemotron', sub: 'The model behind every answer', hero: true },
  { x: 760, y: 30, w: 220, kind: 'live', title: 'Real network data', sub: 'Stays inside the client network' },
  { x: 760, y: 270, w: 220, kind: 'train', title: 'Safe practice copy', sub: 'Synthetic, never real data' },
];
const LINKS: { d: string; kind: Kind; label?: string; lx?: number; ly?: number }[] = [
  { d: 'M120,94 V150', kind: 'train' },
  { d: 'M220,172 H340', kind: 'train', label: 'knowledge', lx: 280, ly: 164 },
  { d: 'M490,94 V150', kind: 'core', label: 'thinks with', lx: 536, ly: 126 },
  { d: 'M640,62 H760', kind: 'live', label: 'reads', lx: 700, ly: 54 },
  { d: 'M640,82 H700 V302 H760', kind: 'train', label: 'practices on', lx: 708, ly: 200 },
  { d: 'M760,318 H220', kind: 'train', label: 'results scored', lx: 490, ly: 310 },
  { d: 'M220,288 H280 V196 H340', kind: 'train', label: 'better model', lx: 288, ly: 246 },
];
const PATHS = {
  live: [
    { link: 2, at: [450, 122], caption: 'The Dream AI agent thinks with NVIDIA Nemotron.' },
    { link: 3, at: [740, 62], caption: 'It reads the client’s real network data, which never leaves the building.' },
  ],
  train: [
    { link: 0, at: [120, 122], caption: 'Expert security documents are rewritten into lessons.' },
    { link: 1, at: [244, 172], caption: 'Mid-training gives Nemotron deep security knowledge.' },
    { link: 4, at: [700, 140], caption: 'The same agent practices on a safe, synthetic copy of a network.' },
    { link: 5, at: [380, 318], caption: 'Every answer is scored.' },
    { link: 6, at: [250, 288], caption: 'Feedback makes Nemotron better, and the improved model goes back to work.' },
  ],
};

function SimpleRuntime() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<'live' | 'train'>('train');
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const dot = useRef<SVGGElement>(null);
  const track = useRef<SVGPathElement>(null);
  const seq = PATHS[mode];
  useEffect(() => {
    const path = track.current;
    if (reduce || !path) return;
    const len = path.getTotalLength();
    const controls = animate(0, len, {
      duration: Math.max(.8, len / 160), delay: .4, ease: 'easeInOut',
      onUpdate: (v) => { const { x, y } = path.getPointAtLength(v); dot.current?.setAttribute('transform', `translate(${x} ${y})`); },
      onComplete: () => {
        if (step < seq.length - 1) return setStep(step + 1);
        setStep(0);
        if (auto) setMode((m) => (m === 'live' ? 'train' : 'live'));
      },
    });
    return () => controls.stop();
  }, [step, mode, auto, reduce, seq.length]);
  const on = (k: Kind) => k === 'core' || k === mode;

  return (
    <div className="ts-runtime">
      <div className="ts-runtime-head">
        <h4>How it works</h4>
        <div className="ts-switch">
          {(['live', 'train'] as const).map((m) => (
            <button key={m} className={mode === m ? 'active' : ''} onClick={() => { setAuto(false); setMode(m); setStep(0); }}>
              {m === 'live' ? 'Answering analysts' : 'Learning'}
            </button>
          ))}
        </div>
      </div>
      <div className="rt-scroll">
        <svg className="rt-diagram" viewBox="0 0 1000 340" role="img" aria-label="Simplified view: the Dream AI agent thinks with NVIDIA Nemotron and reads real network data inside the client network. To learn, Nemotron is mid-trained on an expert security library, and the same agent practices on a safe synthetic copy; scored results feed back to improve Nemotron.">
          {LINKS.map((l, i) => (
            <g key={l.d} className={!on(l.kind) ? 'off' : !reduce && seq[step].link === i ? 'active' : 'on'}>
              <path className={`rt-edge ${l.kind}`} d={l.d} />
              {l.label && <text className={`rt-edge-label ${on(l.kind) ? '' : 'off'}`} x={l.lx} y={l.ly} textAnchor="middle">{l.label}</text>}
            </g>
          ))}
          {NODES.map((n) => (
            <g key={n.title} style={{ opacity: on(n.kind) ? 1 : .35, transition: 'opacity .4s ease' }}>
              <rect className={`rt-box ${n.kind} ${on(n.kind) ? 'on' : ''} ${n.hero ? 'hero' : ''}`} x={n.x} y={n.y} width={n.w} height="64" rx="10" />
              {n.hero && <NvidiaLogo className="rt-nv-mark" x={n.x + 16} y={n.y + 19} width="26" height="26" />}
              <text className="rt-main" x={n.x + n.w / 2} y={n.y + 28} textAnchor="middle">{n.title}</text>
              <text className="rt-sub" x={n.x + n.w / 2} y={n.y + 46} textAnchor="middle">{n.sub}</text>
            </g>
          ))}
          {/* Numbered step badges along the active path. */}
          {seq.map((st, i) => (
            <g key={`${mode}-${i}`} className={`ts-badge ${mode} ${i === step ? 'current' : i < step ? 'done' : ''}`} transform={`translate(${st.at[0]} ${st.at[1]})`}>
              <circle r={i === step ? 14 : 11} />
              <text textAnchor="middle" dy="4.5">{i + 1}</text>
            </g>
          ))}
          {!reduce && <>
            <path ref={track} d={LINKS[seq[step].link].d} fill="none" stroke="none" />
            <g ref={dot} transform="translate(-50 -50)"><circle r="9" className={`rt-halo ${mode}`} /><circle r="5" className={`rt-dot ${mode}`} /></g>
          </>}
        </svg>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={`${mode}-${step}`} className="rt-note" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
          <b className="ts-badge-inline">{step + 1}</b>{seq[step].caption}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

