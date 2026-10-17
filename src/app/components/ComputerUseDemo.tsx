'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  CpuChipIcon,
  CubeTransparentIcon,
  ReceiptPercentIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import styles from './ComputerUseDemo.module.css';
import HCompanyLogo from './HCompanyLogo';

type ResultPlaybackProps = {
  videoSrc: string;
  resultSrc: string;
  videoAlt: string;
  resultAlt: string;
  variant: 'base' | 'tuned';
  showExpenseChecklist?: boolean;
  onStateChange: (state: PlaybackState) => void;
  compact?: boolean;
};

type PlaybackState = 'ready' | 'running' | 'finished';

const EXPENSE_STEPS = [
  'Found the Volkshochschule Rheintal draft invoice',
  'Validated the invoice',
  'Recorded payment by bank transfer, current account',
  'Paid in full, invoice shows as settled',
  'Reported the task as done',
] as const;

function ExpenseGoalState({ complete }: { complete: boolean }) {
  return (
    <article className={`${styles.expenseGoalState} ${complete ? styles.expenseGoalComplete : styles.expenseGoalPending}`}>
      <header>
        <small>{complete ? 'GOAL' : 'STARTING STATE'}</small>
        <strong>{complete ? 'Invoice issued and settled' : 'Invoice not yet processed'}</strong>
      </header>
      <div>
        {EXPENSE_STEPS.map((step) => (
          <span key={step}>{complete ? <CheckCircleIcon /> : <XCircleIcon />}{step}</span>
        ))}
      </div>
    </article>
  );
}

function ExpenseBenchmarkResult({ variant }: { variant: 'base' | 'tuned' }) {
  const tuned = variant === 'tuned';
  const passed = tuned ? [true, true, true, true, true] : [true, false, false, false, false];
  return (
    <div className={`${styles.expenseResult} ${tuned ? styles.expenseResultSuccess : styles.expenseResultFailure}`}>
      <header>
        {tuned ? <CheckCircleIcon /> : <XCircleIcon />}
        <strong>{tuned ? 'Invoice issued and settled' : 'Invoice never validated'}</strong>
      </header>
      <div className={styles.expenseResultSteps}>
        {EXPENSE_STEPS.map((step, index) => (
          <span key={step} className={passed[index] ? styles.resultPassed : styles.resultFailed}>
            {passed[index] ? <CheckCircleIcon /> : <XCircleIcon />}
            <b>{step}</b>
            {!tuned && index === 1 && <em>left as draft</em>}
            {!tuned && index === 4 && <em>hit 100-step limit</em>}
          </span>
        ))}
      </div>
      <div className={styles.expenseResultMeta}>
        <span><b>{tuned ? '40' : '100'}</b> steps</span>
        <span><b>{tuned ? '9' : '45'}</b> min</span>
        <span><b>{tuned ? '0.5M' : '4.0M'}</b> tokens</span>
        <strong>{tuned ? '6 of 6 passed' : '0 of 11 passed'}</strong>
      </div>
    </div>
  );
}

function ResultPlayback({
  videoSrc,
  resultSrc,
  videoAlt,
  resultAlt,
  variant,
  showExpenseChecklist = false,
  onStateChange,
  compact = false,
}: ResultPlaybackProps) {
  const [finished, setFinished] = useState(false);
  const [expenseProgress, setExpenseProgress] = useState(0);

  const replay = () => {
    setFinished(false);
    setExpenseProgress(0);
    onStateChange('ready');
  };

  return (
    <div className={`${styles.playbackShell} ${compact ? styles.cadPlayback : ''} ${showExpenseChecklist ? styles.expensePlayback : ''}`}>
      {finished ? (
        <>
          {showExpenseChecklist
            ? <ExpenseBenchmarkResult variant={variant} />
            : <img className={styles.finalFrame} src={resultSrc} alt={resultAlt} />}
          <span className={styles.resultLabel}>{variant === 'tuned' && <CheckCircleIcon />}{variant === 'tuned' ? 'Successful end state' : 'Failed end state'}</span>
          <button type="button" className={styles.replayButton} onClick={replay}>Replay</button>
        </>
      ) : (
        <video
          className={styles.taskPlayback}
          src={videoSrc}
          aria-label={videoAlt}
          autoPlay
          muted
          playsInline
          controls
          preload="auto"
          onPlay={() => onStateChange('running')}
          onTimeUpdate={(event) => {
            if (!showExpenseChecklist || variant === 'base') return;
            const currentTime = event.currentTarget.currentTime;
            const nextProgress = currentTime >= 27 ? 2 : currentTime >= 3 ? 1 : 0;
            setExpenseProgress(nextProgress);
            if (nextProgress === 2) onStateChange('finished');
          }}
          onEnded={() => {
            setFinished(true);
            if (showExpenseChecklist && variant === 'tuned') setExpenseProgress(2);
            onStateChange('finished');
          }}
        />
      )}
      {showExpenseChecklist && !finished && (
        <div className={`${styles.expenseVideoChecklist} ${expenseProgress === 2 ? styles.expenseVideoComplete : ''}`}>
          <strong>{expenseProgress === 2 ? 'ALL VALIDATIONS PASSED' : 'TASK CHECKLIST'}</strong>
          <span className={expenseProgress >= 1 ? styles.checkDone : undefined}>{expenseProgress >= 1 ? <CheckCircleIcon /> : <i />} Invoice validated</span>
          <span className={expenseProgress >= 2 ? styles.checkDone : undefined}>{expenseProgress >= 2 ? <CheckCircleIcon /> : <i />} Payment recorded</span>
        </div>
      )}
    </div>
  );
}

const TASKS = [
  {
    id: 'cad',
    label: 'Adjust CAD object',
    shortLabel: 'CAD adjustment',
    icon: CubeTransparentIcon,
    goal: 'I need to modify a CAD object',
    details: 'Change the middle block height from 20 mm to 12 mm and verify the final geometry.',
    baseOutcome: 'Verification failed',
    baseSummary: 'Reports success, but the middle block remains at 20 mm.',
    tunedOutcome: 'Change verified',
    tunedSummary: 'Changes the middle block to 12 mm and verifies the final dimension.',
  },
  {
    id: 'circuit',
    label: 'Set a resistor value',
    shortLabel: 'Circuit editing',
    icon: CpuChipIcon,
    goal: 'I need to update a circuit schematic',
    details: 'R1 and R2 are in parallel. Calculate R2 so the equivalent resistance is 2 kΩ, enter the value, and save the schematic.',
    baseOutcome: 'Task failed',
    baseSummary: 'The base model fails after 69 actions without setting the resistor value.',
    tunedOutcome: 'Task passed',
    tunedSummary: 'The post-trained model calculates and sets R2 to 3 kΩ in 9 actions, then saves the schematic.',
  },
  {
    id: 'expense',
    label: 'Validate your travel expense',
    shortLabel: 'Expense review',
    icon: ReceiptPercentIcon,
    goal: 'I need to validate a travel expense',
    details: 'Find the invoice in Dolibarr, validate it, and record the collected payment.',
    baseOutcome: 'Task incomplete',
    baseSummary: 'Does not finish the invoice validation and payment workflow.',
    tunedOutcome: 'Task completed',
    tunedSummary: 'Validates the invoice and records the collected payment.',
  },
] as const;

export default function ComputerUseDemo() {
  const [activeId, setActiveId] = useState<(typeof TASKS)[number]['id']>('cad');
  const [page, setPage] = useState<'goal' | 'comparison'>('goal');
  const [transitioning, setTransitioning] = useState(false);
  const [baseState, setBaseState] = useState<PlaybackState>('ready');
  const [tunedState, setTunedState] = useState<PlaybackState>('ready');
  const activeTask = TASKS.find((task) => task.id === activeId) ?? TASKS[0];
  const ActiveIcon = activeTask.icon;
  const isCircuitTask = activeTask.id === 'circuit';
  const isExpenseTask = activeTask.id === 'expense';
  const isCadTask = activeTask.id === 'cad';
  const hasVisualTask = isCircuitTask || isExpenseTask || isCadTask;
  const basePlaybackSrc = isCadTask
    ? '/computer-use/cad/nemotron-before.mp4'
    : '/computer-use/expense/nemotron-before.mp4';
  const tunedPlaybackSrc = isCadTask
    ? '/computer-use/cad/holotron-after.mp4'
    : '/computer-use/expense/holotron-after.mp4';
  const baseResultSrc = isCadTask
    ? '/computer-use/cad/original-stack.png'
    : '/computer-use/expense/result-before.png';
  const tunedResultSrc = isCadTask
    ? '/computer-use/cad/changed-stack.png'
    : '/computer-use/expense/result-after.png';
  const originSrc = isCadTask
    ? '/computer-use/cad/original-stack.png'
    : '/computer-use/expense/result-before.png';

  const runTask = () => {
    if (transitioning) return;
    setBaseState('ready');
    setTunedState('ready');
    setTransitioning(true);
    window.setTimeout(() => {
      setPage('comparison');
      setTransitioning(false);
    }, 420);
  };

  const showGoal = () => {
    setTransitioning(false);
    setPage('goal');
  };

  const outcomeLabel = (state: PlaybackState, finalLabel: string) => {
    if (state === 'running') return 'Task in progress';
    if (state === 'finished') return finalLabel;
    return 'Ready to run';
  };

  const summaryLabel = (state: PlaybackState, finalSummary: string) => {
    if (state === 'finished') return finalSummary;
    if (state === 'running') return 'Watching the model work…';
    return 'Run the task to see the outcome.';
  };

  return (
    <div className={`${styles.demo} computer-use-content`}>
      <header className={styles.partnerBar}>
        <div className={styles.partner} aria-label="H Company">
          <span><strong>COMPUTER USE <i>·</i><span className={styles.companyLockup}><HCompanyLogo className={styles.partnerLogo} /><i className={styles.companyDivider} /><b>H COMPANY</b></span></strong><small>Post-trained GUI agent</small></span>
        </div>
        <nav className={styles.pageNav} aria-label="Computer use demo pages">
          <button type="button" className={page === 'goal' ? styles.activePage : undefined} onClick={showGoal}>1&nbsp; Goal</button>
          <button type="button" className={page === 'comparison' ? styles.activePage : undefined} onClick={runTask}>2&nbsp; Model comparison</button>
        </nav>
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
              onClick={() => { setActiveId(task.id); setTransitioning(false); setPage('goal'); }}
            >
              <Icon />
              <span>{task.label}</span>
            </button>
          );
        })}
      </nav>

      {page === 'goal' ? (
        <section className={`${styles.goal} ${styles.goalPage} ${hasVisualTask ? styles.videoGoal : ''} ${transitioning ? styles.goalExit : ''}`} aria-labelledby={`goal-${activeTask.id}`}>
          <span className={styles.goalIcon}><ActiveIcon /></span>
          <div className={styles.goalCopy}>
            <small>TASK</small>
            <h3 id={`goal-${activeTask.id}`}>{activeTask.goal}</h3>
            <p>{activeTask.details}</p>
            <button type="button" className={styles.continueButton} onClick={runTask}>Run task <span>→</span></button>
          </div>
          {isCircuitTask && (
            <figure className={styles.circuitGoalPreview} aria-label="Parallel resistor task preview">
              <img src="/computer-use/kicad/parallel-resistor-poster.png" alt="Nemotron and Holotron starting the same KiCad parallel resistor task" />
              <figcaption><strong>GOAL</strong> Compute R2, set it to 3 kΩ, and save the schematic</figcaption>
            </figure>
          )}
          {isExpenseTask && (
            <div className={styles.expenseGoalFlow} aria-label="Five incomplete invoice steps becoming five completed invoice steps">
              <ExpenseGoalState complete={false} />
              <span aria-hidden="true">→</span>
              <ExpenseGoalState complete />
            </div>
          )}
          {isCadTask && (
            <div className={`${styles.goalFrames} ${styles.goalSequence} ${styles.cadGoalFrames}`} aria-label="Original CAD stack changed to the requested stack">
              <figure>
                <img src="/computer-use/cad/original-stack.png" alt="Original CAD stack with a 20 millimeter middle block" />
                <figcaption><strong>ORIGINAL</strong>Middle block · 20 mm</figcaption>
              </figure>
              <span aria-hidden="true">↓</span>
              <figure>
                <img src="/computer-use/cad/changed-stack.png" alt="Changed CAD stack with a 12 millimeter middle block" />
                <figcaption><strong>REQUESTED CHANGE</strong>Middle block · 12 mm</figcaption>
              </figure>
            </div>
          )}
        </section>
      ) : (
      <section className={`${styles.comparison} ${styles.comparisonPage} ${styles.comparisonEnter}`} aria-label="Model performance comparison">
        <div className={styles.comparisonHeading}>
          <span>PERFORMANCE COMPARISON</span>
          <small>Observed task behavior</small>
        </div>
        {!isCircuitTask && (
          <div className={styles.comparisonOrigin}>
            <img src={originSrc} alt={`Shared starting state for ${activeTask.shortLabel}`} />
            <span><small>SHARED STARTING STATE</small><strong>Same task · same input</strong></span>
          </div>
        )}
        {isCircuitTask ? (
          <div className={styles.compositeComparison}>
            <video
              src="/computer-use/kicad/parallel-resistor-comparison.mp4"
              poster="/computer-use/kicad/parallel-resistor-poster.png"
              aria-label="Side-by-side comparison of Nemotron 3 Nano Omni and Holotron 4 Nano completing the same KiCad parallel resistor task"
              autoPlay
              muted
              playsInline
              controls
              preload="auto"
              onPlay={() => { setBaseState('running'); setTunedState('running'); }}
              onEnded={() => { setBaseState('finished'); setTunedState('finished'); }}
            />
          </div>
        ) : (
        <div className={styles.modelGrid}>
          <article className={styles.baseModel}>
            <header><span>BASE MODEL</span><h4>Nemotron 3 Nano Omni</h4></header>
            <div className={styles.runMeta}>
              <div className={`${styles.outcome} ${baseState === 'running' ? styles.outcomeRunning : ''}`}><i />{outcomeLabel(baseState, activeTask.baseOutcome)}</div>
            </div>
            {hasVisualTask && (
              <ResultPlayback
                key={`${activeTask.id}-base`}
                videoSrc={basePlaybackSrc}
                resultSrc={baseResultSrc}
                variant="base"
                showExpenseChecklist={isExpenseTask}
                onStateChange={setBaseState}
                compact={isCadTask}
                videoAlt={isCadTask ? 'Nemotron attempting the FreeCAD object modification' : 'Nemotron attempting the Dolibarr invoice validation and payment task'}
                resultAlt={isCadTask ? 'Original CAD stack left unchanged by Nemotron' : 'Dolibarr with the invoice and payment actions still incomplete'}
              />
            )}
            <p>{summaryLabel(baseState, activeTask.baseSummary)}</p>
            <footer><span>Task execution</span><strong>General capability</strong></footer>
          </article>

          <div className={styles.arrow} aria-hidden="true">VS</div>

          <article className={styles.tunedModel}>
            <header><span>POST-TRAINED NEMOTRON</span><h4>Holotron 4 Nano</h4></header>
            <div className={styles.runMeta}>
              <div className={`${styles.outcome} ${tunedState === 'running' ? styles.outcomeRunning : ''}`}>{tunedState === 'finished' ? <CheckCircleIcon /> : <i />}{outcomeLabel(tunedState, activeTask.tunedOutcome)}</div>
            </div>
            {hasVisualTask && (
              <ResultPlayback
                key={`${activeTask.id}-tuned`}
                videoSrc={tunedPlaybackSrc}
                resultSrc={tunedResultSrc}
                variant="tuned"
                showExpenseChecklist={isExpenseTask}
                onStateChange={setTunedState}
                compact={isCadTask}
                videoAlt={isCadTask ? 'Holotron completing and verifying the FreeCAD object modification' : 'Holotron completing the Dolibarr invoice validation and payment task'}
                resultAlt={isCadTask ? 'Changed CAD stack with the middle block at 12 millimeters' : 'Dolibarr showing the validated invoice and recorded payment'}
              />
            )}
            <p>{summaryLabel(tunedState, activeTask.tunedSummary)}</p>
            <footer><span>Task execution</span><strong>Domain-specialized</strong></footer>
          </article>
        </div>
        )}
      </section>
      )}
    </div>
  );
}
