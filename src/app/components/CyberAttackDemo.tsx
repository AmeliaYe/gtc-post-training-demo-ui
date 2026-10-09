'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, CircleStackIcon, CodeBracketIcon,
  GlobeAltIcon, LockClosedIcon, ServerIcon, UserIcon,
} from '@heroicons/react/24/outline';
import type { CyberAttack } from '@/lib/cyber-attacks';
import type { CyberScenario } from '@/lib/cyber-fixture';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import styles from './CyberAttackDemo.module.css';

const NODE_ICONS = {
  person: UserIcon, server: ServerIcon, globe: GlobeAltIcon,
  lock: LockClosedIcon, code: CodeBracketIcon, data: CircleStackIcon,
};

export function CyberAttackDemo({ attack, scenarioId, playing, progress, onInteract }: {
  attack: CyberAttack;
  scenarioId: CyberScenario['id'];
  step: number;
  playing: boolean;
  progress?: number;
  onInteract?: () => void;
}) {
  const carouselId = useId();
  const diagramId = `network-${carouselId.replaceAll(':', '')}`;
  const scroller = useRef<HTMLDivElement>(null);
  const cardElements = useRef<(HTMLLIElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const expected = attack.stages[0];
  const unsafe = attack.stages[2];
  const expectedDestination = expected.mobilePath.at(-1);
  const unsafeDestination = unsafe.mobilePath.at(-1);
  const sharedNodes = expected.mobilePath.filter((id) => unsafe.mobilePath.includes(id));
  const destinations = attack.nodes.filter((node) => node.id === expectedDestination || node.id === unsafeDestination);
  const columns = Array.from(new Set(attack.nodes.map((node) => node.x))).sort((left, right) => left - right);
  const attackLabel = scenarioId === 'openfire' ? 'SSRF attack' : 'Attack route';
  const source = CYBER_VISUALS[scenarioId].code;
  const cards = scenarioId === 'openfire' ? [
    { title: 'User-provided host', kind: 'Entry', call: 'Request parameter', source: source[0] },
    { title: 'URL construction', kind: 'Call', call: 'Build icon URL', source: source[1] },
    { title: 'Server-side request', kind: 'Exit', call: 'HTTP request', source: source[2] },
    { title: 'Returned response', kind: 'Return', call: 'HTTP 200 bytes', source: source[2] },
  ] : source.map((entry, index) => ({
    title: CYBER_VISUALS[scenarioId].flow[index].label,
    kind: ['Entry', 'Call', 'Exit'][index],
    call: ['Input', 'Propagation', 'Sink'][index],
    source: entry,
  }));
  const hasProgress = progress !== undefined;
  const automaticIndex = Math.min(cards.length - 1, Math.floor(Math.max(0, Math.min(progress ?? 0, 1)) * cards.length));

  const centerCard = useCallback((index: number) => {
    const viewport = scroller.current;
    const card = cardElements.current[index];
    if (!viewport || !card || !viewport.clientWidth) return;
    const viewportBounds = viewport.getBoundingClientRect();
    if (!viewportBounds.width) return;
    const scale = viewportBounds.width / viewport.clientWidth;
    const left = (card.getBoundingClientRect().left - viewportBounds.left) / scale + viewport.scrollLeft - (viewport.clientWidth - card.offsetWidth) / 2;
    viewport.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);

  useEffect(() => {
    if (playing && hasProgress) centerCard(automaticIndex);
  }, [automaticIndex, playing, hasProgress, centerCard]);

  function selectCard(index: number) {
    onInteract?.();
    const nextIndex = Math.max(0, Math.min(cards.length - 1, index));
    setActiveIndex(nextIndex);
    centerCard(nextIndex);
  }

  return (
    <section className={styles.attack} aria-label={attack.title}>
      <div className={styles.requestFlow}>
      <div className={styles.legend} aria-label="Request route legend">
        <span className={styles.expectedLegend}><i aria-hidden="true" />Expected request</span>
        <span className={styles.unsafeLegend}><i aria-hidden="true" />{attackLabel}</span>
      </div>
      <div className={styles.desktopGraph} role="img" aria-label={`Expected request: ${expected.mobilePath.map((id) => attack.nodes.find((node) => node.id === id)?.label).join(' → ')}. Solid green path. ${attackLabel}: ${unsafe.mobilePath.map((id) => attack.nodes.find((node) => node.id === id)?.label).join(' → ')}. Dashed red path.`}>
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
          return (
            <div key={node.id} className={`${styles.node} ${isExpected ? styles.expectedNode : isUnsafe ? styles.unsafeNode : ''}`} style={{ left: `${node.x / 10}%`, top: `${node.y / 3.8}%` }}>
              <div className={styles.nodeTop}><span className={styles.nodeNumber}>{columns.indexOf(node.x) + 1}</span><Icon aria-hidden="true" /></div>
              <strong>{node.label}</strong>
              <span className={styles.nodeDetail}>{node.detail}</span>
              {(isExpected || isUnsafe) && <span className={styles.routeBadge}>{isExpected ? 'Expected request' : attackLabel}</span>}
            </div>
          );
        })}
      </div>
      <div className={styles.mobileGraph}>
        <ol className={styles.sharedNodes} aria-label="Shared request path">
          {sharedNodes.map((id, index) => {
            const node = attack.nodes.find((item) => item.id === id)!;
            const Icon = NODE_ICONS[node.icon];
            return <li key={id}>{index > 0 && <ArrowDownIcon className={styles.sharedArrow} aria-hidden="true" />}<div className={styles.mobileNode}><Icon aria-hidden="true" /><div><strong>{node.label}</strong><span className={styles.nodeDetail}>{node.detail}</span></div></div></li>;
          })}
        </ol>
        <div className={styles.mobileSplit} aria-hidden="true" />
        <ol className={styles.mobileBranches} aria-label="Expected and attack destinations">
          {destinations.map((node) => {
            const Icon = NODE_ICONS[node.icon];
            const isExpected = node.id === expectedDestination;
            return (
              <li key={node.id} className={isExpected ? styles.expectedNode : styles.unsafeNode}>
                <svg className={styles.branchArrow} viewBox="0 0 20 30" aria-hidden="true"><path d="M10 0 V25" strokeDasharray={isExpected ? undefined : '4 3'} /><path d="M4 20 L10 26 L16 20" /></svg>
                <div className={styles.destinationNode}><Icon aria-hidden="true" /><strong>{node.label}</strong><span className={styles.routeBadge}>{isExpected ? 'Expected request' : attackLabel}</span></div>
              </li>
            );
          })}
        </ol>
      </div>
      </div>
      <div className={styles.sourceFlow} role="region" aria-label="Source flow" aria-roledescription="carousel">
      <div
        id={carouselId}
        ref={scroller}
        className={styles.scroller}
        tabIndex={0}
        aria-label="Source call chain. Use the arrow keys or source step buttons to explore."
        onFocusCapture={() => onInteract?.()}
        onPointerDown={() => onInteract?.()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            selectCard(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : activeIndex + (event.key === 'ArrowLeft' ? -1 : 1));
          }
        }}
        onScroll={() => {
          const viewport = scroller.current;
          if (!viewport) return;
          const viewportBounds = viewport.getBoundingClientRect();
          const center = viewportBounds.left + viewportBounds.width / 2;
          let nearest = 0;
          let distance = Infinity;
          cardElements.current.forEach((card, index) => {
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const candidate = Math.abs(rect.left + rect.width / 2 - center);
            if (candidate < distance) { nearest = index; distance = candidate; }
          });
          setActiveIndex(nearest);
        }}
      >
        <ol className={styles.chain}>
          {cards.map((card, index) => (
            <li key={`${scenarioId}-${index}`} ref={(element) => { cardElements.current[index] = element; }} className={styles.slide} aria-current={index === activeIndex ? 'step' : undefined}>
              <article className={`${styles.card} ${index === activeIndex ? styles.activeCard : ''}`} aria-label={`${index + 1} of ${cards.length}: ${card.title}`}>
                <div className={styles.cardTop}>
                  <button className={styles.number} onClick={() => selectCard(index)} tabIndex={index === activeIndex ? 0 : -1} aria-label={`Select ${card.title}`} aria-pressed={index === activeIndex}>{index + 1}</button>
                  <a className={styles.github} href={card.source.url} target="_blank" rel="noreferrer" onClick={() => onInteract?.()} tabIndex={index === activeIndex ? 0 : -1} aria-hidden={index !== activeIndex} aria-label={`View ${card.title} in GitHub (opens a new tab)`}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.51-.29-5.15-1.26-5.15-5.61 0-1.24.44-2.25 1.16-3.04-.12-.29-.5-1.44.11-3 0 0 .95-.3 3.08 1.16a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.16 3.08-1.16.61 1.56.23 2.71.12 3 .72.79 1.15 1.8 1.15 3.04 0 4.36-2.64 5.32-5.16 5.6.4.35.76 1.04.76 2.1v3.08c0 .3.21.65.77.54A11.2 11.2 0 0 0 12 .8Z" /></svg>
                    <span>View in GitHub</span>
                  </a>
                </div>
                <h4>{card.title}</h4>
                <div className={styles.cardFoot}>
                  <p className={styles.callType}><span>{card.kind}</span><ArrowRightIcon aria-hidden="true" /><span>{card.call}</span></p>
                  <code className={styles.sourcePath} title={card.source.path}>{card.source.path.includes('/') ? `…/${card.source.path.split('/').slice(-2).join('/')}` : card.source.path}<span>:{card.source.lines[0].number}–{card.source.lines.at(-1)?.number}</span></code>
                </div>
              </article>
              {index < cards.length - 1 && <ArrowRightIcon className={styles.connector} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>
      <nav className={styles.navigation} aria-label="Source call chain navigation">
        <button onClick={() => selectCard(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous source step" aria-controls={carouselId}><ArrowLeftIcon aria-hidden="true" /></button>
        <span aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{activeIndex + 1} <span>of</span> {cards.length}</span>
        <button onClick={() => selectCard(activeIndex + 1)} disabled={activeIndex === cards.length - 1} aria-label="Next source step" aria-controls={carouselId}><ArrowRightIcon aria-hidden="true" /></button>
      </nav>
      </div>
    </section>
  );
}
