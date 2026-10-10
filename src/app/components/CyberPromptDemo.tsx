'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRightIcon, CodeBracketIcon, DocumentTextIcon, FolderOpenIcon,
  GlobeAltIcon, MagnifyingGlassIcon, ServerIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { OPENFIRE_REVIEW_PROMPT } from '@/lib/cyber-replay';
import styles from './CyberPromptDemo.module.css';

const INPUTS = [
  {
    title: 'Host parameter', Icon: GlobeAltIcon,
    trace: 'Input → URL → HTTP request', verify: 'Check destination restrictions.',
    impacts: [{ title: 'Reach private services', Icon: GlobeAltIcon, detail: 'Through the server’s network access.' }],
  },
  {
    title: 'XML content', Icon: CodeBracketIcon,
    trace: 'XML → entity parsing', verify: 'Check external entities and expansion limits.',
    impacts: [
      { title: 'Read server files', Icon: DocumentTextIcon, detail: 'External entity resolution.' },
      { title: 'Exhaust resources', Icon: ServerIcon, detail: 'Entity expansion (DoS).' },
    ],
  },
  {
    title: 'File path', Icon: FolderOpenIcon,
    trace: 'Path → file access', verify: 'Check directory boundaries and permissions.',
    impacts: [{ title: 'Read or overwrite files', Icon: DocumentTextIcon, detail: 'Outside permitted directories.' }],
  },
];

export function CyberPromptDemo({ onInteract }: { onInteract: () => void }) {
  const [input, setInput] = useState(0);
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : .35;
  const delay = reducedMotion ? 0 : .2;
  const selected = INPUTS[input];

  return <section className={styles.prompt} aria-label="Visual security audit prompt">
    <header className={styles.header}><span>Agent prompt</span></header>
    <h2>{OPENFIRE_REVIEW_PROMPT.goal}</h2>
    <div className={styles.columns}>
      <section aria-label="Attacker inputs">
        <h3>Attacker controls</h3>
        {INPUTS.map(({ title, Icon }, index) => <button key={title} className={`${styles.input} ${index === input ? styles.selectedInput : ''}`} aria-pressed={index === input} onClick={() => { setInput(index); onInteract(); }}>
          <Icon aria-hidden="true" /><span><strong>{title}</strong>{index === 0 && <small>This example</small>}</span><ArrowRightIcon aria-hidden="true" />
        </button>)}
      </section>
      <motion.div key={`input-arrow-${input}`} className={styles.connection} aria-hidden="true" initial={{ opacity: .2, x: reducedMotion ? 0 : -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration }}><ArrowRightIcon /></motion.div>
      <section aria-label="Agent checks">
        <h3>Agent checks {input !== 0 && <small>Illustrative</small>}</h3>
        <motion.div key={input} className={styles.checks} aria-live="polite" aria-atomic="true" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, delay }}>
          <div className={styles.trace}><MagnifyingGlassIcon aria-hidden="true" /><strong>{selected.trace}</strong></div>
          <p className={styles.verify}><ShieldCheckIcon aria-hidden="true" /><span>{selected.verify}</span></p>
        </motion.div>
      </section>
      <motion.div key={`impact-arrow-${input}`} className={styles.connection} aria-hidden="true" initial={{ opacity: .2, x: reducedMotion ? 0 : -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration, delay: delay * 2 }}><ArrowRightIcon /></motion.div>
      <section aria-label="Possible harm">
        <h3>Possible harm</h3>
        <motion.div key={input} className={styles.impactGrid} aria-live="polite" aria-atomic="true" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, delay: delay * 3 }}>
          {selected.impacts.map(({ title, Icon, detail }) => <div key={title} className={styles.impact}>
            <Icon aria-hidden="true" /><div><strong>{title}</strong><p>{detail}</p></div>
          </div>)}
        </motion.div>
      </section>
    </div>
    <footer className={styles.footer}>
      <p className={styles.constraints}><ShieldCheckIcon aria-hidden="true" /><span>Local only · No internet</span></p>
      <div className={styles.detailsHover} onMouseEnter={onInteract} onFocus={onInteract}>
        <button type="button" className={styles.detailsButton} aria-describedby="original-prompt-details">Original prompt details</button>
        <div id="original-prompt-details" className={styles.original}><p><strong>Component:</strong> {OPENFIRE_REVIEW_PROMPT.component}</p><p><strong>Audit scope:</strong> {OPENFIRE_REVIEW_PROMPT.files.join(', ')}</p><p><strong>Threat model:</strong> {OPENFIRE_REVIEW_PROMPT.threatModel.map(item => `${item.label}: ${item.text}`).join(' ')}</p><p><strong>Constraints:</strong> {OPENFIRE_REVIEW_PROMPT.constraints}</p><p><strong>Tools:</strong> {OPENFIRE_REVIEW_PROMPT.tools}</p></div>
      </div>
    </footer>
  </section>;
}
