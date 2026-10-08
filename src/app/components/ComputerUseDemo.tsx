'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  CubeTransparentIcon,
  PhotoIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import styles from './ComputerUseDemo.module.css';

const TASKS = [
  {
    id: 'video',
    label: 'Photoshop your video',
    shortLabel: 'Video editing',
    icon: PhotoIcon,
    goal: 'Turn a raw product clip into a polished, social-ready video.',
    details: 'Remove unwanted frames, correct the color, add the approved title card, and export the requested format.',
    baseOutcome: 'Partial workflow',
    baseSummary: 'Completes isolated edits but loses track of the full sequence and export requirements.',
    tunedOutcome: 'Goal completed',
    tunedSummary: 'Plans the complete edit, verifies each change, and exports the finished asset in the requested format.',
  },
  {
    id: 'expense',
    label: 'Validate your travel expense',
    shortLabel: 'Expense review',
    icon: ReceiptPercentIcon,
    goal: 'Review a submitted travel expense and determine whether it is ready for approval.',
    details: 'Check the receipt, merchant, date, amount, and policy requirements, then flag only the items that need review.',
    baseOutcome: 'Needs guidance',
    baseSummary: 'Reads the visible fields but misses cross-checks between the receipt, form, and company policy.',
    tunedOutcome: 'Review completed',
    tunedSummary: 'Cross-checks the evidence, explains any exception, and leaves the expense in the correct review state.',
  },
  {
    id: 'cad',
    label: 'Adjust CAD object',
    shortLabel: 'CAD adjustment',
    icon: CubeTransparentIcon,
    goal: 'Update the requested CAD object while preserving the design constraints.',
    details: 'Select the correct part, change the specified dimension, confirm the assembly still resolves, and save a new version.',
    baseOutcome: 'Constraint risk',
    baseSummary: 'Changes the geometry but may select the wrong feature or break an existing assembly constraint.',
    tunedOutcome: 'Goal completed',
    tunedSummary: 'Identifies the intended feature, applies the exact change, validates the assembly, and saves a recoverable version.',
  },
] as const;

export default function ComputerUseDemo() {
  const [activeId, setActiveId] = useState<(typeof TASKS)[number]['id']>('video');
  const activeTask = TASKS.find((task) => task.id === activeId) ?? TASKS[0];
  const ActiveIcon = activeTask.icon;

  return (
    <div className={`${styles.demo} computer-use-content`}>
      <header className={styles.partnerBar}>
        <div className={styles.partner} aria-label="H Company">
          <span className={styles.hMark}>H</span>
          <span><strong>H COMPANY</strong><small>Computer use partner</small></span>
        </div>
        <span className={styles.previewNote}>Illustrative workflow preview · benchmark metrics pending</span>
      </header>

      <nav className={styles.tabs} role="tablist" aria-label="Computer use tasks">
        {TASKS.map((task) => {
          const Icon = task.icon;
          const active = task.id === activeId;
          return (
            <button
              key={task.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? styles.activeTab : undefined}
              onClick={() => setActiveId(task.id)}
            >
              <Icon />
              <span>{task.label}</span>
            </button>
          );
        })}
      </nav>

      <section className={styles.goal} aria-labelledby={`goal-${activeTask.id}`}>
        <span className={styles.goalIcon}><ActiveIcon /></span>
        <div>
          <small>GOAL · {activeTask.shortLabel}</small>
          <h3 id={`goal-${activeTask.id}`}>{activeTask.goal}</h3>
          <p>{activeTask.details}</p>
        </div>
      </section>

      <section className={styles.comparison} aria-label="Model performance comparison">
        <div className={styles.comparisonHeading}>
          <span>PERFORMANCE COMPARISON</span>
          <small>Observed task behavior</small>
        </div>
        <div className={styles.modelGrid}>
          <article className={styles.baseModel}>
            <header><span>BASE MODEL</span><h4>Nemotron 3 Nano Omni</h4></header>
            <div className={styles.outcome}><i />{activeTask.baseOutcome}</div>
            <p>{activeTask.baseSummary}</p>
            <footer><span>Task execution</span><strong>General capability</strong></footer>
          </article>

          <div className={styles.arrow} aria-hidden="true">→</div>

          <article className={styles.tunedModel}>
            <header><span>POST-TRAINED NEMOTRON</span><h4>Holotron 4 Nano</h4></header>
            <div className={styles.outcome}><CheckCircleIcon />{activeTask.tunedOutcome}</div>
            <p>{activeTask.tunedSummary}</p>
            <footer><span>Task execution</span><strong>Domain-specialized</strong></footer>
          </article>
        </div>
      </section>
    </div>
  );
}
