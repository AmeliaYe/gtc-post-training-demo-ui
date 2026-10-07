'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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

      <div className="ts-result">
        <span>Result</span>
        <strong>A security-expert model that runs entirely on the nation&apos;s own hardware</strong>
        <ChevronRightIcon />
        <em>+8.8 security score · general skills kept intact</em>
      </div>
    </div>
  );
}
