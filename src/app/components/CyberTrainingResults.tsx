import { ArrowRightIcon, CheckIcon, MinusIcon } from '@heroicons/react/24/outline';
import { DFBENCH_RESULT, type CyberScenario } from '@/lib/cyber-fixture';
import styles from './CyberTrainingResults.module.css';

export function CyberTrainingResults({ scenario }: { scenario: CyberScenario }) {
  const benchmark = DFBENCH_RESULT;

  return (
    <div className={styles.results}>
      <section className={styles.benchmark} aria-label="Broader dfbench benchmark results">
        <header className={styles.benchmarkHeading}>
          <div><h4>Vulnerability recall</h4><p className={styles.trainingNote}>Share of known vulnerabilities detected</p></div>
          <span className={styles.eyebrow}>dfbench</span>
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
        </footer>
      </section>

      <section className={styles.example} aria-label={`${scenario.repo} recorded example results`}>
        <p className={styles.exampleLabel}>Openfire · submitted report</p>
        <div className={styles.comparison}>
          {[scenario.before, scenario.after].map((run, index) => (
              <div key={index} className={`${styles.checkpoint} ${index === 1 ? styles.later : ''}`}>
                <span className={styles.checkpointLabel}>{index === 0 ? 'Early · step 5' : 'Final · step 200'}</span>
                <strong className={`${styles.outcome} ${run.matchedCount ? styles.found : styles.missed}`} aria-label={run.matchedCount ? 'SSRF reported' : 'SSRF omitted from the report'}>
                  {run.matchedCount ? <CheckIcon aria-hidden="true" /> : <MinusIcon aria-hidden="true" />}{run.matchedCount ? 'Reported' : 'Omitted'}
                </strong>
              </div>
          ))}
          <span className={styles.comparisonArrow} aria-hidden="true"><ArrowRightIcon /></span>
        </div>
      </section>
    </div>
  );
}
