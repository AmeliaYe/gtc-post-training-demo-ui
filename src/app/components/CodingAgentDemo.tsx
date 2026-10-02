'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BUNDLED_CODING_ISSUES,
  DEFAULT_CODING_ISSUE,
  parseCodingIssueCatalog,
  type CodingIssue,
  type CodingIssueCatalog,
} from '@/lib/coding-issues';

const lanes = [
  {
    id: 'a',
    label: 'Lane A',
    router: 'Nemotron Super',
    accent: 'cyan',
  },
  {
    id: 'b',
    label: 'Lane B',
    router: 'Codex',
    accent: 'violet',
  },
] as const;

type CatalogState = 'loading' | 'github' | 'snapshot';

function sourceLabel(state: CatalogState): string {
  if (state === 'loading') return 'Checking GitHub issue source';
  if (state === 'github') return 'Synced from GitHub';
  return 'Bundled issue snapshot';
}

function FlowNode({
  role,
  name,
  detail,
  kind = 'model',
}: {
  role: string;
  name: string;
  detail: string;
  kind?: 'model' | 'service';
}) {
  return (
    <div className={`coding-flow-node coding-flow-node-${kind}`}>
      <div className="coding-flow-node-heading">
        <span>{role}</span>
        <i aria-hidden="true" />
      </div>
      <strong title={name}>{name}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default function CodingAgentDemo() {
  const [issues, setIssues] = useState<readonly CodingIssue[]>(BUNDLED_CODING_ISSUES);
  const [selectedIssueId, setSelectedIssueId] = useState(DEFAULT_CODING_ISSUE.id);
  const [catalogState, setCatalogState] = useState<CatalogState>('loading');

  useEffect(() => {
    const controller = new AbortController();

    async function loadIssues() {
      try {
        const response = await fetch('/api/demo/issues', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Issue catalog returned ${response.status}`);

        const catalog: CodingIssueCatalog = parseCodingIssueCatalog(await response.json());

        setIssues(catalog.issues);
        setSelectedIssueId((current) => (
          catalog.issues.some((issue) => issue.id === current)
            ? current
            : catalog.issues[0].id
        ));
        setCatalogState(catalog.source.kind === 'github-api' ? 'github' : 'snapshot');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn('Using the bundled coding issue snapshot.', error);
        setCatalogState('snapshot');
      }
    }

    void loadIssues();
    return () => controller.abort();
  }, []);

  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedIssueId) ?? DEFAULT_CODING_ISSUE,
    [issues, selectedIssueId],
  );

  return (
    <div className="coding-agent-demo">
      <section className="coding-agent-issue" aria-labelledby="coding-work-item-heading">
        <div className="coding-agent-section-heading">
          <span className="coding-agent-step">01</span>
          <div>
            <small>GITHUB WORK ITEM</small>
            <h3 id="coding-work-item-heading">Choose the issue</h3>
          </div>
          <span className={`coding-source-state is-${catalogState}`} aria-live="polite">
            <i aria-hidden="true" />{sourceLabel(catalogState)}
          </span>
        </div>

        <div className="coding-issue-tabs" role="group" aria-label="Coding issues">
          {issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              aria-pressed={issue.id === selectedIssue.id}
              className={issue.id === selectedIssue.id ? 'is-selected' : ''}
              onClick={() => setSelectedIssueId(issue.id)}
            >
              <span>#{issue.github.number}</span>
              <strong>{issue.id}</strong>
            </button>
          ))}
        </div>

        <div className="coding-issue-summary">
          <div className="coding-issue-copy">
            <div className="coding-issue-eyebrow">
              <a href={selectedIssue.github.url} target="_blank" rel="noreferrer">
                {selectedIssue.github.repository} #{selectedIssue.github.number}<span aria-hidden="true">↗</span>
              </a>
              <span>Read-only</span>
            </div>
            <h4>{selectedIssue.title}</h4>
            <p>{selectedIssue.body}</p>
          </div>
          <div className="coding-criteria">
            <small>ACCEPTANCE CRITERIA</small>
            <ul>
              {selectedIssue.acceptanceCriteria.map((criterion) => (
                <li key={criterion}><i aria-hidden="true">✓</i><span>{criterion}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="coding-agent-flow" aria-labelledby="coding-live-flow-heading">
        <div className="coding-agent-section-heading">
          <span className="coding-agent-step">02</span>
          <div>
            <small>AGENTIC COMPARISON</small>
            <h3 id="coding-live-flow-heading">Live model flow</h3>
          </div>
          <span className="coding-integration-state"><i aria-hidden="true" />Live run integration pending</span>
        </div>

        <div className="coding-lanes">
          {lanes.map((lane) => (
            <article className={`coding-lane is-${lane.accent}`} key={lane.id}>
              <header>
                <span>{lane.label}</span>
                <small>Awaiting coordinator</small>
              </header>
              <div className="coding-flow-nodes">
                <FlowNode role="Router" name={lane.router} detail="Decides next action" />
                <span className="coding-flow-arrow" aria-hidden="true">→</span>
                <FlowNode role="Coder" name="Nemotron Super" detail="Shared coding model" />
                <span className="coding-flow-arrow" aria-hidden="true">→</span>
                <FlowNode role="Runner" name="Trusted sandbox" detail="Executes fixed tests" kind="service" />
              </div>
            </article>
          ))}
        </div>

        <div className="coding-judge-flow">
          <span className="coding-judge-mark" aria-hidden="true">J</span>
          <div>
            <small>INDEPENDENT JUDGE</small>
            <strong>Codex</strong>
          </div>
          <span className="coding-judge-rule">Waits for both lanes and trusted test evidence</span>
          <span className="coding-judge-state">Not started</span>
        </div>
      </section>

      <section className="coding-agent-outcome" aria-labelledby="coding-outcome-heading">
        <div className="coding-agent-section-heading">
          <span className="coding-agent-step">03</span>
          <div>
            <small>VERIFIED OUTCOME</small>
            <h3 id="coding-outcome-heading">No run evidence yet</h3>
          </div>
        </div>
        <p>{catalogState === 'github' ? 'The GitHub work item is connected.' : 'The bundled work-item snapshot is available.'} Coordinator readiness, live events, trusted results, and judge output will appear here once the run API is integrated.</p>
        <div className="coding-outcome-gates" aria-label="Pending integration gates">
          <span><i />Coordinator</span>
          <span><i />Both lanes</span>
          <span><i />Trusted tests</span>
          <span><i />Independent judge</span>
        </div>
      </section>

      <footer className="coding-agent-boundary">
        <span>{catalogState === 'github' ? 'Read-only GitHub source' : 'Read-only bundled snapshot'}</span>
        <span>Fixed allowlisted scenario</span>
        <span>No browser-side repository writes</span>
      </footer>
    </div>
  );
}
