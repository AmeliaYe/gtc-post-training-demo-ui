'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PauseIcon, PlayIcon } from '@heroicons/react/24/solid';
import { COUNTRIES } from './worldMap';

// Illustrative CTI map: the same threat-report feed analysed before and after training.
// Groups are anonymized and never placed in a country: every attack enters from an unattributed
// source beyond the map edge. This is not a measured result.
// `infra`: critical-infrastructure targets inside a targeted country. Only the trained model
// surfaces them (the base model at most links the campaign to a country), so beacons appear after training.
type Infra = { country: string; sectors: string[] }; // 1-3 sites per targeted country
type Campaign = { name: string; group: string; severity: 'Critical' | 'High' | 'Medium'; targets: string[]; before: string[]; infra?: Infra[] };
// A realistic gain: the same reports, read better. The base model surfaces 2 campaigns and one
// country each; the trained model links 4 campaigns to 3 groups, their full target set (9 countries)
// and the critical infrastructure they hit.
const CAMPAIGNS: Campaign[] = [
  { name: 'Campaign 01', group: 'Group A', severity: 'Critical', targets: ['792', '398'], before: ['792'], infra: [{ country: '792', sectors: ['Energy grid', 'Telecom'] }, { country: '398', sectors: ['Energy grid', 'Oil & gas', 'Rail'] }] },
  { name: 'Campaign 02', group: 'Group B', severity: 'High', targets: ['356', '586'], before: ['356'], infra: [{ country: '356', sectors: ['Telecom', 'Energy grid', 'Banking'] }, { country: '586', sectors: ['Energy grid'] }] },
  { name: 'Campaign 03', group: 'Group C', severity: 'Critical', targets: ['704', '360', '608'], before: [], infra: [{ country: '704', sectors: ['Ports', 'Energy grid'] }, { country: '360', sectors: ['Energy grid', 'Ports'] }, { country: '608', sectors: ['Telecom'] }] },
  { name: 'Campaign 04', group: 'Group B', severity: 'Medium', targets: ['784', '512'], before: [], infra: [{ country: '784', sectors: ['Oil & gas'] }, { country: '512', sectors: ['Oil & gas', 'Ports'] }] },
];
// Offsets that spread a country's 1-3 infrastructure beacons around its centroid.
const SPREAD: [number, number][] = [[0, 0], [10, -6], [-9, 7]];
const CENTROID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.c]));
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

// What each model links from the same reports, as a share of the full campaign picture
// (every campaign, targeted country and infrastructure site in the sample data).
type Linked = { campaigns: number; countries: number; infra: number };
const share = (l: Linked) => (l.campaigns + l.countries + l.infra) / (FULL.campaigns + FULL.countries + FULL.infra);
const FULL: Linked = {
  campaigns: CAMPAIGNS.length,
  countries: new Set(CAMPAIGNS.flatMap((c) => c.targets)).size,
  infra: CAMPAIGNS.flatMap((c) => (c.infra ?? []).flatMap((f) => f.sectors)).length,
};
const BEFORE_FOUND = CAMPAIGNS.filter((c) => c.before.length);
const BEFORE_FINAL: Linked = { campaigns: BEFORE_FOUND.length, countries: new Set(BEFORE_FOUND.flatMap((c) => c.before)).size, infra: 0 };

// Timeline in 500 ms ticks: before scan, before findings, after scan, after findings, hold, loop.
const TICK = 500, AFTER_AT = 14, END = 49; // ~8 s hold on the final picture before the loop restarts
const foundAt = (i: number, after: boolean) => (after ? AFTER_AT + 5 + i * 2 : 5 + i * 2);

const arc = ([x1, y1]: readonly number[], [x2, y2]: readonly number[]) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1);
  return `M${x1} ${y1} Q${mx} ${my - Math.max(18, len * .35)} ${x2} ${y2}`;
};

export default function CtiMap() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [sources, setSources] = useState(pickSources);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => setTick((t) => {
      if (t < END) return t + 1;
      setSources(pickSources()); // new random origins every loop
      return 0;
    }), TICK);
    return () => window.clearInterval(id);
  }, [reduce, paused]);
  const t = reduce ? END : tick;
  const after = t >= AFTER_AT;

  // What the current model has surfaced so far.
  const pool = after ? CAMPAIGNS : CAMPAIGNS.filter((c) => c.before.length);
  const found = pool.filter((_, i) => t >= foundAt(i, after)).map((c) => ({ ...c, hits: after ? c.targets : c.before }));
  const targeted = new Set(found.flatMap((c) => c.hits));
  const infra = after ? found.flatMap((c) => (c.infra ?? []).flatMap((f) => f.sectors.map((sector, k) => ({ country: f.country, sector, k })))) : [];
  const scanning = t < (after ? AFTER_AT + 5 : 5);
  const live: Linked = { campaigns: found.length, countries: targeted.size, infra: infra.length };
  const phase = after ? 'after' : 'before';

  return (
    <div className="cti">
      <div className={`cti-map ${paused ? 'paused' : ''}`}>
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
          {infra.map(({ country, k }) => {
            const [cx, cy] = CENTROID[country];
            const [x, y] = [cx + SPREAD[k][0], cy + SPREAD[k][1]];
            return (
              <g key={`infra-${country}-${k}`} className="cti-beacon">
                {!reduce && <circle cx={x} cy={y} r="4" className="cti-beacon-ring" />}
                <motion.path d={`M${x} ${y - 4.5}L${x + 4.5} ${y}L${x} ${y + 4.5}L${x - 4.5} ${y}Z`} className="cti-beacon-core"
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

        <div className="cti-actions">
          <div className="cti-phases" aria-hidden="true">
            <span className={after ? '' : 'on'}>Before training</span>
            <i><b style={{ width: `${(t / END) * 100}%` }} /></i>
            <span className={after ? 'on after' : ''}>After training</span>
          </div>
          {!reduce && (
            <button className="cti-play" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Resume animation' : 'Pause animation'}>
              {paused ? <PlayIcon /> : <PauseIcon />}{paused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>

        <div className="cti-overlay">
          {([
            { key: 'before', phase: 'BEFORE TRAINING', model: 'Nemotron 3.5 Super', linked: after ? BEFORE_FINAL : live, active: !after },
            { key: 'after', phase: 'AFTER TRAINING', model: 'CLM', linked: after ? live : null, active: after },
          ] as const).map((row) => (
            <div key={row.key} className={`cti-compare ${row.key} ${row.active ? 'active' : ''}`}>
              <div className="cti-compare-head">
                <b className={`dream-phase ${row.key === 'after' ? 'on' : ''}`}>{row.phase}</b><span>{row.model}</span>
                <strong>{row.linked ? `${Math.round(share(row.linked) * 100)}%` : '–'}</strong>
              </div>
              <i className="cti-compare-bar"><b style={{ width: `${row.linked ? share(row.linked) * 100 : 0}%` }} /></i>
              <small>{row.linked ? `${row.linked.campaigns} campaigns · ${row.linked.countries} countries · ${row.linked.infra} infrastructure sites linked` : 'Next: the same reports after post-training'}</small>
            </div>
          ))}
          <p className={`cti-result ${scanning ? '' : after ? 'ok' : 'bad'}`}>{scanning ? 'Analysing threat reports…' : after ? `Post-training links ${Math.round((share(live) / share(BEFORE_FINAL)) * 10) / 10}× more of the campaign picture` : 'Only partial links found'}</p>
        </div>

        <span className="cti-watermark">Illustrative example data</span>

        <div className="cti-legend">
          <span><i className="target" />Targeted country</span>
          <span><i className="infra" />Critical infrastructure attack</span>
        </div>
      </div>

      <aside className="cti-feed">
        <h4>Detected campaigns</h4>
        <AnimatePresence initial={false}>
          {found.map((c) => (
            <motion.article key={`${phase}-${c.name}`} layout initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <header><strong>{c.name} <span>· {c.group}</span></strong><span className={`cti-sev ${c.severity.toLowerCase()}`}>{c.severity}</span></header>
              <p>{c.hits.length} {c.hits.length === 1 ? 'country' : 'countries'}{after && c.infra && ` · ${c.infra.flatMap((f) => f.sectors).length} infrastructure sites`}</p>
              {after && c.infra && <small className="cti-infra">{[...new Set(c.infra.flatMap((f) => f.sectors))].join(', ')}</small>}
            </motion.article>
          ))}
        </AnimatePresence>
        {!found.length && <p className="cti-empty">Waiting for analysis…</p>}
      </aside>
    </div>
  );
}
