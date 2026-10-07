import { ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon, MinusIcon } from '@heroicons/react/24/outline';
import { DFBENCH_RESULT, type CyberScenario } from '@/lib/cyber-fixture';
import { CYBER_ATTACKS } from '@/lib/cyber-attacks';
import styles from './CyberTrainingResults.module.css';

export function CyberTrainingResults({ scenario }: { scenario: CyberScenario }) {
  const benchmark = DFBENCH_RESULT;
  const consolidates = scenario.focus === 'focus';
  const attack = CYBER_ATTACKS[scenario.id];

  return (
    <div className={styles.results}>
      <section className={styles.benchmark} aria-label="Broader dfbench benchmark results">
        <header className={styles.benchmarkHeading}>
          <span className={styles.eyebrow}>dfbench</span>
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
          <span>Separate step-180 evaluation</span>
        </footer>
      </section>

      <section className={styles.example} aria-label={`${scenario.repo} recorded example results`}>
        <header className={styles.exampleHeading}>
          <span className={styles.eyebrow}>Selected example</span>
          <h4>{consolidates ? 'Same flaw, fewer repeated reports' : scenario.id === 'cosmos' ? 'A missed flaw found. Same report count.' : 'A previously missed flaw found'}</h4>
        </header>
        <div className={styles.comparison}>
          {[scenario.before, scenario.after].map((run, index) => {
            const matchedReports = run.findings.reduce((count, finding) => count + (finding.referenceMatch === 'matched' ? finding.count : 0), 0);
            return (
              <div key={index} className={`${styles.checkpoint} ${index === 1 ? styles.later : ''}`}>
                <span className={styles.checkpointLabel}>{index === 0 ? 'Earlier · step 5' : 'Later · step 200'}</span>
                <strong className={`${styles.outcome} ${run.matchedCount ? styles.found : styles.missed}`}>
                  {consolidates ? <>{matchedReports}<span>{matchedReports === 1 ? 'report' : 'reports'}</span></> : <>{run.matchedCount ? <CheckIcon aria-hidden="true" /> : <MinusIcon aria-hidden="true" />}{run.matchedCount ? 'Found' : 'Missed'}</>}
                </strong>
                {consolidates && <span className={styles.sameFlaw}>of the same flaw</span>}
                <ul className={styles.glyphs} role="list" aria-label={`${run.findingsCount} total reports; ${matchedReports} matched the known flaw`}>
                  {run.findings.flatMap((finding) => Array.from({ length: finding.count }, (_, reportIndex) => (
                    <li
                      key={`${finding.title}-${reportIndex}`}
                      className={`${styles.reportGlyph} ${finding.referenceMatch === 'matched' ? styles.matchedGlyph : ''}`}
                      aria-label={`${finding.title}, report ${reportIndex + 1} of ${finding.count}: ${finding.referenceMatch === 'matched' ? 'matched the known flaw' : finding.referenceMatch === 'unassessed' ? 'not assessed' : 'did not match the known flaw'}`}
                    >
                      <span className={styles.reportLines} aria-hidden="true" />
                      {finding.referenceMatch === 'matched' ? <CheckIcon aria-hidden="true" /> : <MinusIcon aria-hidden="true" />}
                    </li>
                  )))}
                </ul>
                <span className={styles.reportCount}>{run.findingsCount} total {run.findingsCount === 1 ? 'report' : 'reports'}</span>
              </div>
            );
          })}
          <span className={styles.comparisonArrow} aria-hidden="true"><ArrowRightIcon /></span>
        </div>
        <div className={styles.exampleFooter}>
          <span className={styles.legend}><CheckIcon aria-hidden="true" />Known flaw <MinusIcon aria-hidden="true" />Other report</span>
          <span>Both checkpoints already RL-trained.</span>
        </div>
      </section>

      <details className={styles.details} key={scenario.id}>
        <summary>Reports &amp; evaluation details</summary>
        <div className={styles.detailContent}>
          <section>
            <h5>Selected example: {scenario.repo}</h5>
            <p>Two checkpoints after reinforcement learning (RL) training, at steps 5 and 200, reviewing the same repository revision. Recorded evaluation: October 2026, attempt 1 of 4.</p>
            <div className={styles.reportDetails}>
              {[scenario.before, scenario.after].map((run, index) => (
                <div key={index}>
                  <h6>{index === 0 ? 'Earlier · step 5' : 'Later · step 200'}</h6>
                  <p>{index === 0 ? attack.training.before : attack.training.after}</p>
                  <ul>{run.findings.map((finding) => <li key={finding.title}><strong>{finding.count}×</strong> {finding.title}<span>{finding.referenceMatch === 'matched' ? 'Matches the reference flaw' : finding.referenceMatch === 'unassessed' ? 'Not assessed' : 'Does not match the reference flaw'}</span></li>)}</ul>
                  <p>Verifier: {run.matchedCount} of {run.referenceTotal} reference {run.referenceTotal === 1 ? 'flaw' : 'flaws'} matched.</p>
                </div>
              ))}
            </div>
            <p>Reference: {scenario.cve} · {scenario.reference.title}. Reports marked “other” are not confirmed false positives. Fewer repeated reports alone do not prove higher precision.</p>
            <p>{attack.caveat}</p>
          </section>
          <section>
            <h5>Broader benchmark: dfbench</h5>
            <p>Recall is the share of known vulnerabilities found. This separate comparison uses <code>{benchmark.before.model}</code> and <code>{benchmark.after.model}</code>. Its step-180 result is distinct from the selected step-200 examples.</p>
            <p>Full benchmark scope: 253 real-world examples, 910 known vulnerabilities, and 17 languages in vulnerable code. These scope statistics describe the full benchmark.</p>
            <a href="https://depthfirst.com/research/dfbench-v1" target="_blank" rel="noopener noreferrer">How dfbench works<ArrowTopRightOnSquareIcon aria-hidden="true" /></a>
          </section>
        </div>
      </details>
    </div>
  );
}
