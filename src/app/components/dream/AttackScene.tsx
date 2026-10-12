'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Step-by-step attack illustrations for the Model comparison questions. The CTI scene follows
// Dream's "Docker API Build Attack" illustration; the others use the same visual language.

type Tone = 'safe' | 'threat';
type Icon = 'terminal' | 'server' | 'image' | 'host' | 'container' | 'cloud' | 'disk' | 'file' | 'shield' | 'bot' | 'filter' | 'router' | 'web' | 'users' | 'core' | 'phone' | 'db' | 'pc';

type SceneNode = {
  x: number; y: number; icon: Icon; tone: Tone; label?: string; labelPos?: 'below' | 'right' | 'left' | 'above';
  showAt?: number; tones?: Record<number, Tone>; pulseAt?: number; crossAt?: number;
  badge?: { text: string; tone: Tone; at: number };
  bars?: { tone: Tone; at: number }[];
};
type SceneEdge = { d: string; tone: Tone; at: number; tones?: Record<number, Tone>; dimAt?: number; label?: string; lx?: number; ly?: number; anchor?: 'middle' | 'start' };
// `marks`: where each step's number sits on the drawing (index = step).
export type Scene = {
  title?: string; legend?: [string, string]; steps: { text: string; tone: Tone }[]; marks: [number, number][]; nodes: SceneNode[]; edges: SceneEdge[];
  zones?: { x: number; y: number; w: number; h: number; label: string }[];
};

const STEP_MS = 3400; // time to read each caption
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
      { text: 'The attacker has access to the host’s Docker API', tone: 'threat' },
      { text: 'It sends a remote build request with its own Dockerfile', tone: 'threat' },
      { text: 'Build step: pull a vanilla Alpine base image', tone: 'safe' },
      { text: 'Build step: fetch malware from the attacker’s C2 server and bake it into the image', tone: 'threat' },
      { text: 'The image is built locally: no malicious image download to alert on', tone: 'threat' },
      { text: 'A container is deployed from the custom image for follow-on activity', tone: 'threat' },
    ],
    marks: [[424, 96], [150, 120], [366, 40], [426, 40], [376, 96], [630, 120]],
    nodes: [
      { x: 90, y: 120, icon: 'terminal', tone: 'threat', label: 'Attacker' },
      { x: 560, y: 40, icon: 'server', tone: 'threat', label: 'Attacker C2 server', labelPos: 'right' },
      { x: 260, y: 40, icon: 'image', tone: 'safe', label: 'Alpine base image', labelPos: 'left' },
      { x: 400, y: 120, icon: 'host', tone: 'safe', tones: { 3: 'threat' }, label: 'Docker host', pulseAt: 1, bars: [{ tone: 'threat', at: 3 }, { tone: 'safe', at: 2 }] },
      { x: 710, y: 120, icon: 'container', tone: 'threat', label: 'Container', showAt: 5, pulseAt: 5 },
    ],
    edges: [
      { d: 'M118 120 H372', tone: 'threat', at: 1, label: 'POST /build', lx: 250, ly: 110 },
      { d: 'M284 40 H386 Q394 40 394 48 V96', tone: 'safe', at: 2, label: 'FROM alpine', lx: 320, ly: 30 },
      { d: 'M536 40 H414 Q406 40 406 48 V96', tone: 'threat', at: 3, label: 'fetch malware', lx: 490, ly: 30 },
      { d: 'M428 120 H682', tone: 'threat', at: 5, label: 'docker run', lx: 545, ly: 110 },
    ],
  },
  triage: {
    steps: [
      { text: 'Windows tags files downloaded from the internet with Mark-of-the-Web (MOTW)', tone: 'safe' },
      { text: 'The attacker emails the victim a link to an ISO on a public file share', tone: 'threat' },
      { text: 'The victim downloads the ISO: it is saved with the MOTW tag', tone: 'safe' },
      { text: 'The victim mounts the ISO: the EXE inside has no MOTW, because disk images drop it', tone: 'threat' },
      { text: 'The EXE runs: SmartScreen and Protected View never check it', tone: 'threat' },
    ],
    marks: [[274, 96], [134, 120], [250, 80], [548, 120], [614, 18]],
    nodes: [
      { x: 90, y: 120, icon: 'terminal', tone: 'threat', label: 'Attacker' },
      { x: 250, y: 120, icon: 'pc', tone: 'safe', label: 'Victim' },
      { x: 250, y: 40, icon: 'cloud', tone: 'threat', label: 'Public file share', labelPos: 'right', showAt: 1 },
      { x: 420, y: 120, icon: 'disk', tone: 'safe', label: 'ISO file', showAt: 2, badge: { text: 'MOTW', tone: 'safe', at: 2 } },
      { x: 590, y: 120, icon: 'file', tone: 'threat', label: 'Payload .exe', showAt: 3, pulseAt: 4, badge: { text: 'no MOTW', tone: 'threat', at: 3 } },
      { x: 590, y: 40, icon: 'shield', tone: 'safe', tones: { 4: 'threat' }, label: 'SmartScreen', labelPos: 'right', crossAt: 4 },
    ],
    edges: [
      { d: 'M118 120 H226', tone: 'threat', at: 1, label: 'email link', lx: 186, ly: 110 },
      { d: 'M250 64 V96', tone: 'threat', at: 2 },
      { d: 'M274 120 H396', tone: 'safe', at: 2, label: 'saved', lx: 335, ly: 110 },
      { d: 'M444 120 H566', tone: 'threat', at: 3, label: 'mount + run', lx: 490, ly: 110 },
    ],
  },
  mitigation: {
    steps: [
      { text: 'The web service is online and users are connected', tone: 'safe' },
      { text: 'The attacker rents time on a large botnet', tone: 'threat' },
      { text: 'Bots worldwide flood the service with UDP packets', tone: 'threat' },
      { text: 'The upstream bandwidth is saturated: real users can’t reach the site', tone: 'threat' },
      { text: 'The right defense: filter network traffic at the perimeter (M1037)', tone: 'safe' },
    ],
    marks: [[594, 96], [144, 42], [330, 120], [444, 96], [274, 96]],
    nodes: [
      { x: 120, y: 64, icon: 'bot', tone: 'threat', showAt: 1 },
      { x: 120, y: 120, icon: 'bot', tone: 'threat', label: 'Botnet', labelPos: 'left', showAt: 1 },
      { x: 120, y: 176, icon: 'bot', tone: 'threat', showAt: 1 },
      { x: 250, y: 120, icon: 'filter', tone: 'safe', label: 'Traffic filter', showAt: 4, pulseAt: 4 },
      { x: 420, y: 120, icon: 'router', tone: 'safe', tones: { 3: 'threat', 4: 'safe' }, label: 'Upstream link', pulseAt: 3 },
      { x: 570, y: 120, icon: 'web', tone: 'safe', tones: { 3: 'threat', 4: 'safe' }, label: 'Web service' },
      { x: 710, y: 120, icon: 'users', tone: 'safe', tones: { 3: 'threat', 4: 'safe' }, label: 'Users' },
    ],
    edges: [
      { d: 'M144 68 L396 114', tone: 'threat', at: 2, dimAt: 4 },
      { d: 'M144 120 H396', tone: 'threat', at: 2, dimAt: 4, label: 'UDP flood', lx: 186, ly: 110 },
      { d: 'M144 172 L396 126', tone: 'threat', at: 2, dimAt: 4 },
      { d: 'M444 120 H546', tone: 'safe', at: 0, tones: { 3: 'threat', 4: 'safe' } },
      { d: 'M686 120 H594', tone: 'safe', at: 0, tones: { 3: 'threat', 4: 'safe' } },
    ],
  },
  posture: {
    title: 'NETWORK VIEW',
    // Not an attack: red marks exposure, not malicious activity.
    legend: ['Direct exposure', 'Through firewall'],
    steps: [
      { text: 'dbs-310 sits in VLAN vlan_name2 (10.40.12.0/24)', tone: 'safe' },
      { text: 'Traffic from other subnets has to pass the router or firewall', tone: 'safe' },
      { text: 'Devices in the same VLAN skip that check and reach dbs-310 directly', tone: 'threat' },
      { text: 'Those same-VLAN devices are dbs-310’s direct exposure', tone: 'threat' },
    ],
    marks: [[666, 96], [375, 120], [540, 80], [714, 96]],
    zones: [{ x: 400, y: 6, w: 360, h: 186, label: 'VLAN vlan_name2 · 10.40.12.0/24' }],
    nodes: [
      { x: 90, y: 120, icon: 'pc', tone: 'safe', label: 'Other subnets' },
      { x: 260, y: 120, icon: 'shield', tone: 'safe', label: 'Router / firewall' },
      { x: 470, y: 58, icon: 'pc', tone: 'safe', tones: { 2: 'threat' } },
      { x: 470, y: 154, icon: 'pc', tone: 'safe', tones: { 2: 'threat' } },
      { x: 690, y: 120, icon: 'db', tone: 'safe', tones: { 3: 'threat' }, label: 'dbs-310', pulseAt: 3 },
    ],
    edges: [
      { d: 'M118 120 H236', tone: 'safe', at: 1 },
      { d: 'M284 120 H666', tone: 'safe', at: 1, label: 'via firewall', lx: 320, ly: 110 },
      { d: 'M494 68 L664 114', tone: 'threat', at: 2, label: 'direct', lx: 600, ly: 84 },
      { d: 'M494 146 L664 126', tone: 'threat', at: 2 },
    ],
  },
  vuln: {
    steps: [
      { text: 'The Open5GS MME connects phones to the 4G network', tone: 'safe' },
      { text: 'The attacker sends an Initial UE Message over S1AP, missing the PLMN Identity', tone: 'threat' },
      { text: 'The code hits an assert(): a debug check reachable from network input', tone: 'threat' },
      { text: 'The assertion fails and the MME process crashes', tone: 'threat' },
      { text: 'Phones lose service, and the attacker can repeat it at will', tone: 'threat' },
    ],
    marks: [[620, 120], [140, 120], [440, 78], [448, 120], [734, 96]],
    nodes: [
      { x: 90, y: 120, icon: 'terminal', tone: 'threat', label: 'Attacker' },
      { x: 400, y: 120, icon: 'core', tone: 'safe', tones: { 3: 'threat' }, label: 'Open5GS MME · 4G core', pulseAt: 3, crossAt: 3, badge: { text: 'assert()', tone: 'threat', at: 2 } },
      { x: 710, y: 120, icon: 'phone', tone: 'safe', tones: { 4: 'threat' }, label: 'Phones', crossAt: 4 },
    ],
    edges: [
      { d: 'M118 120 H372', tone: 'threat', at: 1, label: 'Initial UE Message · S1AP', lx: 245, ly: 110 },
      { d: 'M430 120 H686', tone: 'safe', at: 0, tones: { 3: 'threat' }, label: 'service', lx: 560, ly: 110 },
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
        <span className="as-legend"><i className="threat" />{scene.legend?.[0] ?? 'Malicious'}<i className="safe" />{scene.legend?.[1] ?? 'Legitimate'}</span>
      </div>
      <svg viewBox="0 0 800 196" role="img" aria-label={scene.steps.map((s) => s.text).join('. ')}>
        {scene.zones?.map((z) => (
          <g key={z.label}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="10" className="as-zone" />
            <text x={z.x + 12} y={z.y + 18} className="as-zone-label">{z.label}</text>
          </g>
        ))}
        {scene.edges.map((e) => <path key={`bg-${e.d}`} d={e.d} className="as-track" />)}
        {scene.edges.map((e) => now >= e.at && (
          <motion.g key={`${cycle}-${e.d}`} initial={false} animate={{ opacity: e.dimAt !== undefined && now >= e.dimAt ? .15 : 1 }}>
            <motion.path d={e.d} className={`as-line ${toneAt(e.tone, e.tones, now)}`} initial={{ pathLength: reduce || e.at === 0 ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeInOut' }} />
            {toneAt(e.tone, e.tones, now) === 'threat' && !(e.dimAt !== undefined && now >= e.dimAt) && <path d={e.d} className="as-flow" />}
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
                <text className={`as-label ${tone}`} textAnchor={lp === 'right' ? 'start' : lp === 'left' ? 'end' : 'middle'}
                  x={lp === 'right' ? n.x + 34 : lp === 'left' ? n.x - 34 : n.x} y={lp === 'right' || lp === 'left' ? n.y + 4 : lp === 'above' ? n.y - 32 : n.y + 42}>{n.label}</text>
              )}
            </motion.g>
          );
        })}
        {scene.marks.map(([x, y], i) => i <= now && (
          <motion.g key={`${cycle}-m${i}`} className={`as-mark ${scene.steps[i].tone} ${i === now ? 'current' : ''}`}
            initial={reduce ? false : { opacity: 0, scale: .4 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${x}px ${y}px` }}>
            <circle cx={x} cy={y} r={i === now ? 11 : 9} />
            <text x={x} y={y + 3.5} textAnchor="middle">{i + 1}</text>
          </motion.g>
        ))}
      </svg>
      <motion.p key={`${cycle}-${now}`} className={`as-status ${caption.tone}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <b className="as-step-num">{now + 1}/{last + 1}</b>{caption.text}
      </motion.p>
    </div>
  );
}
