'use client';

import { useId } from 'react';
import {
  ArrowDownIcon, CircleStackIcon, CodeBracketIcon, GlobeAltIcon,
  LockClosedIcon, ServerIcon, UserIcon,
} from '@heroicons/react/24/outline';
import type { CyberAttack } from '@/lib/cyber-attacks';
import type { CyberScenario } from '@/lib/cyber-fixture';
import styles from './CyberAttackDemo.module.css';

const NODE_ICONS = {
  person: UserIcon,
  server: ServerIcon,
  globe: GlobeAltIcon,
  lock: LockClosedIcon,
  code: CodeBracketIcon,
  data: CircleStackIcon,
};

export function CyberAttackDemo({ attack, scenarioId, step, playing }: {
  attack: CyberAttack;
  scenarioId: CyberScenario['id'];
  step: number;
  playing: boolean;
}) {
  const instanceId = useId();
  const diagramId = `attack-${scenarioId}-${instanceId.replaceAll(':', '')}`;
  const stage = attack.stages[step];
  const tone = step === 0 ? styles.normal : step === attack.stages.length - 1 ? styles.consequence : styles.unsafe;
  const activeRoute = stage.mobilePath.map((id) => attack.nodes.find((node) => node.id === id)).filter((node) => node !== undefined);

  return (
    <div className={`${styles.attack} ${styles.scene} ${tone}`}>
      <div className={styles.desktopGraph} role="img" aria-label={`Active path: ${activeRoute.map((node) => node.label).join(' → ')}. ${stage.description}`}>
        <svg className={styles.network} viewBox="0 0 1000 380" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id={`${diagramId}-muted`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L10 5 L0 10Z" fill="#52604e" />
            </marker>
            <marker id={`${diagramId}-active`} markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L14 7 L0 14Z" fill="currentColor" />
            </marker>
          </defs>
          {attack.edges.map((edge) => (
            <path key={edge.id} d={edge.path} className={`${styles.route} ${stage.activeEdges.includes(edge.id) ? styles.activeRoute : ''}`} markerEnd={`url(#${diagramId}-${stage.activeEdges.includes(edge.id) ? 'active' : 'muted'})`} />
          ))}
          {playing && attack.edges.filter((edge) => stage.activeEdges.includes(edge.id)).map((edge, index) => (
            <circle key={`${step}-${edge.id}`} r="5.5" opacity="0" className={styles.packet}>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.9;1" dur="2.8s" begin={`${index * 0.6}s`} repeatCount="indefinite" />
              <animateMotion path={edge.path} dur="2.8s" begin={`${index * 0.6}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
        {attack.nodes.map((node) => {
          const Icon = NODE_ICONS[node.icon];
          return (
            <div key={node.id} className={`${styles.node} ${stage.activeNodes.includes(node.id) ? styles.activeNode : ''}`} style={{ left: `${node.x / 10}%`, top: `${node.y / 3.8}%` }}>
              <span className={styles.nodeIcon}><Icon /></span>
              <strong>{node.label}</strong>
            </div>
          );
        })}
      </div>
      <ol className={styles.mobileRoute} aria-label="Active path">
        {activeRoute.map((node, index) => {
          const Icon = NODE_ICONS[node.icon];
          return (
            <li key={`${node.id}-${index}`}>
              {index > 0 && <ArrowDownIcon className={styles.mobileArrow} aria-hidden="true" />}
              <div className={styles.mobileNode}>
                <span className={styles.nodeIcon}><Icon /></span>
                <strong>{node.label}</strong>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
