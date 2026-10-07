'use client';

import { useEffect, useId, useState } from 'react';
import {
  ArrowPathIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon,
  ChevronLeftIcon, ChevronRightIcon, CodeBracketIcon, DocumentTextIcon,
  FolderIcon, PauseIcon, PlayIcon, ShieldCheckIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { DFBENCH_RESULT, CYBER_SCENARIOS, type CyberRun, type CyberScenario } from '@/lib/cyber-fixture';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { CYBER_ATTACKS } from '@/lib/cyber-attacks';
import { CyberAttackDemo } from './CyberAttackDemo';
import { trackInteraction } from '@/lib/analytics';
import styles from './CyberDefenseDemo.module.css';

const STEPS = ['Repository map', 'Threat model', 'Data-flow trace', 'Input source', 'Propagation', 'Sink'] as const;
const PHASES = [{ label: 'Repository map', step: 0 }, { label: 'Threat model', step: 1 }, { label: 'Data-flow trace', step: 2 }];
const STEP_INTERVAL = 3500;

function FindingTiles({ run }: { run: CyberRun }) {
  return (
    <ul className={styles.findingTiles} role="list" aria-label={`${run.findingsCount} submitted findings`}>
      {run.findings.flatMap((finding) => Array.from({ length: finding.count }, (_, index) => (
        <li key={`${finding.title}-${index}`} className={finding.referenceMatch === 'matched' ? styles.matchedTile : styles.otherTile}>
          {finding.referenceMatch === 'matched' ? <ShieldCheckIcon /> : <DocumentTextIcon />}
          <span>{finding.referenceMatch === 'matched' ? 'Found' : 'Other'}</span>
          <span className={styles.srOnly}>{finding.title}, finding {index + 1} of {finding.count}</span>
        </li>
      )))}
    </ul>
  );
}

function ReportCard({ run, trained }: { run: CyberRun; trained: boolean }) {
  return (
    <section className={`${styles.reportCard} ${trained ? styles.trainedCard : ''}`} aria-label={trained ? 'Final checkpoint reports' : 'Earlier checkpoint reports'}>
      <span className={styles.eyebrow}>{trained ? 'FINAL CHECKPOINT' : 'EARLIER CHECKPOINT'}</span>
      <h4 className={run.matchedCount ? styles.found : styles.missed}>{run.matchedCount ? <ShieldCheckIcon /> : <XMarkIcon />}{run.matchedCount ? 'Known flaw found' : 'Known flaw missed'}</h4>
      <FindingTiles run={run} />
      <ul>{run.findings.map((finding) => <li key={finding.title}><span className={finding.referenceMatch === 'matched' ? styles.found : ''}>{finding.count}×</span><span>{finding.title}</span></li>)}</ul>
    </section>
  );
}

function ReportComparison({ scenario }: { scenario: CyberScenario }) {
  return (
    <section className={styles.comparison} aria-label="Recorded report comparison">
      {[scenario.before, scenario.after].map((run, index) => {
        const referenceReports = run.findings.reduce((count, finding) => count + (finding.referenceMatch === 'matched' ? finding.count : 0), 0);
        return <div className={styles.checkpointResult} key={index}>
          <header><span className={styles.eyebrow}>{index === 0 ? 'EARLIER · STEP 5' : 'FINAL · STEP 200'}</span><span>{run.findingsCount} {run.findingsCount === 1 ? 'report' : 'reports'}</span></header>
          <div className={styles.reportInventory}>
            {run.matchedCount === 0 && <div className={styles.missingTile}><XMarkIcon /><span>Missed</span></div>}
            <FindingTiles run={run} />
          </div>
          <div className={run.matchedCount ? styles.matchCaption : styles.missCaption}>
            {run.matchedCount ? <CheckIcon /> : <XMarkIcon />}
            <span>{run.matchedCount ? scenario.focus === 'focus' ? `${referenceReports} ${referenceReports === 1 ? 'report' : 'reports'} · same flaw` : 'Known flaw found' : 'Known flaw missed'}</span>
          </div>
          <p className={styles.checkpointExplanation}>{index === 0 ? CYBER_ATTACKS[scenario.id].training.before : CYBER_ATTACKS[scenario.id].training.after}</p>
          <p className={styles.verifierResult}>Verifier: {run.matchedCount} / {run.referenceTotal} reference vulnerabilities matched</p>
        </div>;
      })}
      <span className={styles.comparisonArrow} aria-hidden="true"><ArrowRightIcon /></span>
    </section>
  );
}

function Storyboard({ scenario }: { scenario: CyberScenario }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visual = CYBER_VISUALS[scenario.id];
  const lastStep = STEPS.length - 1;
  const activePhase = Math.min(step, 2);
  const snippet = visual.code[Math.max(0, Math.min(step - 3, visual.code.length - 1))];
  const caption = step === 0 ? visual.captions.map : step === 1 ? visual.captions.threat : step === 2 ? visual.captions.discovery : snippet.explanation;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(step + 1, lastStep);
      setStep(next);
      if (next === lastStep) setPlaying(false);
    }, STEP_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [playing, step, lastStep]);

  useEffect(() => {
    function pauseWhenHidden() {
      if (document.hidden) setPlaying(false);
    }
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  function navigate(next: number) {
    setPlaying(false);
    setStep(next);
  }

  function play() {
    if (playing) {
      setPlaying(false);
      return;
    }
    trackInteraction('evaluation_run', { use_case: 'cyber', scenario: scenario.id });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(lastStep);
      return;
    }
    const next = step === lastStep ? 0 : step + 1;
    setStep(next);
    setPlaying(next !== lastStep);
  }

  return (
    <>
      <section className={styles.story} aria-label="Source analysis walkthrough">
        <nav className={styles.phases} aria-label="Source analysis phases">
          {PHASES.map((phase, index) => <button key={phase.label} className={index < activePhase ? styles.phaseDone : ''} aria-current={index === activePhase ? 'step' : undefined} onClick={() => navigate(phase.step)}><span /><strong>{phase.label}</strong></button>)}
        </nav>
        <div className={styles.scene}>
          <div className={styles.sceneHeading}><span className={styles.sceneIcon}>{step < 2 ? <FolderIcon /> : <CodeBracketIcon />}</span><div><span className={styles.eyebrow}>{step >= 3 && step <= 5 ? snippet.title : STEPS[step]}</span><p>{caption}</p></div></div>
          {step === 0 && <div className={styles.fileTree} aria-label="Relevant repository files">
            <div className={styles.treeRoot}><FolderIcon />{scenario.repo.split('/').at(-1)}<span>reviewed code</span></div>
            {visual.files.map((file) => <div key={file.path} className={`${styles.treeRow} ${file.focus ? styles.focusFile : ''}`} style={{ paddingLeft: `${18 + file.depth * 19}px` }}>
              {file.path.endsWith('/') ? <FolderIcon /> : <DocumentTextIcon />}<code title={file.path}>{file.path.endsWith('/') ? `${file.depth > 0 ? '…/' : ''}${file.path.split('/').filter(Boolean).at(-1)}/` : file.path.split('/').at(-1)}</code>{file.focus && <span>known flaw</span>}
            </div>)}
            <p className={styles.sceneNote}>Highlighted files contain the vulnerable code path.</p>
          </div>}
          {(step === 1 || step === 2) && <>
            <div className={`${styles.flow} ${step === 2 ? styles.activeFlow : ''}`} aria-label="How the input reaches the unsafe operation">
              {visual.flow.map((node, index) => <div className={styles.flowSegment} key={node.label}>
                {index > 0 && <span className={styles.connector}><ArrowRightIcon /></span>}
                <div className={styles.flowNode}><span className={styles.nodeIndex}>{['SOURCE', 'PROPAGATION', 'SINK'][index]}</span><code>{node.label}</code><p>{node.detail}</p></div>
              </div>)}
            </div>
            <p className={styles.sceneNote}>Trace the input from its source to the sink: the operation where it becomes dangerous.</p>
          </>}
          {step >= 3 && step <= 5 && <>
            <nav className={styles.sourceFlow} aria-label="Follow the data flow">{visual.flow.map((node, index) => <button key={node.label} className={snippet.node > index ? styles.sourceVisited : ''} aria-current={snippet.node === index ? 'step' : undefined} onClick={() => navigate(index + 3)}><span>{snippet.node > index ? <CheckIcon /> : index + 1}</span>{node.label}{index < 2 && <ArrowRightIcon />}</button>)}</nav>
            <div className={styles.source}>
            <div className={styles.sourceHeader}><code>{snippet.path}</code><span>Reviewed code</span></div>
            <pre tabIndex={0} aria-label="Source excerpt at the evaluated revision">{snippet.lines.map((line) => <span key={line.number} className={line.highlight ? styles.highlightLine : ''}><span className={styles.lineNumber}>{line.number}</span><code>{line.text || ' '}</code></span>)}</pre>
          </div></>}

        </div>
        <footer className={styles.playback}>
          <span className={styles.srOnly} role="status">{playing ? 'Playing source analysis' : `Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}.`}</span>
          <button className={styles.iconButton} onClick={() => navigate(step - 1)} disabled={step === 0} aria-label="Previous step"><ChevronLeftIcon /></button>
          <button className={styles.playButton} onClick={play}>{playing ? <PauseIcon /> : step === lastStep ? <ArrowPathIcon /> : <PlayIcon />}{playing ? 'Pause' : step === lastStep ? 'Replay' : 'Play'}</button>
          <button className={styles.iconButton} onClick={() => navigate(step + 1)} disabled={step === lastStep} aria-label="Next step"><ChevronRightIcon /></button>
          <input type="range" aria-label="Source analysis timeline" aria-valuetext={`${step + 1} of ${STEPS.length}: ${STEPS[step]}`} min={0} max={lastStep} value={step} onChange={(event) => navigate(Number(event.target.value))} />
          <span className={styles.stepCount}>{step + 1} / {STEPS.length}</span>
        </footer>
      </section>
      <p className={styles.replayNote}>Source walkthrough at the evaluated repository revision</p>
    </>
  );
}

const VIEWS = [
  { id: 'attack', label: 'Attack pattern' },
  { id: 'review', label: 'Source analysis' },
  { id: 'training', label: 'Training results' },
] as const;

export function CyberDefenseDemo() {
  const [selectedId, setSelectedId] = useState(CYBER_SCENARIOS[0].id);
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('attack');
  const tabId = useId();
  const scenario = CYBER_SCENARIOS.find((item) => item.id === selectedId) ?? CYBER_SCENARIOS[0];
  const attack = CYBER_ATTACKS[scenario.id];
  const benchmark = DFBENCH_RESULT;
  return (
    <div className={styles.demo}>
      <div className={styles.introduction}><div><span className={styles.eyebrow}>DEPTHFIRST / NEMOTRON 3.5 LIGHTNING</span><h3>From security flaws to better reviews</h3></div>
        <div className={styles.scenarios} aria-label="Choose a security example">{CYBER_SCENARIOS.map((item) => <button key={item.id} aria-pressed={item.id === selectedId} onClick={() => setSelectedId(item.id)}>{item.id === 'cosmos' ? 'COSMOS' : item.repo.split('/').at(-1)}</button>)}</div>
      </div>
      <p className={styles.exampleContext}>{attack.context}</p>
      <div className={styles.viewTabs} role="tablist" aria-label="Explore this security example">
        {VIEWS.map((item, index) => <button key={item.id} id={`${tabId}-${item.id}-tab`} role="tab" aria-selected={view === item.id} aria-controls={`${tabId}-${item.id}-panel`} tabIndex={view === item.id ? 0 : -1} onClick={() => setView(item.id)} onKeyDown={(event) => {
          const nextIndex = event.key === 'ArrowRight' ? (index + 1) % VIEWS.length : event.key === 'ArrowLeft' ? (index + VIEWS.length - 1) % VIEWS.length : event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1 : null;
          if (nextIndex === null) return;
          event.preventDefault();
          setView(VIEWS[nextIndex].id);
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
        }}>{item.label}</button>)}
      </div>
      {VIEWS.map((item) => <section key={item.id} id={`${tabId}-${item.id}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${item.id}-tab`} hidden={view !== item.id} tabIndex={0}>
        {view === item.id && item.id === 'attack' && <>
          <CyberAttackDemo key={scenario.id} attack={attack} scenarioId={scenario.id} />
          <button className={styles.continueButton} onClick={() => { setView('training'); document.getElementById(`${tabId}-training-tab`)?.focus(); }}>Compare checkpoint results<ArrowRightIcon /></button>
        </>}
        {view === item.id && item.id === 'review' && <>
          <div className={styles.storyHeader}><div><span className={styles.eyebrow}>WHERE THE VULNERABILITY APPEARS IN CODE</span><h4>{scenario.reference.title}</h4></div><div className={styles.repo}>{scenario.cve}</div></div>
          <Storyboard key={scenario.id} scenario={scenario} />
        </>}
        {view === item.id && item.id === 'training' && <>
          <div className={styles.trainingHeading}><span className={styles.eyebrow}>POST-TRAINING · CHECKPOINT COMPARISON</span><h4>{scenario.title}</h4><p>{attack.training.takeaway}</p></div>
          <p className={styles.trainingNote}>Same repository revision, early checkpoint (step 5) vs. final checkpoint (step 200). Both have already received reinforcement learning (RL) training.</p>
          <ReportComparison scenario={scenario} />
          <p className={styles.trainingNote}>Green tiles match the reference vulnerability; dashed tiles mark a miss. Other reports were not fully assessed.</p>
          <details className={styles.reportDetails}><summary>Inspect submitted reports</summary><div className={styles.reports}><ReportCard run={scenario.before} trained={false} /><ReportCard run={scenario.after} trained /></div></details>
          <button className={styles.continueButton} onClick={() => { setView('review'); document.getElementById(`${tabId}-review-tab`)?.focus(); }}>Inspect the source analysis<ArrowRightIcon /></button>
          <section className={styles.benchmark} aria-label="dfbench evaluation">
            <div className={styles.benchmarkHeader}>
              <div><a href="https://depthfirst.com/research/dfbench" target="_blank" rel="noopener noreferrer">dfbench<ArrowTopRightOnSquareIcon /></a><p>Broader evaluation · separate step-180 run</p></div>
              <div className={styles.recall}><span>Vulnerability recall</span><strong>{benchmark.before.recall}% <span>→</span> {benchmark.after.recall}%</strong><small>+{(benchmark.after.recall - benchmark.before.recall).toFixed(1)} percentage points</small></div>
            </div>
            <p className={styles.benchmarkDescription}>Find vulnerabilities in applications, system software, and smart contracts. Tasks can span several components or codebases. Recall is the share of known vulnerabilities found.</p>
            <div className={styles.benchmarkTasks} aria-label="Full dfbench scope">
              <div><strong>253</strong><span>real-world examples</span></div>
              <div><strong>910</strong><span>known vulnerabilities</span></div>
              <div><strong>17</strong><span>languages in vulnerable code</span></div>
            </div>
            <div className={styles.benchmarkFooter}><a href="https://depthfirst.com/research/dfbench-v1" target="_blank" rel="noopener noreferrer">How dfbench works<ArrowTopRightOnSquareIcon /></a><details><summary>Evaluation details</summary><p>Scope statistics describe the full benchmark. Recall compares {benchmark.before.model} and {benchmark.after.model}. The examples above compare steps 5 and 200; step 5 has already received RL training. Fewer duplicate reports do not prove higher precision.</p></details></div>
          </section>
        </>}
      </section>)}
    </div>
  );
}
