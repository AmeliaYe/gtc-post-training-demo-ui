'use client';

import { useEffect, useState } from 'react';
import {
  ArrowPathIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon,
  ChevronLeftIcon, ChevronRightIcon, CodeBracketIcon, DocumentTextIcon,
  FolderIcon, PauseIcon, PlayIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { DFBENCH_RESULT, CYBER_SCENARIOS, type CyberRun, type CyberScenario } from '@/lib/cyber-fixture';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { trackInteraction } from '@/lib/analytics';
import styles from './CyberDefenseDemo.module.css';

const STEPS = ['Repository map', 'Threat model', 'Discovery: input flow', 'Discovery: input', 'Discovery: propagation', 'Discovery: sink', 'Validation', 'Report'] as const;
const PHASES = [{ label: 'Map', step: 0 }, { label: 'Threat model', step: 1 }, { label: 'Discovery', step: 2 }, { label: 'Validate', step: 6 }, { label: 'Report', step: 7 }];
const STEP_INTERVAL = 3500;

function ReportCard({ run, trained }: { run: CyberRun; trained: boolean }) {
  return (
    <section className={`${styles.reportCard} ${trained ? styles.trainedCard : ''}`} aria-label={trained ? 'Post-trained report' : 'Early report'}>
      <span className={styles.eyebrow}>{trained ? 'FINAL CHECKPOINT' : 'EARLIER CHECKPOINT'}</span>
      <h4 className={run.matchedCount ? styles.found : styles.missed}><ShieldCheckIcon />{run.matchedCount ? 'Reference CVE found' : 'Reference CVE missed'}</h4>
      <div className={styles.reportNumbers}><span><strong>{run.findingsCount}</strong>reported findings</span></div>
      <ul>{run.findings.map((finding) => <li key={finding.title}><span className={finding.referenceMatch === 'matched' ? styles.found : ''}>{finding.count}×</span><span>{finding.title}</span></li>)}</ul>
    </section>
  );
}

function Storyboard({ scenario }: { scenario: CyberScenario }) {
  const [trained, setTrained] = useState(true);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visual = CYBER_VISUALS[scenario.id];
  const run = trained ? scenario.after : scenario.before;
  const matched = run.matchedCount > 0;
  const lastStep = STEPS.length - 1;
  const activePhase = step < 2 ? step : step < 6 ? 2 : step - 3;
  const snippet = visual.code[Math.max(0, Math.min(step - 3, visual.code.length - 1))];
  const validationCaption = trained ? visual.captions.validation : `The early checkpoint submitted ${run.findingsCount} findings. ${matched ? 'The verifier matched the reference CVE.' : 'The verifier did not find a match to the reference CVE.'}`;
  const caption = step === 0 ? visual.captions.map : step === 1 ? visual.captions.threat : step === 2 ? visual.captions.discovery : step >= 3 && step <= 5 ? snippet.explanation : step === 6 ? validationCaption : scenario.summary;

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
        <div className={styles.checkpoints} aria-label="Choose a checkpoint">
          <button aria-pressed={!trained} onClick={() => setTrained(false)}><i />Earlier checkpoint</button>
          <button aria-pressed={trained} onClick={() => setTrained(true)}><i />Final checkpoint</button>
        </div>
        <div className={styles.repo}>{scenario.repo}<small>{scenario.cve}</small></div>
      </div>
      <div className={styles.improvement}>
        <h4>{scenario.title}</h4>
        <div><span className={styles.eyebrow}>EARLIER CHECKPOINT</span><p>{visual.contrast.earlier}</p></div>
        <div><span className={styles.eyebrow}>FINAL CHECKPOINT</span><p>{visual.contrast.final}</p></div>
      </div>
      <section className={styles.story} aria-label="Security discovery walkthrough">
        <nav className={styles.phases} aria-label="Review phases">
          {PHASES.map((phase, index) => <button key={phase.label} className={index < activePhase ? styles.phaseDone : ''} aria-current={index === activePhase ? 'step' : undefined} onClick={() => navigate(phase.step)}><span /><strong>{phase.label}</strong></button>)}
        </nav>
        <div className={styles.scene}>
          <div className={styles.sceneHeading}><span className={styles.sceneIcon}>{step < 2 ? <FolderIcon /> : step < 6 ? <CodeBracketIcon /> : <ShieldCheckIcon />}</span><div><span className={styles.eyebrow}>{step >= 3 && step <= 5 ? snippet.title : STEPS[step]}</span><p>{caption}</p></div></div>
          {step === 0 && <div className={styles.fileTree} aria-label="Relevant repository files">
            <div className={styles.treeRoot}><FolderIcon />{scenario.repo.split('/').at(-1)}<span>evaluated revision</span></div>
            {visual.files.map((file) => <div key={file.path} className={`${styles.treeRow} ${file.focus ? styles.focusFile : ''}`} style={{ paddingLeft: `${18 + file.depth * 19}px` }}>
              {file.path.endsWith('/') ? <FolderIcon /> : <DocumentTextIcon />}<code title={file.path}>{file.path.endsWith('/') ? `${file.depth > 0 ? '…/' : ''}${file.path.split('/').filter(Boolean).at(-1)}/` : file.path.split('/').at(-1)}</code>{file.focus && <span>reference vulnerability</span>}
            </div>)}
            <p className={styles.sceneNote}>Both checkpoints inspected the same repository revision.</p>
          </div>}
          {(step === 1 || step === 2) && <>
            <div className={`${styles.flow} ${step === 2 ? styles.activeFlow : ''}`} aria-label="Reference vulnerability input flow">
              {visual.flow.map((node, index) => <div className={styles.flowSegment} key={node.label}>
                {index > 0 && <span className={styles.connector}><ArrowRightIcon /></span>}
                <div className={styles.flowNode}><span className={styles.nodeIndex}>{['INPUT', 'PROPAGATION', 'SINK'][index]}</span><code>{node.label}</code><p>{node.detail}</p></div>
              </div>)}
            </div>
            <div className={`${styles.observation} ${step === 2 && matched ? styles.observationFound : ''}`}><ShieldCheckIcon /><p>{step === 1 ? 'The diagram traces the known vulnerability through the evaluated source.' : matched ? `The ${trained ? 'final' : 'earlier'} report identified the known vulnerable operation.` : 'The earlier review read this code, but its report did not identify the reference vulnerability.'}</p></div>
          </>}
          {step >= 3 && step <= 5 && <>
            <nav className={styles.sourceFlow} aria-label="Follow the data flow">{visual.flow.map((node, index) => <button key={node.label} aria-current={snippet.node === index ? 'step' : undefined} onClick={() => navigate(index + 3)}><span>{index + 1}</span>{node.label}{index < 2 && <ArrowRightIcon />}</button>)}</nav>
            <div className={styles.source}>
            <div className={styles.sourceHeader}><code>{snippet.path}</code><span>Evaluated source</span></div>
            <pre tabIndex={0} aria-label="Source excerpt at the evaluated revision">{snippet.lines.map((line) => <span key={line.number} className={line.highlight ? styles.highlightLine : ''}><span className={styles.lineNumber}>{line.number}</span><code>{line.text || ' '}</code></span>)}</pre>
            <p className={styles.sceneNote}>Follow the highlighted value through the connected excerpts.</p>
          </div></>}
          {step === 6 && <div className={styles.validation}>
            <div className={`${styles.validationResult} ${matched ? styles.validationPassed : ''}`}><ShieldCheckIcon /><span className={styles.eyebrow}>RECORDED VERIFIER RESULT</span><h4>{matched ? 'Reference CVE matched' : 'Reference CVE missed'}</h4><code>{scenario.cve}</code><span>{run.matchedCount} / {run.referenceTotal} known vulnerabilities found</span></div>
            <div className={styles.validationEvidence}><span className={styles.eyebrow}>WHAT WAS REPORTED</span>{run.findings.map((finding) => <div key={finding.title}><span className={finding.referenceMatch === 'matched' ? styles.found : ''}>{finding.referenceMatch === 'matched' ? <CheckIcon /> : <DocumentTextIcon />}</span><p>{finding.title}<small>{finding.count} {finding.count === 1 ? 'finding' : 'findings'} · {finding.referenceMatch === 'matched' ? 'Matches reference' : finding.referenceMatch === 'not-matched' ? 'Different from reference' : 'Not assessed'}</small></p></div>)}<p className={styles.sceneNote}>Reference matching does not assess every additional finding.</p></div>
          </div>}
          {step === 7 && <div className={styles.reports}><ReportCard run={scenario.before} trained={false} /><ReportCard run={scenario.after} trained /></div>}
        </div>
        <footer className={styles.playback}>
          <span className={styles.srOnly} role="status">{playing ? 'Playing recorded review' : `${trained ? 'Final' : 'Earlier'} checkpoint. Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}.`}</span>
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
        <p className={styles.benchmarkDescription}>Find vulnerabilities in real applications, low-level systems, and smart contracts. Tasks can span multiple components or repositories; recall measures how many known vulnerabilities the agent recovers.</p>
        <div className={styles.benchmarkTasks} aria-label="Full dfbench scope">
          <div><strong>253</strong><span>real-world examples</span></div>
          <div><strong>910</strong><span>known vulnerabilities</span></div>
          <div><strong>17</strong><span>languages in vulnerable code</span></div>
        </div>
        <div className={styles.benchmarkFooter}><a href="https://depthfirst.com/research/dfbench-v1" target="_blank" rel="noopener noreferrer">How dfbench works<ArrowTopRightOnSquareIcon /></a><details><summary>Evaluation details</summary><p>Scope statistics describe the full benchmark. The recall comparison uses {benchmark.before.model} and {benchmark.after.model}. The selected training trajectories above compare steps 5 and 200; step 5 is already RL-trained. Report consolidation is not a measured precision gain.</p></details></div>
      </section>
    </div>
  );
}
