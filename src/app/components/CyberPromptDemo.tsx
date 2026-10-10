'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRightIcon, CodeBracketIcon, DocumentTextIcon, FolderOpenIcon,
  GlobeAltIcon, MagnifyingGlassIcon, ServerIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import styles from './CyberPromptDemo.module.css';

const INPUTS = [
  { title: 'A URL', Icon: GlobeAltIcon, focus: 'Follow the destination', trace: 'Where does the server send the request?', verify: 'Check public vs. private addresses', impacts: ['services'], detail: 'A server request could reach a private service.' },
  { title: 'XML content', Icon: CodeBracketIcon, focus: 'Inspect entity handling', trace: 'How does the parser handle entities?', verify: 'Check file reads and resource limits', impacts: ['files', 'disruption'], detail: 'Entity handling could expose files or exhaust resources.' },
  { title: 'A file path', Icon: FolderOpenIcon, focus: 'Follow file access', trace: 'Does access stay inside permitted directories?', verify: 'Check path boundaries and permissions', impacts: ['files'], detail: 'A path could reach restricted files for reading or writing.' },
];
const IMPACTS = [
  { id: 'code', title: 'Run code', Icon: CodeBracketIcon, technical: 'Code execution: run unauthorized code on the server.' },
  { id: 'files', title: 'Access files', Icon: DocumentTextIcon, technical: 'File disclosure or modification: read or change restricted files.' },
  { id: 'disruption', title: 'Disrupt service', Icon: ServerIcon, technical: 'Denial of service: exhaust resources, for example through XML entity expansion.' },
  { id: 'services', title: 'Reach private services', Icon: GlobeAltIcon, technical: 'Server-side request forgery (SSRF): make the server request an internal destination.' },
];

export function CyberPromptDemo({ onInteract, compact = false }: { onInteract: () => void; compact?: boolean }) {
  const [input, setInput] = useState(0);
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : .35;
  const delay = reducedMotion ? 0 : .2;
  const selected = INPUTS[input];

  return <section className={`${styles.prompt} ${compact ? styles.compact : ''}`} aria-label="Visual security audit prompt">
    <h2>Trace attacker input to possible impact</h2>
    <div className={styles.columns}>
      <section className={styles.inputs} aria-label="Attacker inputs">
        <h3>Attacker controls</h3>
        {INPUTS.map(({ title, Icon }, index) => <button key={title} className={`${styles.input} ${index === input ? styles.selectedInput : ''}`} aria-pressed={index === input} onClick={() => { setInput(index); onInteract(); }}>
          <Icon aria-hidden="true" /><span><strong>{title}</strong></span><ArrowRightIcon aria-hidden="true" />
        </button>)}
      </section>
      <motion.div key={`input-arrow-${input}`} className={styles.connection} aria-hidden="true" initial={{ opacity: .2, x: reducedMotion ? 0 : -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration }}><ArrowRightIcon /></motion.div>
      <section className={styles.approach} aria-label="Agent investigation approach">
        <h3>Agent follows <small>Illustrative</small></h3>
        <motion.div key={input} aria-live="polite" initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, delay }}>
          <div className={styles.focus}><MagnifyingGlassIcon aria-hidden="true" /><strong>{selected.focus}</strong></div>
          <ol className={styles.trace}>
            <li><ArrowRightIcon aria-hidden="true" /><p>{selected.trace}</p></li>
            <li><ShieldCheckIcon aria-hidden="true" /><p>{selected.verify}</p></li>
            <li><DocumentTextIcon aria-hidden="true" /><p>Confirm with code and evidence</p></li>
          </ol>
        </motion.div>
      </section>
      <motion.div key={`impact-arrow-${input}`} className={styles.connection} aria-hidden="true" initial={{ opacity: .2, x: reducedMotion ? 0 : -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration, delay: delay * 2 }}><ArrowRightIcon /></motion.div>
      <section className={styles.impacts} aria-label="Possible attack impacts">
        <h3>Possible impact</h3>
        <div className={styles.impactGrid}>{IMPACTS.map(({ id, title, Icon, technical }) => {
          const relevant = selected.impacts.includes(id);
          return <motion.div key={`${input}-${id}`} tabIndex={0} aria-describedby={`impact-${id}`} className={`${styles.impact} ${relevant ? styles.selectedImpact : styles.mutedImpact}`} initial={{ opacity: .4 }} animate={{ opacity: relevant ? 1 : .4 }} transition={{ duration, delay: delay * 3 }}>
            <Icon aria-hidden="true" /><strong>{title}</strong>
            <span role="tooltip" id={`impact-${id}`} className={styles.tooltip}>{technical}</span>
          </motion.div>;
        })}</div>
        <motion.p key={input} className={styles.impactDetail} aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration, delay: delay * 3 }}>{selected.detail}</motion.p>
      </section>
    </div>
    <p className={styles.evidenceNote}>Input guides the investigation. Code and evidence determine whether a vulnerability exists.</p>
  </section>;
}
