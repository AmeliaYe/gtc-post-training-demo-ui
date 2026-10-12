'use client';

import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
  CircleStackIcon,
  CpuChipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import styles from './PostTrainingLanding.module.css';

const steps = [
  {
    number: '01',
    title: 'Domain tasks',
    icon: CircleStackIcon,
  },
  {
    number: '02',
    title: 'Nemotron Model',
    icon: CpuChipIcon,
  },
  {
    number: '03',
    title: 'Practice and Get Rewarded in RL Environments',
    icon: CheckBadgeIcon,
  },
  {
    number: '04',
    title: 'Collect Rollouts and Retrain',
    icon: SparklesIcon,
  },
];

export default function PostTrainingLanding({ onContinue }: { onContinue: () => void }) {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>POST-TRAINING ON DGX STATION</span>
          <h1>Practice. Get feedback. Improve.</h1>
        </div>
        <button type="button" className={styles.continueButton} onClick={onContinue}>
          Explore use cases <ArrowRightIcon aria-hidden="true" />
        </button>
      </header>

      <section className={styles.workflow} aria-labelledby="workflow-title">
        <div className={styles.workflowHeading}>
          <div>
            <span id="workflow-title">HOW POST-TRAINING WORKS</span>
          </div>
          <span className={styles.localPill}><i /> Runs locally</span>
        </div>

        <div className={styles.flow}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div className={styles.flowItem} key={step.number}>
                <article className={styles.step}>
                  <div className={styles.stepTop}>
                    <span className={styles.number}>{step.number}</span>
                    <span className={`${styles.icon} ${index === 1 ? styles.nemotronIcon : ''}`}>
                      {index === 1
                        ? <img src="/healthcare/r01/assets/architecture-r04/nemotron.png" alt="" />
                        : <Icon aria-hidden="true" />}
                    </span>
                  </div>
                  <div>
                    <h3>{step.title}</h3>
                  </div>
                </article>
                {index < steps.length - 1 && (
                  <span className={styles.connector} aria-hidden="true">
                    <i /><ArrowRightIcon />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.loop} aria-label="Repeat and continuously improve the Nemotron model">
          <span className={styles.loopLine} aria-hidden="true"><i /></span>
          <span className={styles.loopLabel}><ArrowPathIcon aria-hidden="true" /> Repeat and Continuously Improve</span>
        </div>

        <footer className={styles.platform}>
          <span>YOUR DATA</span><i />
          <span>YOUR INFRASTRUCTURE</span><i />
          <span>YOUR SPECIALIZED NEMOTRON</span>
        </footer>
      </section>
    </div>
  );
}
