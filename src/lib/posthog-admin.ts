import 'server-only';

type QueryResponse = {
  columns?: string[];
  error?: string;
  results?: unknown[][];
};

export type AnalyticsSummary = {
  averageActiveSeconds: number;
  configured: boolean;
  engagedSessions: number;
  error?: string;
  evaluations: number;
  medianActiveSeconds: number;
  rapidSessions: number;
  resets: number;
  selections: number;
  sessions: number;
  useCases: Array<{ name: string; selections: number; sessions: number; rapidSelections: number }>;
  views: number;
};

const EMPTY_SUMMARY: AnalyticsSummary = {
  averageActiveSeconds: 0,
  configured: false,
  engagedSessions: 0,
  evaluations: 0,
  medianActiveSeconds: 0,
  rapidSessions: 0,
  resets: 0,
  selections: 0,
  sessions: 0,
  useCases: [],
  views: 0,
};

function numberAt(row: unknown[] | undefined, index: number) {
  const value = Number(row?.[index] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function queryPostHog(query: string, name: string) {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = (process.env.POSTHOG_API_HOST || 'https://us.posthog.com').replace(/\/$/, '');

  if (!key || !projectId) throw new Error('PostHog server credentials are not configured.');

  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      query: { kind: 'HogQLQuery', query },
    }),
  });

  const data = await response.json() as QueryResponse;
  if (!response.ok || data.error) throw new Error(data.error || `PostHog query failed (${response.status}).`);
  return data.results ?? [];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  if (!process.env.POSTHOG_PERSONAL_API_KEY || !process.env.POSTHOG_PROJECT_ID) return EMPTY_SUMMARY;

  try {
    const [totals, sessionStats, useCases] = await Promise.all([
      queryPostHog(`
        SELECT
          countIf(event = 'demo_viewed'),
          uniqIf(properties.demo_session_id, event = 'demo_viewed'),
          countIf(event = 'use_case_selected'),
          countIf(event = 'evaluation_run'),
          countIf(event = 'view_reset')
        FROM events
        WHERE timestamp >= now() - INTERVAL 30 DAY
      `, 'GTC demo 30-day totals'),
      queryPostHog(`
        SELECT
          round(avg(active_seconds), 1),
          round(quantile(0.5)(active_seconds), 1),
          countIf(active_seconds >= 30 AND interactions > 0),
          countIf(rapid_switches >= 3)
        FROM (
          SELECT
            properties.demo_session_id AS session_id,
            max(toFloat(coalesce(properties.active_seconds_total, 0))) AS active_seconds,
            max(toInt(coalesce(properties.interaction_count, 0))) AS interactions,
            max(toInt(coalesce(properties.rapid_switch_count, 0))) AS rapid_switches
          FROM events
          WHERE event IN ('demo_active_heartbeat', 'demo_session_summary')
            AND timestamp >= now() - INTERVAL 30 DAY
          GROUP BY session_id
        )
      `, 'GTC demo engagement quality'),
      queryPostHog(`
        SELECT
          properties.use_case,
          count(),
          uniq(properties.demo_session_id),
          countIf(properties.rapid_switch = true)
        FROM events
        WHERE event = 'use_case_selected'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY properties.use_case
        ORDER BY count() DESC
      `, 'GTC demo use-case popularity'),
    ]);

    return {
      averageActiveSeconds: numberAt(sessionStats[0], 0),
      configured: true,
      engagedSessions: numberAt(sessionStats[0], 2),
      evaluations: numberAt(totals[0], 3),
      medianActiveSeconds: numberAt(sessionStats[0], 1),
      rapidSessions: numberAt(sessionStats[0], 3),
      resets: numberAt(totals[0], 4),
      selections: numberAt(totals[0], 2),
      sessions: numberAt(totals[0], 1),
      useCases: useCases.map((row) => ({
        name: String(row[0] ?? 'unknown'),
        selections: numberAt(row, 1),
        sessions: numberAt(row, 2),
        rapidSelections: numberAt(row, 3),
      })),
      views: numberAt(totals[0], 0),
    };
  } catch (error) {
    return {
      ...EMPTY_SUMMARY,
      configured: true,
      error: error instanceof Error ? error.message : 'Unable to load analytics.',
    };
  }
}
