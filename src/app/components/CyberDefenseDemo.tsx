'use client';

import { useId, useState } from 'react';
import { ArrowRightIcon, ArrowTopRightOnSquareIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { CYBER_SCENARIOS, type CyberScenario } from '@/lib/cyber-fixture';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { CYBER_ATTACKS, type CyberAttack } from '@/lib/cyber-attacks';
import { CyberAttackDemo } from './CyberAttackDemo';
import { CyberTrainingResults } from './CyberTrainingResults';
import styles from './CyberDefenseDemo.module.css';

const EXAMPLES = {
  openfire: { role: 'START HERE', result: 'Missed flaw → found' },
  'set-value': { role: 'FEWER DUPLICATES', result: '3 reports of one flaw → 1' },
  cosmos: { role: 'SAME REPORT COUNT', result: 'Missed → found, still 4 reports' },
};
const VIEWS = [
  { id: 'attack', label: 'Attack pattern' },
  { id: 'review', label: 'Source analysis' },
  { id: 'training', label: 'Training results' },
] as const;

function SourceAnalysis({ scenario, attack, step, onStepChange, onShowAttack }: {
  scenario: CyberScenario;
  attack: CyberAttack;
  step: number;
  onStepChange: (step: number) => void;
  onShowAttack: () => void;
}) {
  const stage = attack.stages[step];
  const visual = CYBER_VISUALS[scenario.id];
  const [selection, setSelection] = useState<{ step: number; index: number } | null>(null);
  const codeIndex = selection?.step === step ? selection.index : stage.source.code[0];
  const snippet = visual.code[codeIndex];
  const blocks = attack.nodes.filter((node) => stage.source.nodeIds.includes(node.id));

  return (
    <section className={styles.sourceAnalysis} aria-label="Code mapped to the attack pattern">
      <nav className={styles.stages} aria-label="Source analysis attack steps" onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
        const current = buttons.indexOf(event.target as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? attack.stages.length - 1 : Math.max(0, Math.min(attack.stages.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)));
        onStepChange(next);
        buttons[next]?.focus();
      }}>
        {attack.stages.map((item, index) => <button key={item.label} aria-current={index === step ? 'step' : undefined} onClick={() => onStepChange(index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</button>)}
      </nav>
      <div className={styles.sourceHeading}><span className={styles.eyebrow}>ATTACK PATTERN · STEP {step + 1}</span><h4>{stage.title}</h4></div>
      <ol className={styles.blockPath} aria-label="Matching attack diagram blocks">
        {stage.mobilePath.map((id, index) => {
          const node = attack.nodes.find((candidate) => candidate.id === id)!;
          const ownsCode = stage.source.nodeIds.includes(id);
          return <li key={`${id}-${index}`}>
            {index > 0 && <ArrowRightIcon className={styles.pathArrow} aria-hidden="true" />}
            <div className={ownsCode ? styles.codeBlock : ''}><strong>{node.label}</strong>{ownsCode && <span><CodeBracketIcon />Code below</span>}</div>
          </li>;
        })}
      </ol>
      <div className={styles.codeLocation}><CodeBracketIcon /><span>Code in <strong>{blocks.map((node) => node.label).join(' + ')}</strong></span></div>
      {stage.source.note && <p className={styles.mappingNote}>{stage.source.note}</p>}
      {stage.source.code.length > 1 && <nav className={styles.excerpts} aria-label="Code excerpts for this attack step">
        {stage.source.code.map((index) => <button key={index} aria-pressed={codeIndex === index} onClick={() => setSelection({ step, index })}>{visual.flow[index].label}</button>)}
      </nav>}
      <p className={styles.explanation}>{snippet.explanation}</p>
      <div className={styles.source}>
        <div className={styles.sourceHeader}><code>{snippet.path}</code><a href={snippet.url} target="_blank" rel="noopener noreferrer">View source<ArrowTopRightOnSquareIcon /></a></div>
        <pre tabIndex={0} aria-label="Source excerpt at the evaluated revision">{snippet.lines.map((line) => <span key={line.number} className={line.highlight ? styles.highlightLine : ''}><span className={styles.lineNumber}>{line.number}</span><code>{line.text || ' '}</code></span>)}</pre>
      </div>
      <div className={styles.sourceFooter}><button className={styles.continueButton} onClick={onShowAttack}>Back to attack step {step + 1}<ArrowRightIcon /></button><span>{scenario.cve} · evaluated revision</span></div>
    </section>
  );
}

export function CyberDefenseDemo() {
  const [selectedId, setSelectedId] = useState(CYBER_SCENARIOS[0].id);
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('attack');
  const [step, setStep] = useState(0);
  const tabId = useId();
  const scenario = CYBER_SCENARIOS.find((item) => item.id === selectedId) ?? CYBER_SCENARIOS[0];
  const attack = CYBER_ATTACKS[scenario.id];

  function showView(next: (typeof VIEWS)[number]['id']) {
    setView(next);
    document.getElementById(`${tabId}-${next}-tab`)?.focus();
  }

  return (
    <div className={styles.demo}>
      <div className={styles.introduction}><span className={styles.eyebrow}>DEPTHFIRST / NEMOTRON 3.5 LIGHTNING</span><h3>From security flaws to better reviews</h3></div>
      <div className={styles.scenarios} aria-label="Choose an improvement to explore">{CYBER_SCENARIOS.map((item) => <button key={item.id} aria-pressed={item.id === selectedId} onClick={() => { setSelectedId(item.id); setStep(0); }}><small>{EXAMPLES[item.id].role}</small><strong>{item.id === 'cosmos' ? 'COSMOS' : item.repo.split('/').at(-1)}</strong><span>{EXAMPLES[item.id].result}</span></button>)}</div>
      <p className={styles.exampleContext}>{attack.context}</p>
      <div className={styles.viewTabs} role="tablist" aria-label="Explore this security example">
        {VIEWS.map((item, index) => <button key={item.id} id={`${tabId}-${item.id}-tab`} role="tab" aria-selected={view === item.id} aria-controls={`${tabId}-${item.id}-panel`} tabIndex={view === item.id ? 0 : -1} onClick={() => setView(item.id)} onKeyDown={(event) => {
          const nextIndex = event.key === 'ArrowRight' ? (index + 1) % VIEWS.length : event.key === 'ArrowLeft' ? (index + VIEWS.length - 1) % VIEWS.length : event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1 : null;
          if (nextIndex === null) return;
          event.preventDefault();
          showView(VIEWS[nextIndex].id);
        }}>{item.label}</button>)}
      </div>
      {VIEWS.map((item) => <section key={item.id} id={`${tabId}-${item.id}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${item.id}-tab`} hidden={view !== item.id} tabIndex={0}>
        {view === item.id && item.id === 'attack' && <>
          <CyberAttackDemo key={scenario.id} attack={attack} scenarioId={scenario.id} step={step} onStepChange={setStep} onInspectSource={() => showView('review')} />
          <button className={styles.continueButton} onClick={() => showView('training')}>See what improved<ArrowRightIcon /></button>
        </>}
        {view === item.id && item.id === 'review' && <SourceAnalysis key={scenario.id} scenario={scenario} attack={attack} step={step} onStepChange={setStep} onShowAttack={() => showView('attack')} />}
        {view === item.id && item.id === 'training' && <CyberTrainingResults scenario={scenario} />}
      </section>)}
    </div>
  );
}
