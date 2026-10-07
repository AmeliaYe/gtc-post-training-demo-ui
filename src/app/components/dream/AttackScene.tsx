'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Step-by-step attack illustrations for the Model comparison questions. The CTI scene follows
// Dream's "Docker API Build Attack" illustration; the others use the same visual language.

type Tone = 'safe' | 'threat';
type Icon = 'terminal' | 'server' | 'image' | 'host' | 'container' | 'cloud' | 'disk' | 'file' | 'shield' | 'bot' | 'filter' | 'router' | 'web' | 'users' | 'core' | 'phone' | 'db' | 'pc';

type SceneNode = {
  x: number; y: number; icon: Icon; tone: Tone; label?: string; labelPos?: 'below' | 'right' | 'above';
  showAt?: number; tones?: Record<number, Tone>; pulseAt?: number; crossAt?: number;
  badge?: { text: string; tone: Tone; at: number };
  bars?: { tone: Tone; at: number }[];
};
type SceneEdge = { d: string; tone: Tone; at: number; tones?: Record<number, Tone>; dimAt?: number; label?: string; lx?: number; ly?: number; anchor?: 'middle' | 'start' };
export type Scene = {
  title?: string; steps: { text: string; tone: Tone }[]; nodes: SceneNode[]; edges: SceneEdge[];
  zones?: { x: number; y: number; w: number; h: number; label: string }[];
};

const STEP_MS = 2800;
const toneAt = (base: Tone, tones: Record<number, Tone> | undefined, step: number) =>
  Object.entries(tones ?? {}).reduce<Tone>((t, [at, next]) => (step >= Number(at) ? next : t), base);

const ICONS: Record<Icon, React.ReactNode> = {
  terminal: <><rect x="-24" y="-18" width="48" height="36" rx="4" /><path d="M-24 -8 h48 M-14 1 l7 5 l-7 5 M1 12 h10" /></>,
  server: <><circle r="16" /><path d="M0 -10 v20 M-10 0 h20" /></>,
  image: <path d="M-16 14 L0 -14 L16 14 Z" />,
  host: <rect x="-26" y="-26" width="52" height="52" rx="6" />,
  container: <><rect x="-22" y="-22" width="44" height="44" rx="4" /><rect x="-10" y="-10" width="20" height="20" rx="2" className="fill" /></>,
  cloud: <path d="M-18 12 h34 a10 10 0 0 0 0 -20 a14 14 0 0 0 -26 -4 a10 10 0 0 0 -8 24 Z" />,
  disk: <><circle r="17" /><circle r="5" /></>,
  file: <path d="M-12 -17 h15 l9 9 v25 h-24 Z M3 -17 v9 h9" />,
  shield: <path d="M0 -17 L14 -11 V1 C14 9 7 14 0 17 C-7 14 -14 9 -14 1 V-11 Z" />,
  bot: <><rect x="-15" y="-12" width="30" height="24" rx="5" /><path d="M0 -12 v-6 M-6 0 h.01 M6 0 h.01" /></>,
  filter: <path d="M-17 -14 h34 l-13 15 v13 l-8 -4 v-9 Z" />,
  router: <><circle r="17" /><path d="M-10 0 h20 M4 -6 l6 6 l-6 6" /></>,
  web: <><rect x="-21" y="-17" width="42" height="34" rx="3" /><path d="M-21 -8 h42 M-15 -12.5 h.01 M-10 -12.5 h.01" /></>,
  users: <><circle cx="-7" cy="-7" r="6" /><path d="M-18 14 a11 11 0 0 1 22 0" /><circle cx="9" cy="-5" r="5" /><path d="M6 6 a10 10 0 0 1 12 8" /></>,
  core: <><rect x="-25" y="-20" width="50" height="40" rx="5" /><path d="M-15 -8 h30 M-15 0 h30 M-15 8 h18" /></>,
  phone: <><rect x="-11" y="-18" width="22" height="36" rx="4" /><path d="M-3 12 h6" /></>,
  db: <><ellipse cy="-12" rx="16" ry="5" /><path d="M-16 -12 v24 a16 5 0 0 0 32 0 v-24 M-16 0 a16 5 0 0 0 32 0" /></>,
  pc: <><rect x="-16" y="-14" width="32" height="22" rx="2" /><path d="M-7 15 h14 M0 8 v7" /></>,
};

export const SCENES: Record<string, Scene> = {
  cti: {
    steps: [
      { text: 'Docker API exposed on the host', tone: 'safe' },
      { text: 'Attacker sends a remote build request to the Docker API', tone: 'threat' },
      { text: 'Build step: pull a safe base image', tone: 'safe' },
      { text: 'Build step: fetch malware from the attacker’s server and bake it into the image', tone: 'threat' },
      { text: 'Image built locally: no malicious image download to alert on', tone: 'threat' },
      { text: 'Container deployed from the custom image', tone: 'threat' },
    ],
    nodes: [
      { x: 70, y: 120, icon: 'terminal', tone: 'threat', label: 'Attacker' },
      { x: 300, y: 34, icon: 'server', tone: 'threat', label: 'Malicious server', labelPos: 'right' },
      { x: 300, y: 212, icon: 'image', tone: 'safe', label: 'Safe base image', labelPos: 'right' },
      { x: 300, y: 120, icon: 'host', tone: 'safe', tones: { 3: 'threat' }, label: 'Docker host', pulseAt: 1, bars: [{ tone: 'threat', at: 3 }, { tone: 'safe', at: 2 }] },
      { x: 530, y: 120, icon: 'container', tone: 'threat', label: 'Container', showAt: 5, pulseAt: 5 },
    ],
    edges: [
      { d: 'M100 120 H268', tone: 'threat', at: 1, label: 'POST /build', lx: 184, ly: 110 },
      { d: 'M300 196 V152', tone: 'safe', at: 2, label: 'FROM safe image', lx: 312, ly: 178, anchor: 'start' },
      { d: 'M300 52 V88', tone: 'threat', at: 3, label: 'RUN fetch malware', lx: 312, ly: 74, anchor: 'start' },
      { d: 'M332 120 H502', tone: 'threat', at: 5, label: 'docker run', lx: 417, ly: 110 },
    ],
  },
  triage: {
    steps: [
      { text: 'Windows tags files from the internet with Mark-of-the-Web (MOTW)', tone: 'safe' },
      { text: 'Attacker emails a link to an ISO on a public file share', tone: 'threat' },
      { text: 'Victim downloads the ISO: it carries the MOTW tag', tone: 'safe' },
      { text: 'Victim mounts the ISO: the EXE inside has no MOTW tag', tone: 'threat' },
      { text: 'The EXE runs: SmartScreen and Protected View never check it', tone: 'threat' },
    ],
    nodes: [
      { x: 60, y: 120, icon: 'terminal', tone: 'threat', label: 'Attacker' },
      { x: 200, y: 120, icon: 'cloud', tone: 'threat', label: 'File share' },
      { x: 340, y: 120, icon: 'disk', tone: 'safe', label: 'ISO file', showAt: 2, badge: { text: 'MOTW', tone: 'safe', at: 2 } },
      { x: 490, y: 120, icon: 'file', tone: 'threat', label: 'Payload .exe', showAt: 3, pulseAt: 4, badge: { text: 'no MOTW', tone: 'threat', at: 3 } },
      { x: 490, y: 34, icon: 'shield', tone: 'safe', tones: { 4: 'threat' }, label: 'SmartScreen', labelPos: 'right', crossAt: 4 },
    ],
    edges: [
      { d: 'M88 120 H172', tone: 'threat', at: 1, label: 'email link', lx: 130, ly: 110 },
      { d: 'M228 120 H316', tone: 'threat', at: 2, label: 'download', lx: 272, ly: 110 },
      { d: 'M364 120 H464', tone: 'threat', at: 3, label: 'mount + run', lx: 414, ly: 110 },
    ],
  },
  mitigation: {
    steps: [
      { text: 'Web service online: users connected', tone: 'safe' },
      { text: 'Attacker rents time on a large botnet', tone: 'threat' },
      { text: 'Bots worldwide flood the service with UDP packets', tone: 'threat' },
      { text: 'Bandwidth saturated: real users can’t reach the site', tone: 'threat' },
      { text: 'The right defense: filter network traffic at the perimeter (M1037)', tone: 'safe' },
    ],
    nodes: [
      { x: 60, y: 44, icon: 'bot', tone: 'threat', label: 'Botnet', labelPos: 'above', showAt: 1 },
      { x: 60, y: 120, icon: 'bot', tone: 'threat', showAt: 1 },
      { x: 60, y: 196, icon: 'bot', tone: 'threat', showAt: 1 },
      { x: 175, y: 120, icon: 'filter', tone: 'safe', label: 'Traffic filter', showAt: 4, pulseAt: 4 },
      { x: 325, y: 120, icon: 'router', tone: 'safe', tones: { 3: 'threat', 4: 'safe' }, label: 'Upstream link', pulseAt: 3 },
      { x: 448, y: 120, icon: 'web', tone: 'safe', tones: { 3: 'threat', 4: 'safe' }, label: 'Web service' },
      { x: 556, y: 120, icon: 'users', tone: 'safe', tones: { 3: 'threat', 4: 'safe' }, label: 'Users' },
    ],
    edges: [
      { d: 'M84 50 L299 112', tone: 'threat', at: 2, dimAt: 4 },
      { d: 'M84 120 H297', tone: 'threat', at: 2, dimAt: 4, label: 'UDP flood', lx: 120, ly: 110 },
      { d: 'M84 190 L299 128', tone: 'threat', at: 2, dimAt: 4 },
      { d: 'M351 120 H422', tone: 'safe', at: 0, tones: { 3: 'threat', 4: 'safe' } },
      { d: 'M531 120 H474', tone: 'safe', at: 0, tones: { 3: 'threat', 4: 'safe' } },
    ],
  },
  posture: {
    title: 'NETWORK VIEW',
    steps: [
      { text: 'dbs-310 sits in VLAN vlan_name2 (10.40.12.0/24)', tone: 'safe' },
      { text: 'Traffic from other subnets has to pass the router or firewall', tone: 'safe' },
      { text: 'Devices in the same VLAN skip that check and reach dbs-310 directly', tone: 'threat' },
      { text: 'Those same-VLAN devices are dbs-310’s direct exposure', tone: 'threat' },
    ],
    zones: [{ x: 330, y: 16, w: 262, h: 214, label: 'VLAN vlan_name2 · 10.40.12.0/24' }],
    nodes: [
      { x: 70, y: 120, icon: 'pc', tone: 'safe', label: 'Other subnets' },
      { x: 220, y: 120, icon: 'shield', tone: 'safe', label: 'Router / firewall' },
      { x: 410, y: 52, icon: 'pc', tone: 'safe', tones: { 2: 'threat' } },
      { x: 410, y: 180, icon: 'pc', tone: 'safe', tones: { 2: 'threat' } },
      { x: 530, y: 120, icon: 'db', tone: 'safe', tones: { 3: 'threat' }, label: 'dbs-310', pulseAt: 3 },
    ],
    edges: [
      { d: 'M98 120 H198', tone: 'safe', at: 1 },
      { d: 'M242 120 H506', tone: 'safe', at: 1, label: 'via firewall', lx: 290, ly: 110 },
      { d: 'M432 64 L508 108', tone: 'threat', at: 2, label: 'direct', lx: 482, ly: 76, anchor: 'start' },
      { d: 'M432 168 L508 132', tone: 'threat', at: 2 },
    ],
  },
  vuln: {
    steps: [
      { text: 'The MME connects phones to the 4G network', tone: 'safe' },
      { text: 'Attacker sends an Initial UE Message missing the PLMN Identity', tone: 'threat' },
      { text: 'The code hits an assert(): a debug check exposed to network input', tone: 'threat' },
      { text: 'The assertion fails and the MME process crashes', tone: 'threat' },
      { text: 'Phones lose service, and the attacker can repeat it at will', tone: 'threat' },
    ],
    nodes: [
      { x: 60, y: 120, icon: 'terminal', tone: 'threat', label: 'Attacker' },
      { x: 300, y: 120, icon: 'core', tone: 'safe', tones: { 3: 'threat' }, label: 'MME · 4G core', pulseAt: 3, crossAt: 3, badge: { text: 'assert()', tone: 'threat', at: 2 } },
      { x: 530, y: 120, icon: 'phone', tone: 'safe', tones: { 4: 'threat' }, label: 'Phones', crossAt: 4 },
    ],
    edges: [
      { d: 'M88 120 H270', tone: 'threat', at: 1, label: 'Initial UE Message', lx: 179, ly: 110 },
      { d: 'M330 120 H514', tone: 'safe', at: 0, tones: { 3: 'threat' }, label: 'service', lx: 422, ly: 110 },
    ],
  },
};

export default function AttackScene({ scene }: { scene: Scene }) {
  const reduce = useReducedMotion();
  const last = scene.steps.length - 1;
  const [{ step, cycle }, setState] = useState({ step: 0, cycle: 0 });
  useEffect(() => {
    if (reduce) return;
    // One extra tick holds the final state before the loop restarts.
    const id = window.setInterval(() => setState((s) => (s.step > last ? { step: 0, cycle: s.cycle + 1 } : { ...s, step: s.step + 1 })), STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce, last]);
  const now = reduce ? last : Math.min(step, last);
  const caption = scene.steps[now];

  return (
    <div className="attack-scene">
      <div className="as-head">
        <span className="as-title">{scene.title ?? 'ATTACK FLOW'}</span>
        <span className="as-legend"><i className="threat" />Attacker / compromised<i className="safe" />Legitimate</span>
      </div>
      <svg viewBox="0 0 600 240" role="img" aria-label={scene.steps.map((s) => s.text).join('. ')}>
        {scene.zones?.map((z) => (
          <g key={z.label}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="10" className="as-zone" />
            <text x={z.x + 12} y={z.y + z.h - 10} className="as-zone-label">{z.label}</text>
          </g>
        ))}
        {scene.edges.map((e) => <path key={`bg-${e.d}`} d={e.d} className="as-track" />)}
        {scene.edges.map((e) => now >= e.at && (
          <motion.g key={`${cycle}-${e.d}`} animate={{ opacity: e.dimAt !== undefined && now >= e.dimAt ? .15 : 1 }}>
            <motion.path d={e.d} className={`as-line ${toneAt(e.tone, e.tones, now)}`} initial={{ pathLength: reduce || e.at === 0 ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeInOut' }} />
            {e.label && <motion.text x={e.lx} y={e.ly} textAnchor={e.anchor ?? 'middle'} className={`as-edge-label ${toneAt(e.tone, e.tones, now)}`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .3 }}>{e.label}</motion.text>}
          </motion.g>
        ))}
        {scene.nodes.map((n, i) => {
          if (n.showAt !== undefined && now < n.showAt) return null;
          const tone = toneAt(n.tone, n.tones, now);
          const lp = n.labelPos ?? 'below';
          return (
            <motion.g key={`${cycle}-${i}`} initial={reduce ? false : { opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${n.x}px ${n.y}px` }}>
              {n.pulseAt === now && !reduce && <motion.circle cx={n.x} cy={n.y} r="30" className={`as-pulse ${tone}`} initial={{ scale: .7, opacity: .9 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 1.6 }} style={{ transformOrigin: `${n.x}px ${n.y}px` }} />}
              <g transform={`translate(${n.x} ${n.y})`} className={`as-icon ${tone}`}>
                <rect x="-24" y="-24" width="48" height="48" rx="12" className="as-tile" />
                {ICONS[n.icon]}
                {n.bars?.map((b, j) => now >= b.at && <motion.rect key={j} x="-17" y={j ? 4 : -13} width="34" height="9" rx="2" className={`as-bar ${b.tone}`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} />)}
                {n.crossAt !== undefined && now >= n.crossAt && <motion.path d="M-12 -12 L12 12 M12 -12 L-12 12" className="as-cross" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} />}
              </g>
              {n.badge && now >= n.badge.at && (
                <motion.g initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <rect x={n.x - 28} y={n.y - 50} width="56" height="16" rx="8" className={`as-badge ${n.badge.tone}`} />
                  <text x={n.x} y={n.y - 39} textAnchor="middle" className={`as-badge-text ${n.badge.tone}`}>{n.badge.text}</text>
                </motion.g>
              )}
              {n.label && (
                <text className={`as-label ${tone}`} textAnchor={lp === 'right' ? 'start' : 'middle'}
                  x={lp === 'right' ? n.x + 26 : n.x} y={lp === 'right' ? n.y + 4 : lp === 'above' ? n.y - 26 : n.y + 42}>{n.label}</text>
              )}
            </motion.g>
          );
        })}
      </svg>
      <motion.p key={`${cycle}-${now}`} className={`as-status ${caption.tone}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <b>{String(now + 1).padStart(2, '0')}/{String(last + 1).padStart(2, '0')}</b>{caption.text}
      </motion.p>
    </div>
  );
}
