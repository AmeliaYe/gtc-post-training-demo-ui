'use client';

import { useEffect, useRef, useState } from 'react';
import AttackScene, { SCENES } from './AttackScene';
import CtiMap from './CtiMap';
import NvidiaLogo from './NvidiaLogo';
import PartnerLogo from './PartnerLogo';
import './DreamTheme.css';
import { AnimatePresence, MotionConfig, animate, motion, useReducedMotion } from 'framer-motion';
import { CheckIcon, ChevronDownIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Researcher-approved examples 01, 05, 06 and 10 from Dream's "Nemotron MiST Before and After":
// questions, excerpts and full responses are verbatim from the evaluation logs (run 1);
// `why` is the researchers' one-line explanation from the same page. `bench` is that benchmark's
// score for the original Nemotron 3.5 Super vs MiST, mean of 3 runs. Cases without a benchmark,
// MITRE ID or recorded runs (e.g. Posture) simply omit those fields.
type Answer = { answer: string; quote: string; runs?: string };
type Category = {
  id: string; label: string; prompt: string; key?: string;
  bench?: { name: string; plain: string; before: number; after: number };
  before: Answer; after: Answer;
  full?: { before: string; after: string };
  why?: { base: string; ours: string };
};

const CATEGORIES: Category[] = [
  {
    id: 'cti', label: 'Threat Intelligence',
    bench: { name: 'ATT&CK technique extraction', plain: 'Identifying the attack technique', before: 43.9, after: 77.8 },
    prompt: 'An attacker with access to a host’s Docker API sent a remote build request containing a Dockerfile that pulled a vanilla alpine base image and then fetched a malware binary from their C2 to bake into the image. The build completed locally on the host, avoiding alerts tied to downloading malicious images. The adversary then used the resulting custom image to deploy a container for follow-on activity.',
    why: { base: "Base describes the build correctly, then labels the final step (deploying a container).", ours: "Ours sees that the evasion happens at build time, which is exactly T1612." },
    key: 'T1612',
    before: { answer: 'T1610 · Deploy Container', runs: 'T1610 · T1610 · T1610', quote: 'This represents the use of the container build process to create and deploy malicious resources within the container environment.' },
    after: { answer: 'T1612 · Build Image on Host', runs: 'T1612 · T1612 · T1612', quote: 'The key behavior here is the creation of a custom container image on the host using a trusted base image, which is then used to deploy a container for further malicious activity. […] building an image on the host to bypass image scanning and registry monitoring controls.' },
    full: { before: "The attacker used the Docker API to initiate a local image build from a malicious Dockerfile, embedding a fetched binary into a custom image to evade detection associated with pulling pre-built malicious images. This represents the use of the container build process to create and deploy malicious resources within the container environment.\nAnswer: T1610", after: "The attacker leveraged the Docker API to initiate a build process on the host, using a legitimate base image (Alpine) and injecting malicious content during the build phase by downloading a payload from a command-and-control server. This method avoids triggering detection mechanisms that monitor for the download of malicious container images from external registries, as the malicious code is not pulled from a remote image repository but instead baked into the image during the build process. The key behavior here is the creation of a custom container image on the host using a trusted base image, which is then used to deploy a container for further malicious activity. This aligns with the tactic of Defense Evasion, specifically the technique of building an image on the host to bypass image scanning and registry monitoring controls.\nAnswer: T1612" },
  },
  {
    id: 'triage', label: 'Alert Triage',
    bench: { name: 'ATT&CK technique extraction', plain: 'Identifying the attack technique', before: 43.9, after: 77.8 },
    prompt: 'An attacker emailed a victim a malicious ISO file hosted on a public file-share, which was saved with a MOTW tag. The victim mounted the ISO and executed the contained EXE, which lacked the MOTW because the disk image did not preserve NTFS alternate data streams. This allowed the payload to run without SmartScreen or Protected View restrictions.',
    why: { base: "Base labels the victim's click instead of the trick.", ours: "Ours explains why the payload escapes SmartScreen (the ISO drops the MOTW stream) and maps it to Subvert Trust Controls, the parent of the MOTW-bypass sub-technique." },
    key: 'T1553',
    before: { answer: 'T1204 · User Execution', runs: 'T1204 · T1204 · T1204', quote: 'This is categorized as a user execution method that evades defenses designed to flag or block downloaded executables.' },
    after: { answer: 'T1553 · Subvert Trust Controls', runs: 'T1553 · T1553 · T1553', quote: 'the contained executable does not inherit the MOTW because the ISO format does not preserve NTFS alternate data streams (ADS), where MOTW is stored. As a result, the payload bypasses protections like SmartScreen and Protected View' },
    full: { before: "The described technique involves abusing the handling of files within mounted disk images to bypass Mark of the Web (MOTW) security restrictions. This is categorized as a user execution method that evades defenses designed to flag or block downloaded executables.\nAnswer: T1204", after: "The scenario describes an attacker delivering a malicious ISO file that is tagged with the Mark-of-the-Web (MOTW) attribute, which is a security mechanism in Windows designed to flag files downloaded from the internet. However, when the ISO is mounted, the contained executable does not inherit the MOTW because the ISO format does not preserve NTFS alternate data streams (ADS), where MOTW is stored. As a result, the payload bypasses protections like SmartScreen and Protected View, which rely on the presence of MOTW to restrict execution.\nThis behavior aligns with a technique where adversaries exploit the absence or failure of trust indicators—specifically, the MOTW—to evade detection and execution restrictions. The core of the attack is not the delivery method (e.g., phishing), nor the execution of a file, but rather the manipulation of file metadata to circumvent built-in security controls. The attacker leverages the fact that certain file formats (like ISOs) do not carry over MOTW, allowing malicious content to run without triggering warnings.\nThis is a classic example of subverting trust mechanisms by exploiting how file metadata is handled across different formats. The technique involves bypassing security controls that depend on file origin indicators, which is precisely what \"Subvert Trust Controls\" describes—specifically, the use of file formats that do not preserve trust attributes like MOTW to evade detection.\nAnswer: T1553" },
  },
  {
    id: 'mitigation', label: 'Mitigation',
    bench: { name: 'risk mitigation strategy', plain: 'Choosing the right defense', before: 22.9, after: 55.7 },
    prompt: 'An adversary rented time on a large botnet and instructed compromised hosts worldwide to flood a target web service with UDP packets. The sustained high-volume traffic saturated the service’s upstream bandwidth, preventing legitimate clients from reaching the site.',
    why: { base: "Base has the right idea but every ID is wrong: T1499 is Endpoint DoS, and M1032 is MFA (Network Intrusion Prevention is M1031).", ours: "Ours gives the correct control with its correct ID and name." },
    key: 'M1037',
    before: { answer: 'M1032 · Multi-factor Authentication', runs: 'M1032 · M1042 · M1025', quote: 'This activity corresponds to the MITRE ATT&CK technique Network Denial of Service (T1499). Among the available mitigations for this technique, Network Intrusion Prevention (M1032) is the most appropriate' },
    after: { answer: 'M1037 · Filter Network Traffic', runs: 'M1037 · M1037 · M1037', quote: 'The most effective defense is to control and filter incoming traffic at the network perimeter—specifically, by implementing ingress traffic filtering to block or rate-limit suspicious or excessive UDP traffic from untrusted sources. This aligns directly with the purpose of M1037: Filter Network Traffic' },
    full: { before: "The scenario describes a Distributed Denial of Service (DDoS) attack where an adversary utilizes a botnet to flood a target web service with traffic, saturating upstream bandwidth and preventing legitimate access. This activity corresponds to the MITRE ATT&CK technique **Network Denial of Service (T1499)**. Among the available mitigations for this technique, **Network Intrusion Prevention (M1032)** is the most appropriate as it involves deploying systems capable of detecting and mitigating volumetric traffic floods and DDoS attacks at the network perimeter.\nAnswer: M1032", after: "The scenario describes a distributed denial-of-service (DDoS) attack using UDP flood traffic from a botnet, overwhelming the target’s network bandwidth. The core issue is the inability to filter or absorb malicious traffic at the network layer before it reaches the service. The most effective defense is to control and filter incoming traffic at the network perimeter—specifically, by implementing ingress traffic filtering to block or rate-limit suspicious or excessive UDP traffic from untrusted sources. This aligns directly with the purpose of M1037: Filter Network Traffic, which includes ingress filtering to prevent unauthorized or malicious traffic from entering the network.\nAnswer: M1037" },
  },
  {
    id: 'vuln', label: 'Vulnerability Analysis',
    bench: { name: 'root-cause mapping', plain: 'Finding the root cause', before: 61.3, after: 73.7 },
    prompt: 'Open5GS MME versions <= 2.6.4 contain an assertion that can be remotely triggered via a malformed ASN.1 packet over the S1AP interface. An attacker may send an `Initial UE Message` message missing a required `PLMN Identity` field to repeatedly crash the MME, resulting in denial of service.',
    why: { base: "Base falls back to the catch-all CWE-20, which is true but uninformative.", ours: "Ours names the precise weakness: a debug-time assertion that remote traffic can reach." },
    key: 'CWE-617',
    before: { answer: 'CWE-20 · Improper Input Validation', runs: 'CWE-20 · CWE-20 · CWE-20', quote: 'The absence of this expected field triggers an assertion failure, which causes the service to crash. This is a classic case of insufficient input validation' },
    after: { answer: 'CWE-617 · Reachable Assertion', runs: 'CWE-617 · CWE-617 · CWE-617', quote: 'The key indicator here is the use of an `assert()` statement—commonly used during development to catch internal logic errors—that is reachable through attacker-controlled input. […] The root cause is not a failure to validate input per se, but rather the improper use of assertions in a context where they can be triggered by untrusted input.' },
    full: { before: "The vulnerability arises from the MME's failure to validate that a required `PLMN Identity` field is present in the `Initial UE Message` before processing it. The absence of this expected field triggers an assertion failure, which causes the service to crash. This is a classic case of insufficient input validation, where the software assumes the input conforms to the expected protocol structure without explicitly checking for the presence of mandatory elements.\nAnswer: CWE-20", after: "The vulnerability in Open5GS MME versions ≤ 2.6.4 arises from an assertion statement that is triggered by a malformed ASN.1 packet sent over the S1AP interface. Specifically, an attacker can craft an `Initial UE Message` that omits the required `PLMN Identity` field, which causes the assertion to fail and the MME process to crash. This results in a denial of service, as the service becomes unavailable to legitimate users.\nThe key indicator here is the use of an `assert()` statement—commonly used during development to catch internal logic errors—that is reachable through attacker-controlled input. Assertions are intended to fail only under conditions that should never occur in production, but when they are triggered by external input, they can be exploited to crash the application. In this case, the assertion is not properly isolated from user input, and the failure leads to a complete process crash, which is a direct consequence of the assertion being reachable via a remote attacker.\nThis behavior aligns precisely with the definition of a reachable assertion: a defensive check (assertion) that can be triggered by an attacker, leading to unintended application termination. The fact that the crash occurs in response to a malformed network packet—specifically one missing a required field—confirms that the assertion is not protected by proper input validation and is directly exposed to external input. The consequence is a denial of service, which matches the common impact of this weakness.\nFurthermore, the presence of multiple historical CVEs involving assertion failures in network services (e.g., FTP servers, LDAP, web proxies) that result in crashes due to crafted inputs reinforces that this is a well-documented pattern of misuse of assertions in production code. The root cause is not a failure to validate input per se, but rather the improper use of assertions in a context where they can be triggered by untrusted input.\nThus, the most appropriate classification is a reachable assertion, where the assertion is not only present but can be triggered remotely, leading to a denial of service.\nAnswer: CWE-617" },
  },
  {
    id: 'posture', label: 'Network Connectivity',
    prompt: 'Which devices can communicate directly with device dbs-310 without going through a router or firewall?',
    before: { answer: 'No direct peers', quote: 'No device can communicate directly with dbs-310 without going through a router or firewall' },
    after: { answer: 'Same-VLAN devices · 10.40.12.0/24', quote: "Devices in the same VLAN segment as dbs-310 (VLAN \"vlan_name2\", subnet 10.40.12.0/24) can communicate with it directly without going through a router or firewall. Here are those devices: \u2026" },
    // Device names and addresses are masked mock values.
    full: { before: "No device can communicate directly with dbs-310 without going through a router or firewall", after: "Devices in the same VLAN segment as dbs-310 (VLAN \"vlan_name2\", subnet 10.40.12.0/24) can communicate with it directly without going through a router or firewall. Here are those devices:\n\n| Device name | Type |\n|---|---|\n| wks-431 | ENDPOINT |\n| dbs-254 | SERVER |\n| dbs-504 | SERVER |\n| wks-766 | ENDPOINT |\n| nb-149 | ENDPOINT |\n| nb-174 | ENDPOINT |\n| dbs-648 | SERVER |\n| dbs-196 | SERVER |\n| mail-474 | ENDPOINT |\n| nb-696 | ENDPOINT |\n| mail-159 | ENDPOINT |\n| wks-619 | ENDPOINT |\n| dbs-319 | SERVER |\n| mail-138 | ENDPOINT |\n| mail-188 | ENDPOINT |\n| nb-544 | ENDPOINT |\n| nb-528 | ENDPOINT |\n| mail-171 | ENDPOINT |\n| nb-346 | ENDPOINT |\n| 10.40.12.43 | ENDPOINT |\n| dbs-664 | SERVER |\n| app-534 | ENDPOINT |\n| nb-160 | ENDPOINT |\n| nb-679 | ENDPOINT |\n| nb-226 | ENDPOINT |\n| wks-328 | ENDPOINT |\n| app-745 | ENDPOINT |\n| nb-742 | ENDPOINT |\n| nb-163 | ENDPOINT |\n| wks-690 | ENDPOINT |\n| app-699 | ENDPOINT |\n| nb-506 | ENDPOINT |" },
  },
];

// Source badge for the answer IDs: MITRE ATT&CK techniques/mitigations, or MITRE CWE weaknesses.
function MitreBadge({ id }: { id: string }) {
  return id.startsWith('CWE-')
    ? <span className="mitre-badge">MITRE CWE</span>
    : <span className="mitre-badge" title="MITRE ATT&CK®">MITRE ATT&amp;CK</span>;
}

// Splits a response into text and Markdown-table blocks (runs of lines starting with '|').
const toBlocks = (text: string) => text.split('\n').reduce<string[]>((blocks, line) => {
  const last = blocks.length - 1;
  if (last >= 0 && line.startsWith('|') === blocks[last].startsWith('|')) blocks[last] += '\n' + line;
  else blocks.push(line);
  return blocks;
}, []);

// Renders a simple Markdown table (header row, separator, body rows) from a model response.
function MarkdownTable({ md }: { md: string }) {
  const [head, , ...rows] = md.trim().split('\n').map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  return (
    <table className="cyber-full-table">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

// Both panels share one open state, so either button expands/collapses both responses.
function FullResponse({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="cyber-full">
      <button className="cyber-full-toggle" aria-expanded={open} onClick={onToggle}>
        <ChevronDownIcon style={{ transform: open ? 'rotate(180deg)' : undefined }} />{open ? 'Hide full response' : 'Full response'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .3, ease: [.22, 1, .36, 1] }} style={{ overflow: 'hidden' }}>
            <div className="cyber-full-text">
              {toBlocks(text).map((block, b) => (block.startsWith('|')
                ? <MarkdownTable key={b} md={block} />
                : <span key={b}>{block.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}</span>))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Verdict shown above each answer: correct / wrong, plus how many of the 3 benchmark runs got it right.
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Verdict({ ok, runs, answerKey }: { ok: boolean; runs?: string; answerKey?: string }) {
  const correct = runs && answerKey ? runs.split(' · ').filter((id) => id === answerKey).length : undefined;
  return (
    <span className={`cyber-verdict ${ok ? 'ok' : 'bad'}`}>
      {ok ? 'Correct answer' : 'Partial answer'}
      {correct !== undefined && <small>{correct}/3 runs</small>}
    </span>
  );
}

function TypedText({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, text.length, { duration: text.length / 110, ease: 'linear', onUpdate: (v) => setCount(Math.round(v)) });
    return () => controls.stop();
  }, [text, reduce]);
  const shown = reduce ? text.length : count;
  return (
    <p>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, shown)}{shown < text.length && <i className="cyber-caret" />}</span>
    </p>
  );
}

function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, to, {
      duration: 1.6, delay: .3, ease: [.22, 1, .36, 1],
      onUpdate: (v) => { if (ref.current) ref.current.textContent = v.toFixed(decimals) + suffix; },
    });
    return () => controls.stop();
  }, [to, decimals, suffix, reduce]);
  return <span ref={ref}>{to.toFixed(decimals)}{suffix}</span>;
}

function BeforeAfter() {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const [fullOpen, setFullOpen] = useState(false);
  const toggleFull = () => setFullOpen(!fullOpen);
  const active = CATEGORIES.find((c) => c.id === activeId)!;
  return (
    <>
      <div className="cyber-chips" role="tablist" aria-label="Case category">
        {CATEGORIES.map((c) => (
          <button key={c.id} role="tab" aria-selected={c.id === activeId} className={c.id === activeId ? 'active' : ''} onClick={() => { setActiveId(c.id); setFullOpen(false); }}>
            {c.id === activeId && <motion.span layoutId="cyber-chip" className="cyber-chip-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={active.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
          <div className="dream-scenario">
            <div className="dream-question">
              <span className="prompt-label">CASE <span className="prompt-label-note">(original prompt)</span></span>
              <p>{active.prompt}</p>
            </div>
            <AttackScene scene={SCENES[active.id]} />
          </div>
          <div className="comparison-grid">
            <section className="output-panel">
              <header>
                <span className="model-mark bad"><XMarkIcon /></span>
                <span><small><b className="dream-phase">BEFORE TRAINING</b> · ORIGINAL</small><strong>Nemotron 3.5 Super</strong></span>
              </header>
              <div className="response-copy">
                <div className="answer-head"><Verdict ok={false} runs={active.before.runs} answerKey={active.key} />{active.key && <MitreBadge id={active.key} />}</div>
                <div className="cyber-answer-row"><strong className="cyber-answer miss">{active.before.answer}</strong></div>
                <p>“{active.before.quote}”</p>
                {active.why && <div className="cyber-why-note bad"><b>Why it’s inaccurate</b>{cap(active.why.base.replace(/^Base /, ''))}</div>}
                {active.full && active.full.before !== active.before.quote && <FullResponse text={active.full.before} open={fullOpen} onToggle={toggleFull} />}
              </div>
            </section>
            <div className="comparison-divider"><span>vs.</span></div>
            <section className="output-panel tuned cyber-scan">
              <header>
                <span className="model-mark ok"><CheckIcon /></span>
                <span><small><b className="dream-phase">AFTER TRAINING</b></small><strong>CLM (Cyber Language Model), powered by MiST &amp; Dreamer</strong></span>
              </header>
              <div className="response-copy">
                <div className="answer-head"><Verdict ok runs={active.after.runs} answerKey={active.key} />{active.key && <MitreBadge id={active.key} />}</div>
                <div className="cyber-answer-row"><motion.strong className="cyber-answer" initial={{ opacity: 0, scale: .92, filter: 'blur(4px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ delay: .25, duration: .4 }}>{active.after.answer}</motion.strong></div>
                <TypedText text={`“${active.after.quote}”`} />
                {active.why && <div className="cyber-why-note ok"><b>Why CLM gets it right</b>{cap(active.why.ours.replace(/^Ours /, ''))}</div>}
                {active.full && <FullResponse text={active.full.after} open={fullOpen} onToggle={toggleFull} />}
              </div>
            </section>
          </div>
          <StatsStrip bench={active.bench} />
        </motion.div>
      </AnimatePresence>
    </>
  );
}


// Dreamer agent runtime, ported from Dream's "Dreamer Continuous Post-Training" page.
type Path = 'core' | 'live' | 'train';
const EDGES: { d: string; kind: Path; both?: boolean }[] = [
  { d: 'M206,100 L312,100', kind: 'train', both: true },
  { d: 'M60,142 L60,180', kind: 'train' },
  { d: 'M206,218 L328,218', kind: 'train' },
  { d: 'M502,140 L502,188', kind: 'core' },
  { d: 'M674,92 L740,92 L740,64 L790,64', kind: 'live' },
  { d: 'M674,120 L740,120 L740,238 L790,238', kind: 'train' },
  { d: 'M280,367 L340,367', kind: 'train' },
  { d: 'M507,342 L507,250', kind: 'train' },
];
const EDGE_LABELS: [number, number, string, Path, ('middle' | 'start')?][] = [
  [259, 90, 'tasks', 'train', 'middle'], [259, 116, 'answers', 'train', 'middle'], [78, 165, 'scores', 'train'],
  [259, 204, 'better model', 'train', 'middle'], [522, 168, 'thinks with', 'core'],
  [740, 53, 'real data', 'live', 'middle'], [525, 300, 'security knowledge', 'train'], [740, 256, 'practice data', 'train', 'middle'],
];
const MODES = [
  { id: 'live', label: 'Live request' },
  { id: 'train', label: 'Training loop' },
] as const;
// One dot walks these hops in order; `edges` are the EDGES indexes lit while it travels.
// `at`: where the step's number badge sits on the drawing.
const SEQUENCES: Record<'live' | 'train', { d: string; edges: number[]; at: [number, number]; caption: string; lands?: boolean }[]> = {
  live: [
    { d: 'M502,140 L502,188', edges: [3], at: [502, 164], caption: 'An analyst asks a question; the agent (CLM powered by MiST & Dreamer) thinks with NVIDIA Nemotron.' },
    { d: 'M674,92 L740,92 L740,64 L790,64', edges: [4], at: [740, 78], caption: 'It reads the client’s real data, which never leaves the network.' },
  ],
  train: [
    { d: 'M280,367 L340,367', edges: [6], at: [310, 367], caption: 'Stage 1: expert security documents are turned into lessons.' },
    { d: 'M507,342 L507,250', edges: [7], at: [507, 296], caption: 'Nemotron studies them and gains deep security knowledge.', lands: true },
    { d: 'M206,100 L312,100', edges: [0], at: [226, 100], caption: 'Stage 2: Dream’s training gym, built on NVIDIA NeMo Gym, gives the real agent a practice task.' },
    { d: 'M502,140 L502,188', edges: [3], at: [502, 164], caption: 'The agent works on it, thinking with Nemotron.' },
    { d: 'M674,120 L740,120 L740,238 L790,238', edges: [5], at: [740, 180], caption: 'It practices on a synthetic network built for training, never derived from customer data.' },
    { d: 'M312,100 L206,100', edges: [0], at: [290, 100], caption: 'Its answer goes back to the gym and is scored.' },
    { d: 'M60,142 L60,180', edges: [1], at: [60, 161], caption: 'NVIDIA NeMo RL learns from the scores.' },
    { d: 'M206,218 L328,218', edges: [2], at: [267, 218], caption: 'An improved Nemotron goes back to work.', lands: true },
  ],
};

function Box({ x, y, w, h, kind, mode, hero, children }: { x: number; y: number; w: number; h: number; kind: Path; mode: Path; hero?: boolean; children: React.ReactNode }) {
  const on = kind === 'core' || kind === mode;
  return (
    <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: on ? 1 : .32, y: 0 }} transition={{ duration: .4 }}>
      <rect className={`rt-box ${kind} ${on ? 'on' : ''} ${hero ? 'hero' : ''}`} x={x} y={y} width={w} height={h} rx="8" />
      {children}
    </motion.g>
  );
}

function RuntimeDiagram() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<'live' | 'train'>('train');
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const dot = useRef<SVGGElement>(null);
  const track = useRef<SVGPathElement>(null);
  const seq = SEQUENCES[mode];
  useEffect(() => {
    const path = track.current;
    if (reduce || !path) return;
    const controls = animate(0, path.getTotalLength(), {
      duration: Math.max(.9, path.getTotalLength() / 140), delay: 1.4, ease: 'easeInOut',
      onUpdate: (v) => {
        const { x, y } = path.getPointAtLength(v);
        dot.current?.setAttribute('transform', `translate(${x} ${y})`);
      },
      onComplete: () => {
        if (step < seq.length - 1) return setStep(step + 1);
        setStep(0);
        if (auto) setMode((m) => (m === 'live' ? 'train' : 'live'));
      },
    });
    return () => controls.stop();
  }, [step, mode, auto, reduce, seq.length]);
  const isOn = (kind: Path) => kind === 'core' || kind === mode;

  return (
    <div className="cyber-run cyber-runtime">
      <div className="cyber-run-head">
        <div className="cyber-chips rt-modes" role="tablist" aria-label="Data path">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} className={`${m.id} ${mode === m.id ? 'active' : ''}`} onClick={() => { setAuto(false); setMode(m.id); setStep(0); }}>
              {mode === m.id && <motion.span layoutId="cyber-mode" className="cyber-chip-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rt-scroll">
      <svg className={`rt-diagram mode-${mode}`} viewBox="0 0 1000 410" role="img" aria-label="Stage 1, cyber knowledge: SFT on NVIDIA NeMo AutoModel turns an expert-vetted security corpus into a security-specialized Nemotron checkpoint. Stage 2, agentic RL: Dreamer Gym, built on NVIDIA NeMo Gym, sends rollouts through the unchanged production Dreamer agent (an orchestrator plus posture, CTI and detection deep agents) which infers on NVIDIA Nemotron served via vLLM. In production the agents read production storage over MCP; in training the same agents read a synthetic digital twin. NVIDIA NeMo RL trains on the trajectories and writes new weights back into Nemotron.">
        <defs>
          {(['core', 'live', 'train'] as const).map((k) => (
            <marker key={k} id={`rt-ah-${k}`} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto-start-reverse"><path className={`rt-ah ${k}`} d="M0,0 L9,4.5 L0,9 Z" /></marker>
          ))}
        </defs>

        {EDGES.map((e, i) => (
          <g key={e.d} className={!isOn(e.kind) ? 'off' : !reduce && seq[step].edges.includes(i) ? 'active' : 'on'}>
            <path className={`rt-edge ${e.kind}`} d={e.d} markerEnd={`url(#rt-ah-${e.kind})`} markerStart={e.both ? `url(#rt-ah-${e.kind})` : undefined} />
          </g>
        ))}
        {EDGE_LABELS.map(([x, y, text, kind, anchor]) => (
          <text key={text} className={`rt-edge-label ${isOn(kind) ? '' : 'off'}`} x={x} y={y} textAnchor={anchor}>{text}</text>
        ))}

        <motion.rect className="rt-group train" x="16" y="30" width="190" height="270" rx="12" initial={false} animate={{ opacity: mode === 'train' ? 1 : .3 }} />
        <NvidiaLogo className="rt-nv-mark" x="30" y="273" width="17" height="17" /><text className="rt-nv" x="50" y="286">NVIDIA</text>
        <text className="rt-kicker train" x="30" y="56">2 · PRACTICE</text>
        <Box x={30} y={72} w={162} h={70} kind="train" mode={mode} hero>
          <text className="rt-main" x="111" y="103" textAnchor="middle">Training gym</text>
          <text className="rt-sub" x="111" y="121" textAnchor="middle">built on NVIDIA NeMo Gym</text>
        </Box>
        <Box x={30} y={180} w={162} h={70} kind="train" mode={mode}>
          <text className="rt-main" x="111" y="211" textAnchor="middle">Feedback loop</text>
          <text className="rt-sub" x="111" y="229" textAnchor="middle">NVIDIA NeMo RL</text>
        </Box>

        <rect className="rt-group core" x="316" y="18" width="374" height="270" rx="12" />
        <text className="rt-kicker" x="330" y="36">DREAM AGENT</text>
        <Box x={330} y={78} w={344} h={62} kind="core" mode={mode}>
          <text className="rt-main" x="502" y="105" textAnchor="middle">Dream AI agents</text>
          <text className="rt-sub" x="502" y="123" textAnchor="middle">answer security questions</text>
        </Box>
        <Box x={330} y={188} w={344} h={60} kind="core" mode={mode} hero>
          <NvidiaLogo className="rt-nv-mark" x="342" y="204" width="26" height="26" />
          <text className="rt-main" x="518" y="212" textAnchor="middle">NVIDIA Nemotron</text>
          <text className="rt-sub" x="518" y="232" textAnchor="middle">the model behind every answer</text>
        </Box>
        {/* Weights land on Nemotron: flash when the training loop is on. */}
        {seq[step].lands && !reduce && <rect className="rt-flash" x="330" y="188" width="344" height="60" rx="8" />}

        <Box x={790} y={34} w={194} h={70} kind="live" mode={mode}>
          <text className="rt-kicker live" x="806" y="56">LIVE</text>
          <text className="rt-main" x="887" y="78" textAnchor="middle">Client network data</text>
          <text className="rt-sub" x="887" y="94" textAnchor="middle">never leaves the network</text>
        </Box>
        <Box x={790} y={212} w={194} h={60} kind="train" mode={mode}>
          <text className="rt-kicker train" x="806" y="234">TRAINING</text>
          <text className="rt-main" x="887" y="252" textAnchor="middle">Practice network</text>
          <text className="rt-sub" x="887" y="266" textAnchor="middle">synthetic, never from customer data</text>
        </Box>

        <motion.rect className="rt-group train" x="16" y="314" width="674" height="88" rx="12" initial={false} animate={{ opacity: mode === 'train' ? 1 : .3 }} />
        <NvidiaLogo className="rt-nv-mark" x="30" y="320" width="17" height="17" /><text className="rt-nv" x="50" y="333">NVIDIA</text>
        <text className="rt-kicker train" x="676" y="333" textAnchor="end">1 · LEARN</text>
        <Box x={30} y={342} w={250} h={50} kind="train" mode={mode}>
          <text className="rt-main" x="155" y="363" textAnchor="middle">Expert security library</text>
          <text className="rt-sub" x="155" y="380" textAnchor="middle">turned into lessons</text>
        </Box>
        <Box x={340} y={342} w={334} h={50} kind="train" mode={mode} hero>
          <text className="rt-main" x="507" y="363" textAnchor="middle">Security knowledge training</text>
          <text className="rt-sub" x="507" y="380" textAnchor="middle">NVIDIA NeMo AutoModel</text>
        </Box>

        {seq.map((st, i) => (!reduce && i > step ? null : (
          <g key={`${mode}-n${i}`} className={`rt-step ${mode} ${i === step ? 'current' : ''}`}>
            <circle cx={st.at[0]} cy={st.at[1]} r={i === step ? 12 : 10} />
            <text x={st.at[0]} y={st.at[1] + 4} textAnchor="middle">{i + 1}</text>
          </g>
        )))}
        {!reduce && <>
          <path ref={track} d={seq[step].d} fill="none" stroke="none" />
          <g ref={dot} transform="translate(-50 -50)"><circle r="9" className={`rt-halo ${mode}`} /><circle r="4.5" className={`rt-dot ${mode}`} /></g>
        </>}
      </svg>
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={`${mode}-${step}`} className={`rt-note ${mode}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .2 }}>
          <b className="rt-step-num">{step + 1}</b><span className="rt-step-of">of {seq.length}</span>{seq[step].caption}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// From Dream's "Mid-Training NVIDIA Nemotron 3.5 Super for Cybersecurity" post.
const MODEL_SPECS: [string, string | string[]][] = [
  ['Model', 'CLM powered by MiST & Dreamer: Dream’s security model, trained on NVIDIA Nemotron 3.5 Super (120B hybrid Mamba-Transformer MoE, 12B active per token)'],
  ['What it does', 'Answers general cybersecurity questions and questions about the customer’s own network: assets, exposure and fixes'],
  ['Training', ['Cyber knowledge: SFT on an expert security corpus (MiST, EMNLP 2026)', 'Agentic RL (GRPO) through the unchanged production agent, on a synthetic digital twin; re-released every two weeks']],
  ['NVIDIA stack', 'NeMo AutoModel, NeMo RL and NeMo Gym on NVIDIA DGX'],
  ['Deployment', 'On-prem and air-gapped: customer data never leaves the network'],
];
const MODEL_SCORES = [
  { name: 'CLM powered by MiST & Dreamer', security: 74.1, general: 92.4, ours: true },
  { name: 'Nemotron 3.5 Super (original)', security: 65.4, general: 91.8 },
  { name: 'Qwen3.5-122B-A10B', security: 64.5, general: 93.9 },
  { name: 'Nemotron-3-Super-120B', security: 64.4, general: 86.7 },
  { name: 'gpt-oss-120b', security: 63.3, general: 89.7 },
];

function ModelCard() {
  return (
    <div className="cyber-run cyber-card">
      <div className="cyber-card-head">
        <span className="expanded-icon"><SparklesIcon /></span>
        <div><small>MODEL INFO · DREAM</small><strong>CLM powered by MiST &amp; Dreamer</strong></div>
      </div>
      <div className="cyber-card-grid">
        <dl className="cyber-specs">
          {MODEL_SPECS.map(([k, v], i) => (
            <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .05 + i * .06 }}>
              <dt>{k}</dt><dd>{Array.isArray(v) ? <ol className="cyber-spec-steps">{v.map((x) => <li key={x}>{x}</li>)}</ol> : v}</dd>
            </motion.div>
          ))}
        </dl>
        <div className="cyber-scores">
          <small>SECURITY · 15 BENCHMARKS <span>GENERAL · 4</span></small>
          {MODEL_SCORES.map((m, i) => (
            <div key={m.name} className={`cyber-score ${m.ours ? 'ours' : ''}`}>
              <span>{m.name}</span>
              <div className="score-track"><motion.span className={`score-fill ${m.ours ? '' : 'muted'}`} initial={{ width: 0 }} animate={{ width: `${((m.security - 55) / 25) * 100}%` }} transition={{ duration: 1.1, delay: .2 + i * .08, ease: [.22, 1, .36, 1] }} /></div>
              <strong>{m.ours ? <CountUp to={m.security} decimals={1} /> : m.security.toFixed(1)}</strong>
              <em>{m.general.toFixed(1)}</em>
            </div>
          ))}
          <p>Mean of 3 runs. Improves on all 15 security benchmarks, leads every 120B-class open model tested on 12. Scores measure stage 1 (cyber knowledge).</p>
          <small className="cyber-scores-stage2">STAGE 2 · AGENTIC RL · ONE TRAINING RUN</small>
          <dl className="cyber-rl">
            <div><dt>0.70 → <b>0.75</b></dt><dd>validation score on held-out questions</dd></div>
            <div><dt><b>−22%</b></dt><dd>shorter answers</dd></div>
            <div><dt>4.8% → <b>1.0%</b></dt><dd>answers cut off</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}

// Scores out of 100, original Nemotron 3.5 Super vs MiST (mean of 3 runs), from Dream's MiST post.
function StatsStrip({ bench }: { bench?: Category['bench'] }) {
  const stats: { label: string; note: string; before: number; after: number; delta?: number }[] = [
    ...(bench ? [{ label: bench.plain, note: `this kind of case · ${bench.name}`, ...bench }] : []),
    // The post states +8.8, computed before rounding; 74.1 − 65.4 would show 8.7.
    { label: 'Overall security knowledge', note: 'average across 15 security tests', before: 65.4, after: 74.1, delta: 8.8 },
    { label: 'General skills', note: 'general knowledge and following instructions: kept intact', before: 91.8, after: 92.4 },
  ];
  return (
    <div className="cyber-stats" style={{ '--cols': stats.length } as React.CSSProperties}>
      {stats.map((st, i) => (
        <motion.div key={st.label} className="cyber-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 + i * .08 }}>
          <small>{st.label}</small>
          <strong><span className="cyber-from">{st.before.toFixed(1)} → </span><CountUp to={st.after} decimals={1} /><em className="cyber-delta">+{(st.delta ?? st.after - st.before).toFixed(1)}</em></strong>
          <div className="score-bars">
            <div className="score-track"><span className="score-fill muted" style={{ width: `${st.before}%` }} /></div>
            <div className="score-track"><motion.span className="score-fill" initial={{ width: `${st.before}%` }} animate={{ width: `${st.after}%` }} transition={{ duration: 1.3, delay: .4, ease: [.22, 1, .36, 1] }} /></div>
          </div>
          <em>{st.note}</em>
        </motion.div>
      ))}
    </div>
  );
}

const TABS = [
  { id: 'compare', label: 'Before / After' },
  { id: 'map', label: 'Threat Intelligence Map' },
  { id: 'how', label: 'How we train' },
  { id: 'card', label: 'Model Info' },
] as const;

function HowWeTrain() {
  return (
    <>
      <p className="hw-first"><b>First agentic RL training on NVIDIA Nemotron Super</b> · built on NVIDIA NeMo RL and NeMo Gym</p>
      <RuntimeDiagram />
    </>
  );
}

type CyberTab = (typeof TABS)[number]['id'];

function CyberTabs({ tab, onChange }: { tab: CyberTab; onChange: (tab: CyberTab) => void }) {
  return (
    <div className="cyber-tabs" role="tablist" aria-label="Dream cybersecurity demo">
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => onChange(t.id)}>
          {tab === t.id && <motion.span layoutId="cyber-tab" className="cyber-tab-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span><b className="cyber-tab-num">{TABS.indexOf(t) + 1}</b>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// Content-only integration: main owns the existing National Defense tile, title,
// icon, color and expanded-card chrome.
export default function DreamDemoContent() {
  const [tab, setTab] = useState<CyberTab>('compare');
  return (
    <MotionConfig reducedMotion="user">
      <div className="dream-theme">
        <div className="dream-content-brand">
          <PartnerLogo className="partner-logo" />
          <p className="dream-tagline">Cyber language built into the model, on hardware your nation owns</p>
        </div>
        <div className="cyber-tabs-row"><CyberTabs tab={tab} onChange={setTab} /></div>
        <div className="cyber-demo">
          <AnimatePresence mode="wait">
            <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: .25 }}>
              {tab === 'compare' ? <BeforeAfter /> : tab === 'how' ? <HowWeTrain /> : tab === 'map' ? <CtiMap /> : <ModelCard />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
