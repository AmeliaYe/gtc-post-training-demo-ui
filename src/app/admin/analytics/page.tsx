import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowPathIcon, BoltIcon, ChartBarIcon, ClockIcon, CursorArrowRaysIcon, EyeIcon } from '@heroicons/react/24/outline';
import { isValidAdminAuthorization } from '@/lib/admin-auth';
import { getAnalyticsSummary } from '@/lib/posthog-admin';
import styles from './styles.module.css';

export const dynamic = 'force-dynamic';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

export default async function AnalyticsPage() {
  const requestHeaders = await headers();
  if (!isValidAdminAuthorization(requestHeaders.get('authorization'))) notFound();

  const data = await getAnalyticsSummary();
  const engagementRate = data.sessions ? Math.round((data.engagedSessions / data.sessions) * 100) : 0;
  const maxSelections = Math.max(...data.useCases.map((useCase) => useCase.selections), 1);

  const metrics = [
    { label: 'Demo views', value: data.views.toLocaleString(), note: 'Page loads', icon: EyeIcon },
    { label: 'Sessions', value: data.sessions.toLocaleString(), note: 'Last 30 days', icon: ChartBarIcon },
    { label: 'Avg. active dwell', value: formatDuration(data.averageActiveSeconds), note: 'Idle time excluded', icon: ClockIcon },
    { label: 'Engaged sessions', value: `${engagementRate}%`, note: '30s + interaction', icon: CursorArrowRaysIcon },
    { label: 'Evaluation runs', value: data.evaluations.toLocaleString(), note: 'Intent signal', icon: BoltIcon },
  ];

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p>PRIVATE · GTC POST-TRAINING DEMO</p>
          <h1>Engagement analytics</h1>
          <span>Rolling 30-day view · active time excludes hidden and idle periods</span>
        </div>
        <a href="/admin/analytics" className={styles.refresh}><ArrowPathIcon /> Refresh</a>
      </header>

      {!data.configured && (
        <section className={styles.notice}>
          <strong>PostHog is not connected yet.</strong>
          <p>Add the server-side PostHog variables from <code>.env.example</code> to the deployment environment. No analytics secrets should be committed to Git.</p>
        </section>
      )}

      {data.error && (
        <section className={`${styles.notice} ${styles.error}`}>
          <strong>Analytics query failed.</strong>
          <p>{data.error}</p>
        </section>
      )}

      <section className={styles.metrics} aria-label="Key metrics">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article className={styles.metric} key={label}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}>
            <div><p>USE-CASE INTEREST</p><h2>Selections by domain</h2></div>
            <span>{data.selections} total</span>
          </div>
          <div className={styles.useCases}>
            {data.useCases.length === 0 && <p className={styles.empty}>No selections recorded yet.</p>}
            {data.useCases.map((useCase) => (
              <div className={styles.useCase} key={useCase.name}>
                <div><strong>{useCase.name}</strong><span>{useCase.sessions} sessions</span></div>
                <div className={styles.bar}><i style={{ width: `${(useCase.selections / maxSelections) * 100}%` }} /></div>
                <b>{useCase.selections}</b>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelTitle}><div><p>QUALITY SIGNALS</p><h2>Real interest vs. noise</h2></div></div>
          <dl className={styles.quality}>
            <div><dt>Median active dwell</dt><dd>{formatDuration(data.medianActiveSeconds)}</dd></div>
            <div><dt>Engaged sessions</dt><dd>{data.engagedSessions}</dd></div>
            <div><dt>Rapid-switch sessions</dt><dd>{data.rapidSessions}</dd></div>
            <div><dt>Return-to-gallery actions</dt><dd>{data.resets}</dd></div>
          </dl>
          <p className={styles.explainer}>A rapid-switch session contains at least three use-case changes less than 900ms apart. Keep it separate from engaged sessions when reporting booth interest.</p>
        </section>
      </div>

      <footer className={styles.footer}>Aggregate telemetry only · no prompt text, form data, screen capture, or session replay</footer>
    </main>
  );
}
