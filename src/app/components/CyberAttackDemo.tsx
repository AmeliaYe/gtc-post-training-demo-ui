'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import {
  CircleStackIcon, CodeBracketIcon, GlobeAltIcon, LockClosedIcon, ServerIcon, UserIcon,
} from '@heroicons/react/24/outline';
import type { CyberAttack } from '@/lib/cyber-attacks';
import type { CyberScenario } from '@/lib/cyber-fixture';
import styles from './CyberAttackDemo.module.css';

const NODE_ICONS = {
  person: UserIcon, server: ServerIcon, globe: GlobeAltIcon,
  lock: LockClosedIcon, code: CodeBracketIcon, data: CircleStackIcon,
};

const OPENFIRE_LABELS: Record<string, { label: string; detail: string }> = {
  requester: { label: 'User-supplied address', detail: 'Input to the icon request' },
  server: { label: 'Java messaging server', detail: 'Fetches the website icon' },
  public: { label: 'Public website', detail: 'Expected destination' },
  private: { label: 'Internal service', detail: 'Attacker-selected destination' },
};

const OPENFIRE_EXPLANATIONS: Record<string, string> = {
  requester: 'The user provides a website address whose icon the messaging server should fetch. An attacker can supply an internal address instead.',
  server: 'The messaging server makes the request on the user’s behalf. Without checking the destination, it can be directed to private services.',
  public: 'A public website is the intended destination. The server fetches its icon to display to the user.',
  private: 'An internal service is an unintended destination. The server may reach it even when the user cannot access it directly.',
};

export function CyberAttackDemo({ attack, scenarioId }: {
  attack: CyberAttack;
  scenarioId: CyberScenario['id'];
}) {
  const diagramId = `network-${useId().replaceAll(':', '')}`;
  const routePaths = useRef<Record<string, SVGPathElement | null>>({});
  const routeLabels = useRef<Record<string, HTMLSpanElement | null>>({});
  const [dismissedTooltip, setDismissedTooltip] = useState<string | null>(null);
  useLayoutEffect(() => {
    for (const route of ['expected', 'unsafe']) {
      const path = routePaths.current[route];
      const label = routeLabels.current[route];
      if (path && label) {
        const point = path.getPointAtLength(path.getTotalLength() / 2);
        label.style.left = `${point.x / 10}%`;
        label.style.top = `${point.y / 3.8}%`;
      }
    }
  }, [attack]);
  const expected = attack.stages[0];
  const unsafe = attack.stages[2];
  const expectedDestination = expected.mobilePath.at(-1);
  const unsafeDestination = unsafe.mobilePath.at(-1);
  const columns = Array.from(new Set(attack.nodes.map((node) => node.x))).sort((left, right) => left - right);
  const isOpenfire = scenarioId === 'openfire';
  const attackLabel = isOpenfire ? 'SSRF attack' : 'Attack route';
  const description = isOpenfire
    ? 'A user supplies an address to the messaging server’s icon-fetching feature. The expected request goes to a public website along the solid green path. Without destination validation, an attacker can supply an internal address and make the server request an internal service along the dashed red path.'
    : `Expected request: ${expected.mobilePath.map((id) => attack.nodes.find((node) => node.id === id)?.label).join(' → ')}. Solid green path. ${attackLabel}: ${unsafe.mobilePath.map((id) => attack.nodes.find((node) => node.id === id)?.label).join(' → ')}. Dashed red path.`;

  return (
    <section className={styles.attack} aria-label={attack.title}>
      <div className={styles.graph} role="group" aria-label={description}>
        <svg className={styles.network} viewBox="0 0 1000 380" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id={`${diagramId}-shared`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M2 2 L10 6 L2 10" fill="none" stroke="#a8a8b4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></marker>
            <marker id={`${diagramId}-expected`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M2 2 L10 6 L2 10" fill="none" stroke="#14703f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></marker>
            <marker id={`${diagramId}-unsafe`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M2 2 L10 6 L2 10" fill="none" stroke="#cf3942" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></marker>
          </defs>
          {attack.edges.filter((edge) => expected.activeEdges.includes(edge.id) || unsafe.activeEdges.includes(edge.id)).map((edge) => {
            const route = expected.activeEdges.includes(edge.id) && unsafe.activeEdges.includes(edge.id) ? 'shared' : expected.activeEdges.includes(edge.id) ? 'expected' : 'unsafe';
            const routeClass = `${styles.route} ${route === 'expected' ? styles.expectedRoute : route === 'unsafe' ? styles.unsafeRoute : ''}`;
            return <path key={edge.id} ref={(path) => { routePaths.current[route] = path; }} d={edge.path} className={routeClass} markerEnd={`url(#${diagramId}-${route})`} />;
          })}
        </svg>
        {(['expected', 'unsafe'] as const).map((route) => <span key={route} ref={(label) => { routeLabels.current[route] = label; }} className={`${styles.routeLabel} ${route === 'expected' ? styles.expectedLegend : styles.unsafeLegend}`}>{route === 'expected' ? 'Expected request' : attackLabel}</span>)}
        {attack.nodes.map((node) => {
          const Icon = NODE_ICONS[node.icon];
          const isExpected = node.id === expectedDestination;
          const isUnsafe = node.id === unsafeDestination;
          const copy = isOpenfire ? OPENFIRE_LABELS[node.id] ?? node : node;
          const tooltipId = `${diagramId}-${node.id}-tooltip`;
          return (
            <div key={node.id} className={`${styles.node} ${isExpected ? styles.expectedNode : isUnsafe ? styles.unsafeNode : ''}`} style={{ left: `${node.x / 10}%`, top: `${node.y / 3.8}%` }} tabIndex={0} role="group" aria-label={copy.label} aria-describedby={tooltipId} onMouseEnter={() => setDismissedTooltip(null)} onFocus={() => setDismissedTooltip(null)} onKeyDown={(event) => { if (event.key === 'Escape') setDismissedTooltip(node.id); }} data-tooltip-dismissed={dismissedTooltip === node.id}>
              <div className={styles.nodeTop}><span className={styles.nodeNumber}>{columns.indexOf(node.x) + 1}</span><Icon aria-hidden="true" /></div>
              <strong>{copy.label}</strong>
              <span className={styles.nodeDetail}>{copy.detail}</span>
              {isOpenfire && node.id === 'server' && <span className={styles.flaw}>No destination validation</span>}
              {isUnsafe && <span className={styles.impact}>{isOpenfire ? 'Potential internal access' : attackLabel}</span>}
              <span id={tooltipId} role="tooltip" className={`${styles.tooltip} ${isExpected ? styles.tooltipBelow : ''}`}>{isOpenfire ? OPENFIRE_EXPLANATIONS[node.id] ?? copy.detail : copy.detail}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
