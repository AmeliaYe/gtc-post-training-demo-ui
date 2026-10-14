'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PauseIcon, PlayIcon } from '@heroicons/react/24/solid';
import { COUNTRIES } from './worldMap';

// Illustrative CTI map: the same threat-report feed analysed before and after training.
// The source is intentionally shown as a threat actor rather than a country.
// Dotted lines represent relationships inferred from reports, not physical attack trajectories.
// `infra`: critical-infrastructure targets inside a targeted country. Only the trained model
// surfaces them (the base model at most links the campaign to a country), so beacons appear after training.
type Infra = { country: string; sectors: string[] }; // 1-3 sites per targeted country
type Campaign = { name: string; group: string; severity: 'Critical' | 'High' | 'Medium'; targets: string[]; before: string[]; infra?: Infra[] };
// A realistic gain: the same reports, read better. The base model surfaces 2 campaigns and one
// country each; the trained model links 4 campaigns to 3 groups, their full target set (9 countries)
// and the critical infrastructure they hit. Each target slot lists the sectors hit in that country;
// `before` is how many of a campaign's targets the base model finds.
const PLAN = [
  { name: 'Campaign 01', group: 'Group A', severity: 'Critical', before: 1, sites: [['Energy grid', 'Telecom'], ['Energy grid', 'Oil & gas', 'Rail']] },
  { name: 'Campaign 02', group: 'Group B', severity: 'High', before: 1, sites: [['Telecom', 'Energy grid', 'Banking'], ['Energy grid']] },
  { name: 'Campaign 03', group: 'Group C', severity: 'Critical', before: 0, sites: [['Ports', 'Energy grid'], ['Energy grid', 'Ports'], ['Telecom']] },
  { name: 'Campaign 04', group: 'Group B', severity: 'Medium', before: 0, sites: [['Oil & gas'], ['Oil & gas', 'Ports']] },
] as const;
// Sample-data targets: each loop draws 9 countries from this pool of small, geopolitically low-profile
// countries, so no pairing reads as a real incident. First loop: Portugal, Iceland, Ghana, Kenya, Uruguay,
// Nepal, Laos, Papua New Guinea, Fiji; then Ireland, Luxembourg, Malta, Slovenia, Croatia, Switzerland,
// Botswana, Namibia, Senegal, Cabo Verde, Mauritius, Zambia, Tanzania, Bhutan, Samoa, Vanuatu, Tonga,
// Chile, Paraguay, Costa Rica, Belize, Suriname, Dominican Republic, Jamaica, Barbados, Bahamas.
const TARGET_POOL = ['620', '352', '288', '404', '858', '524', '418', '598', '242', '372', '442', '470', '705', '191', '756', '072', '516', '686', '132', '480', '894', '834', '064', '882', '548', '776', '152', '600', '188', '084', '740', '214', '388', '052', '044'];
const toCampaigns = (ids: string[]): Campaign[] => {
  let n = 0;
  return PLAN.map(({ sites, before, ...c }) => {
    const infra = sites.map((sectors) => ({ country: ids[n++], sectors: [...sectors] }));
    const targets = infra.map((f) => f.country);
    return { ...c, targets, before: targets.slice(0, before), infra };
  });
};
// The first loop is fixed (matches the server render); later loops reshuffle.
const pickCampaigns = () => toCampaigns([...TARGET_POOL].sort(() => Math.random() - .5));
const CAMPAIGNS = toCampaigns(TARGET_POOL);
// Offsets that spread a country's 1-3 infrastructure beacons around its centroid.
const SPREAD: [number, number][] = [[0, 0], [10, -6], [-9, 7]];
// Island states too small for the 110m map: drawn as a dot at their Mercator position on this map.
const ISLANDS: { id: string; c: [number, number] }[] = [
  { id: '470', c: [532, 283] }, // Malta
  { id: '132', c: [447, 333] }, // Cabo Verde
  { id: '480', c: [628, 415] }, // Mauritius
  { id: '882', c: [918, 400] }, // Samoa
  { id: '776', c: [911, 417] }, // Tonga
  { id: '052', c: [367, 339] }, // Barbados
];
const CENTROID = Object.fromEntries([...COUNTRIES, ...ISLANDS].map((c) => [c.id, c.c]));
// Crop of the world map: from Central America to Tonga, Iceland to Uruguay.
const VIEW = { x: 240, y: 60, w: 720, h: 420 };
// Threat-actor positions: each loop the three groups land at fully random spots on the visible map, kept
// inside its edges (icon and label included), off the top overlays, apart from each other and off the targets.
// The first loop uses fixed open-water spots so it matches the server render.
type Spot = readonly [number, number];
const GROUPS = [...new Set(CAMPAIGNS.map((c) => c.group))];
const FIRST_ACTORS: Record<string, Spot> = { 'Group A': [870, 260], 'Group B': [850, 350], 'Group C': [670, 410] };
const pickActors = (campaigns: Campaign[]) => {
  const avoid = campaigns.flatMap((c) => c.targets).map((id) => CENTROID[id]);
  const spots: Spot[] = [];
  for (let tries = 0; spots.length < GROUPS.length && tries < 2000; tries++) {
    const p: Spot = [VIEW.x + 25 + Math.random() * (VIEW.w - 50), VIEW.y + 45 + Math.random() * (VIEW.h - 80)];
    if (p[0] > 830 && p[1] < 170) continue; // watermark
    if (spots.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 70) && avoid.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 30)) spots.push(p);
  }
  return spots.length < GROUPS.length ? FIRST_ACTORS : Object.fromEntries(GROUPS.map((g, i) => [g, spots[i]]));
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

export default function CtiMap() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [campaigns, setCampaigns] = useState(CAMPAIGNS);
  const [actors, setActors] = useState(FIRST_ACTORS);
  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => setTick((t) => {
      if (t < END) return t + 1;
      const next = pickCampaigns(); // new random targets and attacker spots every loop
      setCampaigns(next);
      setActors(pickActors(next));
      return 0;
    }), TICK);
    return () => window.clearInterval(id);
  }, [reduce, paused]);
  const t = reduce ? END : tick;
  const after = t >= AFTER_AT;

  // What the current model has surfaced so far.
  const pool = after ? campaigns : campaigns.filter((c) => c.before.length);
  const found = pool.filter((_, i) => t >= foundAt(i, after)).map((c) => ({ ...c, hits: after ? c.targets : c.before }));
  const targeted = new Set(found.flatMap((c) => c.hits));
  const activeGroups = [...new Set(found.map((c) => c.group))];
  const infra = after ? found.flatMap((c) => (c.infra ?? []).flatMap((f) => f.sectors.map((sector, k) => ({ country: f.country, sector, k })))) : [];
  const scanning = t < (after ? AFTER_AT + 5 : 5);
  const live: Linked = { campaigns: found.length, countries: targeted.size, infra: infra.length };
  const phase = after ? 'after' : 'before';

  return (
    <div className="cti">
      <div className={`cti-map ${paused ? 'paused' : ''}`}>
        <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="img" aria-label={`Illustrative CTI map. Dotted lines connect distinct anonymous attackers to relationships inferred from reports. Before training the model links ${CAMPAIGNS.filter((c) => c.before.length).length} campaigns; after training it links ${CAMPAIGNS.length} campaigns across ${new Set(CAMPAIGNS.flatMap((c) => c.targets)).size} countries.`}>
          {COUNTRIES.map((c) => <path key={c.id} d={c.d} className={`cti-country ${targeted.has(c.id) ? 'hit' : ''}`} />)}
          {ISLANDS.filter((c) => targeted.has(c.id)).map((c) => <circle key={c.id} cx={c.c[0]} cy={c.c[1]} r="3.5" className="cti-country hit" />)}
          {found.map((c) => c.hits.map((id) => {
            const [ax, ay] = actors[c.group];
            return <motion.line key={`${phase}-${c.name}-${id}`} x1={ax} y1={ay} x2={CENTROID[id][0]} y2={CENTROID[id][1]} className="cti-link"
              initial={reduce ? false : { opacity: 0 }} animate={{ opacity: .78 }} transition={{ duration: .45, ease: 'easeOut' }} />;
          }))}
          {activeGroups.map((group) => {
            const [x, y] = actors[group];
            const suffix = group.slice(-1);
            return (
              <motion.g key={`${phase}-${group}`} className="cti-actor" transform={`translate(${x} ${y})`} role="img" aria-label={`Attacker ${suffix}, shown over open water`}
                initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .35 }}>
                <g transform="scale(.54)">
                  <circle r="31" className="cti-actor-halo" />
                  <path d="M-28 23C-25 9-18 3-11 0C-14-9-11-22 0-30C11-22 14-9 11 0C18 3 25 9 28 23Z" className="cti-actor-body" />
                  <path d="M-17 0C-18-14-11-29 0-34C11-29 18-14 17 0C13 9 7 14 0 17C-7 14-13 9-17 0Z" className="cti-actor-hood" />
                  <path d="M-11-2C-11-13-7-22 0-26C7-22 11-13 11-2C8 5 4 8 0 10C-4 8-8 5-11-2Z" className="cti-actor-face" />
                  <path d="M-5-2H-1M1-2H5" className="cti-actor-eyes" />
                  <path d="M-22 9H22V26H-22ZM-27 28H27L23 32H-23Z" className="cti-actor-laptop" />
                  <path d="M-8 15L-4 18L-8 21M-1 21H8" className="cti-actor-code" />
                </g>
                <text y="25" className="cti-actor-label">ATTACKER {suffix}</text>
              </motion.g>
            );
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
            <linearGradient id="cti-actor-cloak" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#cdd0fc" stopOpacity=".52" />
              <stop offset=".48" stopColor="#596080" stopOpacity=".9" />
              <stop offset="1" stopColor="#111a31" />
            </linearGradient>
            <linearGradient id="cti-actor-hood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7f86ad" stopOpacity=".9" />
              <stop offset=".55" stopColor="#26304c" />
              <stop offset="1" stopColor="#0a1227" />
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

        <span className="cti-watermark"><span>Illustrative</span><span>example</span><span>data</span></span>

        <div className="cti-legend">
          <span><i className="target" />Targeted country</span>
          <span><i className="infra" />Critical infrastructure affected</span>
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
