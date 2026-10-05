'use client';

import { useEffect, useState } from 'react';
import {
  ArrowPathIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon,
  ChevronLeftIcon, ChevronRightIcon, CodeBracketIcon, DocumentTextIcon,
  FolderIcon, PauseIcon, PlayIcon, ShieldCheckIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { DFBENCH_RESULT, CYBER_SCENARIOS, type CyberRun, type CyberScenario } from '@/lib/cyber-fixture';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { trackInteraction } from '@/lib/analytics';
import styles from './CyberDefenseDemo.module.css';

const STEPS = ['Repository map', 'Threat model', 'Discovery: input flow', 'Discovery: input', 'Discovery: follow the input', 'Discovery: risky operation', 'Validation', 'Report'] as const;
const PHASES = [{ label: 'Map', step: 0 }, { label: 'Threat model', step: 1 }, { label: 'Discovery', step: 2 }, { label: 'Validate', step: 6 }, { label: 'Report', step: 7 }];
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
    <section className={`${styles.reportCard} ${trained ? styles.trainedCard : ''}`} aria-label={trained ? 'Post-trained report' : 'Early report'}>
      <span className={styles.eyebrow}>{trained ? 'FINAL CHECKPOINT' : 'EARLIER CHECKPOINT'}</span>
      <h4 className={run.matchedCount ? styles.found : styles.missed}>{run.matchedCount ? <ShieldCheckIcon /> : <XMarkIcon />}{run.matchedCount ? 'Known flaw found' : 'Known flaw missed'}</h4>
      <FindingTiles run={run} />
      <ul>{run.findings.map((finding) => <li key={finding.title}><span className={finding.referenceMatch === 'matched' ? styles.found : ''}>{finding.count}×</span><span>{finding.title}</span></li>)}</ul>
    </section>
  );
}

function Storyboard({ scenario }: { scenario: CyberScenario }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visual = CYBER_VISUALS[scenario.id];
  const lastStep = STEPS.length - 1;
  const activePhase = step < 2 ? step : step < 6 ? 2 : step - 3;
  const snippet = visual.code[Math.max(0, Math.min(step - 3, visual.code.length - 1))];
  const caption = step === 0 ? visual.captions.map : step === 1 ? visual.captions.threat : step === 2 ? visual.captions.discovery : step >= 3 && step <= 5 ? snippet.explanation : step === 6 ? visual.captions.validation : scenario.summary;

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
      <div className={styles.storyHeader}>
        <h4>{scenario.title}</h4>
        <div className={styles.repo}>{scenario.repo}<small>Known flaw · {scenario.cve}</small></div>
      </div>
      <section className={styles.comparison} aria-label="Recorded report comparison">
        {[scenario.before, scenario.after].map((run, index) => {
          const referenceReports = run.findings.reduce((count, finding) => count + (finding.referenceMatch === 'matched' ? finding.count : 0), 0);
          return <div className={styles.checkpointResult} key={index}>
            <header><span className={styles.eyebrow}>{index === 0 ? 'EARLIER CHECKPOINT' : 'FINAL CHECKPOINT'}</span><span>{run.findingsCount} {run.findingsCount === 1 ? 'report' : 'reports'}</span></header>
            <div className={styles.reportInventory}>
              {run.matchedCount === 0 && <div className={styles.missingTile}><XMarkIcon /><span>Missed</span></div>}
              <FindingTiles run={run} />
            </div>
            <div className={run.matchedCount ? styles.matchCaption : styles.missCaption}>
              {run.matchedCount ? <CheckIcon /> : <XMarkIcon />}
              <span>{run.matchedCount ? scenario.focus === 'focus' ? `${referenceReports} ${referenceReports === 1 ? 'report' : 'reports'} · same flaw` : 'Known flaw found' : 'Known flaw missed'}</span>
            </div>
          </div>;
        })}
        <span className={styles.comparisonArrow} aria-hidden="true"><ArrowRightIcon /></span>
      </section>
      <section className={styles.story} aria-label="Security discovery walkthrough">
        <nav className={styles.phases} aria-label="Review phases">
          {PHASES.map((phase, index) => <button key={phase.label} className={index < activePhase ? styles.phaseDone : ''} aria-current={index === activePhase ? 'step' : undefined} onClick={() => navigate(phase.step)}><span /><strong>{phase.label}</strong></button>)}
        </nav>
        <div className={styles.scene}>
          <div className={styles.sceneHeading}><span className={styles.sceneIcon}>{step < 2 ? <FolderIcon /> : step < 6 ? <CodeBracketIcon /> : <ShieldCheckIcon />}</span><div><span className={styles.eyebrow}>{step >= 3 && step <= 5 ? snippet.title : STEPS[step]}</span><p>{caption}</p></div></div>
          {step === 0 && <div className={styles.fileTree} aria-label="Relevant repository files">
            <div className={styles.treeRoot}><FolderIcon />{scenario.repo.split('/').at(-1)}<span>reviewed code</span></div>
            {visual.files.map((file) => <div key={file.path} className={`${styles.treeRow} ${file.focus ? styles.focusFile : ''}`} style={{ paddingLeft: `${18 + file.depth * 19}px` }}>
              {file.path.endsWith('/') ? <FolderIcon /> : <DocumentTextIcon />}<code title={file.path}>{file.path.endsWith('/') ? `${file.depth > 0 ? '…/' : ''}${file.path.split('/').filter(Boolean).at(-1)}/` : file.path.split('/').at(-1)}</code>{file.focus && <span>known flaw</span>}
            </div>)}
            <p className={styles.sceneNote}>Both checkpoints reviewed the same version of the code.</p>
          </div>}
          {(step === 1 || step === 2) && <>
            <div className={`${styles.flow} ${step === 2 ? styles.activeFlow : ''}`} aria-label="How the input reaches the unsafe operation">
              {visual.flow.map((node, index) => <div className={styles.flowSegment} key={node.label}>
                {index > 0 && <span className={styles.connector}><ArrowRightIcon /></span>}
                <div className={styles.flowNode}><span className={styles.nodeIndex}>{['INPUT', 'FOLLOW THE INPUT', 'RISKY OPERATION'][index]}</span><code>{node.label}</code><p>{node.detail}</p></div>
              </div>)}
            </div>
            <p className={styles.sceneNote}>How the input reaches the unsafe operation.</p>
          </>}
          {step >= 3 && step <= 5 && <>
            <nav className={styles.sourceFlow} aria-label="Follow the data flow">{visual.flow.map((node, index) => <button key={node.label} className={snippet.node > index ? styles.sourceVisited : ''} aria-current={snippet.node === index ? 'step' : undefined} onClick={() => navigate(index + 3)}><span>{snippet.node > index ? <CheckIcon /> : index + 1}</span>{node.label}{index < 2 && <ArrowRightIcon />}</button>)}</nav>
            <div className={styles.source}>
            <div className={styles.sourceHeader}><code>{snippet.path}</code><span>Reviewed code</span></div>
            <pre tabIndex={0} aria-label="Source excerpt at the evaluated revision">{snippet.lines.map((line) => <span key={line.number} className={line.highlight ? styles.highlightLine : ''}><span className={styles.lineNumber}>{line.number}</span><code>{line.text || ' '}</code></span>)}</pre>
          </div></>}
          {step >= 2 && step <= 5 && <div className={styles.pathOutcomes} aria-label="Known flaw in the recorded reports">
            {[scenario.before, scenario.after].map((run, index) => {
              const referenceReports = run.findings.reduce((count, finding) => count + (finding.referenceMatch === 'matched' ? finding.count : 0), 0);
              return <div key={index} className={run.matchedCount ? styles.pathMatched : styles.pathMissed}>
                <span className={styles.pathLine} aria-hidden="true" />
                <span className={styles.pathMarkers} aria-hidden="true">{referenceReports ? Array.from({ length: referenceReports }, (_, report) => <ShieldCheckIcon key={report} />) : <XMarkIcon />}</span>
                <span><small>{index === 0 ? 'Earlier checkpoint' : 'Final checkpoint'}</small>{scenario.focus === 'focus' ? `${referenceReports} ${referenceReports === 1 ? 'report' : 'reports'} · same flaw` : run.matchedCount ? 'Known flaw reported' : 'Known flaw not reported'}</span>
              </div>;
            })}
          </div>}
          {step === 6 && <>
            <div className={styles.validation}>
              {[scenario.before, scenario.after].map((run, index) => <div key={index} className={`${styles.validationResult} ${run.matchedCount ? styles.validationPassed : ''}`}>
                <span className={styles.eyebrow}>{index === 0 ? 'EARLIER CHECKPOINT' : 'FINAL CHECKPOINT'}</span>
                {run.matchedCount ? <ShieldCheckIcon /> : <XMarkIcon />}
                <strong>{run.matchedCount}<span> / {run.referenceTotal}</span></strong>
                <h4>{run.matchedCount ? 'Known flaw found' : 'Known flaw missed'}</h4>
                <code>{scenario.cve}</code>
              </div>)}
            </div>
            <p className={styles.sceneNote}>Checked against the known flaw. Other reports were not fully checked.</p>
          </>}
          {step === 7 && <div className={styles.reports}><ReportCard run={scenario.before} trained={false} /><ReportCard run={scenario.after} trained /></div>}
        </div>
        <footer className={styles.playback}>
          <span className={styles.srOnly} role="status">{playing ? 'Playing recorded review' : `Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}.`}</span>
          <button className={styles.iconButton} onClick={() => navigate(step - 1)} disabled={step === 0} aria-label="Previous step"><ChevronLeftIcon /></button>
          <button className={styles.playButton} onClick={play}>{playing ? <PauseIcon /> : step === lastStep ? <ArrowPathIcon /> : <PlayIcon />}{playing ? 'Pause' : step === lastStep ? 'Replay' : 'Play'}</button>
          <button className={styles.iconButton} onClick={() => navigate(step + 1)} disabled={step === lastStep} aria-label="Next step"><ChevronRightIcon /></button>
          <input type="range" aria-label="Review timeline" aria-valuetext={`${step + 1} of ${STEPS.length}: ${STEPS[step]}`} min={0} max={lastStep} value={step} onChange={(event) => navigate(Number(event.target.value))} />
          <span className={styles.stepCount}>{step + 1} / {STEPS.length}</span>
        </footer>
      </section>
      <p className={styles.replayNote}>Selected training examples · source walkthrough with recorded outcomes</p>
    </>
  );
}

export function CyberDefenseDemo() {
  const [selectedId, setSelectedId] = useState(CYBER_SCENARIOS[0].id);
  const scenario = CYBER_SCENARIOS.find((item) => item.id === selectedId) ?? CYBER_SCENARIOS[0];
  const benchmark = DFBENCH_RESULT;
  return (
    <div className={styles.demo}>
      <div className={styles.introduction}><div><span className={styles.eyebrow}>DEPTHFIRST / NEMOTRON 3.5 LIGHTNING</span><h3>How training changed the review</h3></div>
        <div className={styles.scenarios} aria-label="Choose a repository comparison">{CYBER_SCENARIOS.map((item) => <button key={item.id} aria-pressed={item.id === selectedId} onClick={() => setSelectedId(item.id)}>{item.repo.split('/').at(-1)}</button>)}</div>
      </div>
      <Storyboard key={scenario.id} scenario={scenario} />
      <section className={styles.benchmark} aria-label="dfbench evaluation">
        <div className={styles.benchmarkHeader}>
          <div><a href="https://depthfirst.com/research/dfbench" target="_blank" rel="noopener noreferrer">dfbench<ArrowTopRightOnSquareIcon /></a><p>Security work across real codebases</p></div>
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
    </div>
  );
}
