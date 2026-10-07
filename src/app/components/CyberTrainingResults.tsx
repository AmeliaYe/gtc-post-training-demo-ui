import { ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon, MinusIcon } from '@heroicons/react/24/outline';
import { DFBENCH_RESULT, type CyberScenario } from '@/lib/cyber-fixture';
import { CYBER_ATTACKS } from '@/lib/cyber-attacks';
import styles from './CyberTrainingResults.module.css';

export function CyberTrainingResults({ scenario }: { scenario: CyberScenario }) {
  const benchmark = DFBENCH_RESULT;
  const attack = CYBER_ATTACKS.openfire;

  return (
    <div className={styles.results}>
      <section className={styles.benchmark} aria-label="Broader dfbench benchmark results">
        <header className={styles.benchmarkHeading}>
          <span className={styles.eyebrow}>dfbench recall</span>
          <h4>More known flaws found</h4>
        </header>
        <div className={styles.metric}>
          {[benchmark.before, benchmark.after].map((result, index) => (
            <div key={result.model} className={index === 0 ? styles.beforeMetric : styles.afterMetric}>
              <span className={styles.metricLabel}>{index === 0 ? 'Before' : 'After'}</span>
              <strong>{result.recall.toFixed(1)}<span>%</span></strong>
              <div
                className={styles.meter}
                role="meter"
                aria-label={`${index === 0 ? 'Before' : 'After'} training: known flaws found`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={result.recall}
                aria-valuetext={`${result.recall}% recall`}
              ><span style={{ width: `${result.recall}%` }} /></div>
            </div>
          ))}
          <ArrowRightIcon className={styles.metricArrow} aria-hidden="true" />
        </div>
        <footer className={styles.benchmarkFooter}>
          <p className={styles.gain}><strong>+{(benchmark.after.recall - benchmark.before.recall).toFixed(1)}</strong> percentage points</p>
          <span>Broader benchmark · separate step-180 run</span>
        </footer>
      </section>

      <section className={styles.example} aria-label={`${scenario.repo} recorded example results`}>
        <div className={styles.exampleLabel}>
          <h4>This Openfire flaw</h4>
          <p className={styles.trainingNote}>Both already trained.</p>
        </div>
        <div className={styles.comparison}>
          {[scenario.before, scenario.after].map((run, index) => (
              <div key={index} className={`${styles.checkpoint} ${index === 1 ? styles.later : ''}`}>
                <span className={styles.checkpointLabel}>{index === 0 ? 'Early · step 5' : 'Final · step 200'}</span>
                <strong className={`${styles.outcome} ${run.matchedCount ? styles.found : styles.missed}`}>
                  {run.matchedCount ? <CheckIcon aria-hidden="true" /> : <MinusIcon aria-hidden="true" />}{run.matchedCount ? 'Found' : 'Missed'}
                </strong>
              </div>
          ))}
          <span className={styles.comparisonArrow} aria-hidden="true"><ArrowRightIcon /></span>
        </div>
      </section>

      <details className={styles.details} key={scenario.id}>
        <summary>Evidence</summary>
        <div className={styles.detailContent}>
          <section>
            <h5>Openfire: {scenario.repo}</h5>
            <p>Two checkpoints after reinforcement learning (RL) training, at steps 5 and 200, reviewing the same repository revision. Recorded evaluation: October 2026, attempt 1 of 4.</p>
            <div className={styles.reportDetails}>
              {[scenario.before, scenario.after].map((run, index) => (
                <div key={index}>
                  <h6>{index === 0 ? 'Early · step 5' : 'Final · step 200'} · {run.findingsCount} total {run.findingsCount === 1 ? 'report' : 'reports'}</h6>
                  <p>{index === 0 ? attack.training.before : attack.training.after}</p>
                  <ul>{run.findings.map((finding) => <li key={finding.title}><strong>{finding.count}×</strong> {finding.title}<span>{finding.referenceMatch === 'matched' ? 'Matches the reference flaw' : finding.referenceMatch === 'unassessed' ? 'Not assessed' : 'Does not match the reference flaw'}</span></li>)}</ul>
                  <p>Verifier: {run.matchedCount} of {run.referenceTotal} reference {run.referenceTotal === 1 ? 'flaw' : 'flaws'} matched.</p>
                </div>
              ))}
            </div>
            <p>Reference: {scenario.cve} · {scenario.reference.title}. SSRF means server-side request forgery: making a server fetch an address chosen by someone else. Reports that do not match this reference are not confirmed false positives.</p>
            <p>{attack.caveat}</p>
            <a href={scenario.url} target="_blank" rel="noopener noreferrer">Evaluated source revision<ArrowTopRightOnSquareIcon aria-hidden="true" /></a>
          </section>
          <section>
            <h5>Broader benchmark: dfbench</h5>
            <p>Recall is the share of known vulnerabilities found. This separate comparison uses <code>{benchmark.before.model}</code> and <code>{benchmark.after.model}</code>. Its step-180 result is distinct from this step-200 Openfire example.</p>
            <p>Full benchmark scope: 253 real-world examples, 910 known vulnerabilities, and 17 languages in vulnerable code. These scope statistics describe the full benchmark.</p>
            <a href="https://depthfirst.com/research/dfbench-v1" target="_blank" rel="noopener noreferrer">How dfbench works<ArrowTopRightOnSquareIcon aria-hidden="true" /></a>
          </section>
        </div>
      </details>
    </div>
  );
}
