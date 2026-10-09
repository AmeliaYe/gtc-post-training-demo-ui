'use client';

import { useId } from 'react';
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
  server: { label: 'Openfire server', detail: 'Fetches the website icon' },
  public: { label: 'Public website', detail: 'Expected destination' },
  private: { label: 'Internal service', detail: 'Attacker-selected destination' },
};

export function CyberAttackDemo({ attack, scenarioId }: {
  attack: CyberAttack;
  scenarioId: CyberScenario['id'];
}) {
  const diagramId = `network-${useId().replaceAll(':', '')}`;
  const expected = attack.stages[0];
  const unsafe = attack.stages[2];
  const expectedDestination = expected.mobilePath.at(-1);
  const unsafeDestination = unsafe.mobilePath.at(-1);
  const columns = Array.from(new Set(attack.nodes.map((node) => node.x))).sort((left, right) => left - right);
  const isOpenfire = scenarioId === 'openfire';
  const attackLabel = isOpenfire ? 'SSRF attack' : 'Attack route';
  const description = isOpenfire
    ? 'A user supplies an address to Openfire’s icon-fetching feature. The expected request goes to a public website along the solid green path. Without destination validation, an attacker can supply an internal address and make Openfire request an internal service along the dashed red path. Internal access depends on the server’s deployment.'
    : `Expected request: ${expected.mobilePath.map((id) => attack.nodes.find((node) => node.id === id)?.label).join(' → ')}. Solid green path. ${attackLabel}: ${unsafe.mobilePath.map((id) => attack.nodes.find((node) => node.id === id)?.label).join(' → ')}. Dashed red path.`;

  return (
    <section className={styles.attack} aria-label={attack.title}>
      <div className={styles.legend} aria-label="Request route legend">
        <span className={styles.expectedLegend}><i aria-hidden="true" />Expected request</span>
        <span className={styles.unsafeLegend}><i aria-hidden="true" />{attackLabel}</span>
      </div>
      <div className={styles.graph} role="img" aria-label={description}>
        <svg className={styles.network} viewBox="0 0 1000 380" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id={`${diagramId}-shared`} markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L12 6 L0 12Z" fill="#a8a8b4" /></marker>
            <marker id={`${diagramId}-expected`} markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L12 6 L0 12Z" fill="#17834a" /></marker>
            <marker id={`${diagramId}-unsafe`} markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L12 6 L0 12Z" fill="#cf3942" /></marker>
          </defs>
          {attack.edges.filter((edge) => expected.activeEdges.includes(edge.id) || unsafe.activeEdges.includes(edge.id)).map((edge) => {
            const route = expected.activeEdges.includes(edge.id) && unsafe.activeEdges.includes(edge.id) ? 'shared' : expected.activeEdges.includes(edge.id) ? 'expected' : 'unsafe';
            return <path key={edge.id} d={edge.path} className={`${styles.route} ${route === 'expected' ? styles.expectedRoute : route === 'unsafe' ? styles.unsafeRoute : ''}`} markerEnd={`url(#${diagramId}-${route})`} />;
          })}
        </svg>
        {attack.nodes.map((node) => {
          const Icon = NODE_ICONS[node.icon];
          const isExpected = node.id === expectedDestination;
          const isUnsafe = node.id === unsafeDestination;
          const copy = isOpenfire ? OPENFIRE_LABELS[node.id] ?? node : node;
          return (
            <div key={node.id} className={`${styles.node} ${isExpected ? styles.expectedNode : isUnsafe ? styles.unsafeNode : ''}`} style={{ left: `${node.x / 10}%`, top: `${node.y / 3.8}%` }}>
              <div className={styles.nodeTop}><span className={styles.nodeNumber}>{columns.indexOf(node.x) + 1}</span><Icon aria-hidden="true" /></div>
              <strong>{copy.label}</strong>
              <span className={styles.nodeDetail}>{copy.detail}</span>
              {isOpenfire && node.id === 'server' && <span className={styles.flaw}>No destination validation</span>}
              {isUnsafe && <span className={styles.impact}>{isOpenfire ? 'Potential internal access' : attackLabel}</span>}
            </div>
          );
        })}
      </div>
      {isOpenfire && <p className={styles.note}>Internal access depends on the server’s deployment.</p>}
    </section>
  );
}
