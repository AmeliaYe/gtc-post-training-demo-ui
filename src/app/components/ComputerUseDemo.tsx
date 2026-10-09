'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  CubeTransparentIcon,
  PhotoIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import styles from './ComputerUseDemo.module.css';

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
    <div className={`${styles.playbackShell} ${compact ? styles.cadPlayback : ''}`}>
      {finished ? (
        <>
          <img className={styles.finalFrame} src={resultSrc} alt={resultAlt} />
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
      {showExpenseChecklist && (
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
    id: 'video',
    label: 'Photoshop your video',
    shortLabel: 'Video editing',
    icon: PhotoIcon,
    goal: 'I need to edit a video',
    details: 'Remove the DRAFT watermark, then add an AI watermark at the bottom.',
    baseOutcome: 'Task failed',
    baseSummary: 'The base model does not complete the requested crop reliably.',
    tunedOutcome: 'Task passed',
    tunedSummary: 'The post-trained model completes and verifies the watermark removal.',
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
  const isVideoTask = activeTask.id === 'video';
  const isExpenseTask = activeTask.id === 'expense';
  const isCadTask = activeTask.id === 'cad';
  const hasVisualTask = isVideoTask || isExpenseTask || isCadTask;
  const basePlaybackSrc = isCadTask
    ? '/computer-use/cad/nemotron-before.mp4'
    : isExpenseTask
      ? '/computer-use/expense/nemotron-before.mp4'
      : '/computer-use/video-editing/nemotron-before.mp4';
  const tunedPlaybackSrc = isCadTask
    ? '/computer-use/cad/holotron-after.mp4'
    : isExpenseTask
      ? '/computer-use/expense/holotron-after.mp4'
      : '/computer-use/video-editing/holotron-after.mp4';
  const baseResultSrc = isCadTask
    ? '/computer-use/cad/original-stack.png'
    : isExpenseTask
      ? '/computer-use/expense/result-before.png'
      : '/computer-use/video-editing/source-draft.png';
  const tunedResultSrc = isCadTask
    ? '/computer-use/cad/changed-stack.png'
    : isExpenseTask
      ? '/computer-use/expense/result-after.png'
      : '/computer-use/video-editing/target-ai-bottom.png';
  const originSrc = isCadTask
    ? '/computer-use/cad/original-stack.png'
    : isExpenseTask
      ? '/computer-use/expense/result-before.png'
      : '/computer-use/video-editing/source-draft.png';

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
          <span className={styles.hMark}>H</span>
          <span><strong>COMPUTER USE · H COMPANY</strong><small>Post-trained GUI agent</small></span>
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
          {isVideoTask && (
            <div className={`${styles.goalFrames} ${styles.videoGoalFrames}`} aria-label="Source frame and requested result">
              <figure>
                <img src="/computer-use/video-editing/source-draft.png" alt="Source video frame with a DRAFT watermark at the top" />
                <figcaption><strong>BEFORE</strong>DRAFT watermark at top</figcaption>
              </figure>
              <span aria-hidden="true">→</span>
              <figure>
                <img src="/computer-use/video-editing/target-ai-bottom.png" alt="Requested video frame with DRAFT removed and an AI watermark at the bottom" />
                <figcaption><strong>GOAL</strong>DRAFT removed · AI at bottom</figcaption>
              </figure>
            </div>
          )}
          {isExpenseTask && (
            <div className={`${styles.goalFrames} ${styles.expenseGoalFrames}`} aria-label="Unchecked invoice and payment becoming validated and recorded">
              <figure>
                <img src="/computer-use/expense/result-before.png" alt="Dolibarr before the invoice is validated or its payment is recorded" />
                <div className={`${styles.expenseChecklist} ${styles.pendingChecklist}`}>
                  <strong>VALIDATION INCOMPLETE</strong>
                  <small>2 checks remaining</small>
                  <span><i /> Validate the invoice</span>
                  <span><i /> Record the payment</span>
                </div>
                <figcaption><strong>BEFORE</strong>Two actions still open</figcaption>
              </figure>
              <span aria-hidden="true">→</span>
              <figure>
                <img src="/computer-use/expense/result-after.png" alt="Dolibarr after the invoice is validated and its payment is recorded" />
                <div className={`${styles.expenseChecklist} ${styles.completeChecklist}`}>
                  <strong>ALL VALIDATIONS PASSED</strong>
                  <small>Every required check is complete</small>
                  <span><CheckCircleIcon /> Invoice validated</span>
                  <span><CheckCircleIcon /> Payment recorded</span>
                </div>
                <figcaption><strong>GOAL</strong>Both actions completed</figcaption>
              </figure>
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
        <div className={styles.comparisonOrigin}>
          <img src={originSrc} alt={`Shared starting state for ${activeTask.shortLabel}`} />
          <span><small>SHARED STARTING STATE</small><strong>Same task · same input</strong></span>
        </div>
        <div className={styles.branchPaths} aria-hidden="true"><span>↙</span><span>↘</span></div>
        <div className={styles.modelGrid}>
          <article className={styles.baseModel}>
            <header><span>BASE MODEL</span><h4>Nemotron 3 Nano Omni</h4></header>
            <div className={styles.runMeta}>
              <div className={`${styles.outcome} ${baseState === 'running' ? styles.outcomeRunning : ''}`}><i />{outcomeLabel(baseState, activeTask.baseOutcome)}</div>
              {isVideoTask && <span className={styles.elapsed}>Real time elapsed <strong>45 min</strong></span>}
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
                videoAlt={isCadTask ? 'Nemotron attempting the FreeCAD object modification' : isExpenseTask ? 'Nemotron attempting the Dolibarr invoice validation and payment task' : 'Nemotron before post-training attempting the video-editing task'}
                resultAlt={isCadTask ? 'Original CAD stack left unchanged by Nemotron' : isExpenseTask ? 'Dolibarr with the invoice and payment actions still incomplete' : 'Source video frame with the DRAFT watermark still at the top'}
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
              {isVideoTask && <span className={styles.elapsed}>Real time elapsed <strong>12.6 min</strong></span>}
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
                videoAlt={isCadTask ? 'Holotron completing and verifying the FreeCAD object modification' : isExpenseTask ? 'Holotron completing the Dolibarr invoice validation and payment task' : 'Holotron after post-training completing the video-editing task'}
                resultAlt={isCadTask ? 'Changed CAD stack with the middle block at 12 millimeters' : isExpenseTask ? 'Dolibarr showing the validated invoice and recorded payment' : 'Final video frame with DRAFT removed and AI at the bottom'}
              />
            )}
            <p>{summaryLabel(tunedState, activeTask.tunedSummary)}</p>
            <footer><span>Task execution</span><strong>Domain-specialized</strong></footer>
          </article>
        </div>
      </section>
      )}
    </div>
  );
}
