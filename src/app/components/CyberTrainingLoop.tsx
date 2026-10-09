import { ArrowPathIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import styles from './CyberTrainingLoop.module.css';

const PHASES = [
  { title: 'Environments', detail: 'Batch of repository tasks' },
  { title: 'Rollouts + rewards', detail: 'Tool calls · verified findings' },
  { title: 'Update LLM weights', detail: null },
  { title: 'New checkpoint', detail: 'Updated model' },
];

export function CyberTrainingLoop({ progress }: { progress: number }) {
  const activePhase = Math.min(PHASES.length - 1, Math.floor(Math.max(0, Math.min(progress, 1)) * PHASES.length));

  return (
    <section className={styles.loop} aria-label="Conceptual reinforcement learning training loop">
      <ol className={styles.steps} aria-label="Repeat this sequence for each training batch">
        {PHASES.map((phase, index) => (
          <li key={phase.title} className={`${styles.step} ${index === activePhase ? styles.active : ''}`} data-phase={index} aria-current={index === activePhase ? 'step' : undefined}>
            <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
            <div>
              <h4>{phase.title}</h4>
              {phase.detail ? <p>{phase.detail}</p> : <p className={styles.weights} aria-label="The reinforcement learning optimizer updates model weights from theta t to theta t plus one using batch feedback"><span aria-hidden="true">θ<sub>t</sub><span className={styles.weightArrow}>→</span>θ<sub>t+1</sub></span></p>}
            </div>
            <ArrowRightIcon className={styles.connector} aria-hidden="true" />
          </li>
        ))}
      </ol>
      <p className={styles.repeat}><ArrowPathIcon aria-hidden="true" /><span>Continual Improvements</span></p>
    </section>
  );
}
