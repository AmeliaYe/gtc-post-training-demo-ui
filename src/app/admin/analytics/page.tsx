import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowPathIcon, ChartBarIcon, ClockIcon, CursorArrowRaysIcon, EyeIcon } from '@heroicons/react/24/outline';
import { isValidAdminAuthorization } from '@/lib/admin-auth';
import { getAnalyticsSummary } from '@/lib/posthog-admin';
import styles from './styles.module.css';

export const dynamic = 'force-dynamic';

const SURFACE_LABELS: Record<string, string> = {
  landing: 'Landing page',
  gallery: 'Use-case gallery',
  computer: 'Computer Use',
  health: 'Healthcare',
  bio: 'Multimodal Biology',
  cyber: 'Continual Cyber Defense',
  defense: 'National Sovereign Cyber Defense',
  resources: 'Next steps',
};

const SURFACE_ORDER = ['landing', 'computer', 'health', 'bio', 'cyber', 'defense', 'gallery', 'resources'];

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
  const sortedSurfaces = [...data.surfaces].sort((a, b) => {
    const aIndex = SURFACE_ORDER.indexOf(a.id);
    const bIndex = SURFACE_ORDER.indexOf(b.id);
    return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
  });

  const metrics = [
    { label: 'Demo launches', value: data.views.toLocaleString(), note: 'Browser page loads', icon: EyeIcon },
    { label: 'Surface views', value: data.surfaceViews.toLocaleString(), note: 'Landing + use cases', icon: EyeIcon },
    { label: 'Sessions', value: data.sessions.toLocaleString(), note: 'Last 30 days', icon: ChartBarIcon },
    { label: 'Avg. active dwell', value: formatDuration(data.averageActiveSeconds), note: 'Idle time excluded', icon: ClockIcon },
    { label: 'Engaged sessions', value: `${engagementRate}%`, note: '30s + interaction', icon: CursorArrowRaysIcon },
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

      <section className={`${styles.panel} ${styles.surfacePanel}`}>
        <div className={styles.panelTitle}>
          <div><p>PAGE + USE-CASE ENGAGEMENT</p><h2>Views and active dwell by experience</h2></div>
          <span>Qualified = at least 5 active seconds</span>
        </div>
        <div className={styles.surfaceTable} role="table" aria-label="Views and active dwell by experience">
          <div className={styles.surfaceHeader} role="row">
            <span>Experience</span><span>Views</span><span>Qualified</span><span>Sessions</span><span>Avg. dwell</span><span>Median</span><span>Quick exits</span>
          </div>
          {sortedSurfaces.length === 0 && <p className={styles.empty}>No page or use-case views recorded yet.</p>}
          {sortedSurfaces.map((surface) => (
            <div className={styles.surfaceRow} role="row" key={surface.id}>
              <strong>{SURFACE_LABELS[surface.id] ?? surface.id}</strong>
              <b>{surface.views}</b>
              <b className={styles.qualified}>{surface.qualifiedViews}</b>
              <b>{surface.sessions}</b>
              <b>{formatDuration(surface.averageActiveSeconds)}</b>
              <b>{formatDuration(surface.medianActiveSeconds)}</b>
              <b className={surface.quickViews ? styles.quick : undefined}>{surface.quickViews}</b>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}>
            <div><p>QUALITY SIGNALS</p><h2>Real interest vs. noise</h2></div>
          </div>
          <dl className={styles.quality}>
            <div><dt>Median active dwell</dt><dd>{formatDuration(data.medianActiveSeconds)}</dd></div>
            <div><dt>Engaged sessions</dt><dd>{data.engagedSessions}</dd></div>
            <div><dt>Rapid-switch sessions</dt><dd>{data.rapidSessions}</dd></div>
            <div><dt>Return-to-gallery actions</dt><dd>{data.resets}</dd></div>
          </dl>
          <p className={styles.explainer}>Quick exits and rapid switching remain visible instead of being counted as meaningful interest. Active dwell pauses after 60 seconds without activity, when the tab is hidden, or when the browser loses focus.</p>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelTitle}><div><p>HIGH-INTENT ACTIONS</p><h2>Actions beyond viewing</h2></div></div>
          <dl className={styles.quality}>
            <div><dt>Use-case selections</dt><dd>{data.selections}</dd></div>
            <div><dt>Evaluation runs</dt><dd>{data.evaluations}</dd></div>
          </dl>
          <p className={styles.explainer}>A rapid-switch session contains at least three use-case changes less than 900ms apart. It is reported separately from engaged sessions.</p>
        </section>
      </div>

      <footer className={styles.footer}>Aggregate telemetry only · no prompt text, form data, screen capture, or session replay</footer>
    </main>
  );
}
