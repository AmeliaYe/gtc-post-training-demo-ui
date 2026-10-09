import { ArrowRightIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { DFBENCH_RESULT } from '@/lib/cyber-fixture';
import styles from './CyberTrainingResults.module.css';

export function CyberTrainingResults({ onInteract }: { onInteract?: () => void }) {
  const benchmark = DFBENCH_RESULT;

  return (
    <div className={styles.results}>
      <section className={styles.benchmark} aria-label="Broader dfbench benchmark results">
        <header className={styles.benchmarkHeading}>
          <div><h4>Vulnerability recall</h4><p className={styles.trainingNote}>Share of known vulnerabilities detected</p></div>
          <a className={styles.eyebrow} href="https://depthfirst.com/research/dfbench" target="_blank" rel="noopener noreferrer" onClick={onInteract} onFocus={onInteract} aria-label="Explore dfbench (opens in a new tab)">dfbench<ArrowTopRightOnSquareIcon aria-hidden="true" /></a>
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
    </div>
  );
}
