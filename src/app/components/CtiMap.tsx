'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { COUNTRIES } from './worldMap';

// Illustrative CTI map: the same threat-report feed analysed before and after training.
// Groups are anonymized and never placed in a country: every attack enters from an unattributed
// source beyond the map edge. This is not a measured result.
// `infra`: critical-infrastructure targets inside a targeted country. Only the trained model
// surfaces them (the base model at most links the campaign to a country), so beacons appear after training.
type Infra = { country: string; sector: string };
type Campaign = { name: string; group: string; severity: 'Critical' | 'High' | 'Medium'; targets: string[]; before: string[]; infra?: Infra[] };
const CAMPAIGNS: Campaign[] = [
  { name: 'Campaign 01', group: 'Group A', severity: 'Critical', targets: ['792', '398'], before: ['792'], infra: [{ country: '398', sector: 'Energy grid' }] },
  { name: 'Campaign 02', group: 'Group C', severity: 'High', targets: ['004', '586', '356'], before: ['356'], infra: [{ country: '356', sector: 'Telecom' }] },
  { name: 'Campaign 03', group: 'Group D', severity: 'Critical', targets: ['764', '704', '458', '360', '608', '116'], before: [], infra: [{ country: '704', sector: 'Ports' }, { country: '360', sector: 'Energy grid' }] },
  { name: 'Campaign 04', group: 'Group B', severity: 'High', targets: ['760', '368', '784', '512'], before: [], infra: [{ country: '784', sector: 'Oil & gas' }] },
  { name: 'Campaign 05', group: 'Group A', severity: 'Medium', targets: ['417', '860'], before: [] },
  { name: 'Campaign 06', group: 'Group D', severity: 'Medium', targets: ['418', '104'], before: [] },
];
const CENTROID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.c]));
const COUNTRY_NAME = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.name]));
// Crop of the world map around the campaigns (Eastern Europe to South-East Asia).
const VIEW = { x: 400, y: 150, w: 500, h: 290 };
// Sample-data sources: each loop, every threat group is drawn from a random country in this pool of
// geopolitically neutral, non-target countries, so no fixed origin can read as attribution.
const SOURCE_POOL = ['496', '404', '231', '144', '524', '818', '012', '724', '380', '616', '642', '300', '246', '578', '752'];
type GroupSources = Record<string, string>;
const pickSources = (): GroupSources => {
  const pool = [...SOURCE_POOL].sort(() => Math.random() - .5);
  return Object.fromEntries([...new Set(CAMPAIGNS.map((c) => c.group))].map((g, i) => [g, pool[i]]));
};

// Timeline in 500 ms ticks: before scan, before findings, after scan, after findings, hold, loop.
const TICK = 500, AFTER_AT = 14, END = 39;
const foundAt = (i: number, after: boolean) => (after ? AFTER_AT + 5 + i * 2 : 5 + i * 2);

const arc = ([x1, y1]: readonly number[], [x2, y2]: readonly number[]) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1);
  return `M${x1} ${y1} Q${mx} ${my - Math.max(18, len * .35)} ${x2} ${y2}`;
};

export default function CtiMap() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [sources, setSources] = useState(pickSources);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setTick((t) => {
      if (t < END) return t + 1;
      setSources(pickSources()); // new random origins every loop
      return 0;
    }), TICK);
    return () => window.clearInterval(id);
  }, [reduce]);
  const t = reduce ? END : tick;
  const after = t >= AFTER_AT;

  // What the current model has surfaced so far.
  const pool = after ? CAMPAIGNS : CAMPAIGNS.filter((c) => c.before.length);
  const found = pool.filter((_, i) => t >= foundAt(i, after)).map((c) => ({ ...c, hits: after ? c.targets : c.before }));
  const targeted = new Set(found.flatMap((c) => c.hits));
  const groups = new Set(found.map((c) => c.group));
  const infra = after ? found.flatMap((c) => c.infra ?? []) : [];
  const scanning = t < (after ? AFTER_AT + 5 : 5);
  const phase = after ? 'after' : 'before';

  return (
    <div className="cti">
      <div className="cti-map">
        <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="img" aria-label={`Illustrative CTI map. Before training the model links ${CAMPAIGNS.filter((c) => c.before.length).length} campaigns; after training it links ${CAMPAIGNS.length} campaigns across ${new Set(CAMPAIGNS.flatMap((c) => c.targets)).size} countries.`}>
          {COUNTRIES.map((c) => <path key={c.id} d={c.d} className={`cti-country ${targeted.has(c.id) ? 'hit' : ''}`} />)}
          {found.map((c) => c.hits.map((id) => (
            <motion.path key={`${phase}-${c.name}-${id}`} d={arc(CENTROID[sources[c.group]], CENTROID[id])} className="cti-arc"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
          )))}
          {[...new Set(found.map((c) => sources[c.group]))].map((src) => {
            const [x, y] = CENTROID[src];
            return <motion.circle key={`${phase}-src-${src}`} cx={x} cy={y} r="3.5" className="cti-source" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} />;
          })}
          {infra.map(({ country }) => {
            const [x, y] = CENTROID[country];
            return (
              <g key={`infra-${country}`} className="cti-beacon">
                {!reduce && <circle cx={x} cy={y} r="5" className="cti-beacon-ring" />}
                <motion.path d={`M${x} ${y - 5.5}L${x + 5.5} ${y}L${x} ${y + 5.5}L${x - 5.5} ${y}Z`} className="cti-beacon-core"
                  initial={reduce ? false : { opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${x}px ${y}px` }} />
              </g>
            );
          })}
          {scanning && !reduce && (
            <motion.rect key={`sweep-${phase}`} y={VIEW.y} width="90" height={VIEW.h} fill="url(#cti-sweep)" initial={{ x: VIEW.x - 90 }} animate={{ x: VIEW.x + VIEW.w }} transition={{ duration: 2.4, ease: 'linear' }} />
          )}
          <defs>
            <linearGradient id="cti-sweep" x1="0" x2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
              <stop offset=".9" stopColor="var(--accent)" stopOpacity=".18" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity=".6" />
            </linearGradient>
          </defs>
        </svg>

        <div className="cti-phases" aria-hidden="true">
          <span className={after ? '' : 'on'}>Before training</span>
          <i><b style={{ width: `${(t / END) * 100}%` }} /></i>
          <span className={after ? 'on' : ''}>After training</span>
        </div>

        <div className="cti-overlay">
          <AnimatePresence mode="wait">
            <motion.div key={phase} initial={reduce ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <b className={`dream-phase ${after ? 'on' : ''}`}>{after ? 'AFTER TRAINING' : 'BEFORE TRAINING'}</b>
              <small>{after ? 'Nemotron-3.5-Super-MiST · Trained by Dream' : 'Nemotron 3.5 Super'}</small>
            </motion.div>
          </AnimatePresence>
          <dl>
            <div><dt>{targeted.size}</dt><dd>targeted countries</dd></div>
            <div><dt>{found.length}</dt><dd>active campaigns</dd></div>
            <div><dt>{groups.size}</dt><dd>threat groups</dd></div>
            <div><dt className="infra">{infra.length}</dt><dd>infrastructure targets</dd></div>
          </dl>
          <p className="cti-status">{scanning ? 'Analysing threat reports…' : after ? 'Full campaign picture linked' : 'Only partial links found'}</p>
        </div>

        <div className="cti-legend">
          <span><i className="origin" />Randomized source</span>
          <span><i className="target" />Targeted country</span>
          <span><i className="infra" />Infrastructure attack</span>
        </div>
      </div>

      <p className="cti-sample">Based on sample anonymized data</p>

      <aside className="cti-feed">
        <h4>Detected campaigns</h4>
        <AnimatePresence initial={false}>
          {found.map((c) => (
            <motion.article key={`${phase}-${c.name}`} layout initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <header><strong>{c.name}</strong><span className={`cti-sev ${c.severity.toLowerCase()}`}>{c.severity}</span></header>
              <p>Threat group <b>{c.group}</b> · {c.hits.length} {c.hits.length === 1 ? 'country' : 'countries'}</p>
              {after && c.infra?.map((i) => <small key={i.country} className="cti-infra">Infrastructure: {i.sector} · {COUNTRY_NAME[i.country]}</small>)}
            </motion.article>
          ))}
        </AnimatePresence>
        {!found.length && <p className="cti-empty">Waiting for analysis…</p>}
      </aside>
    </div>
  );
}
