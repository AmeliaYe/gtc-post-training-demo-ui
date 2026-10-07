'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import AttackScene, { SCENES } from './AttackScene';
import NvidiaLogo from './NvidiaLogo';
import PartnerLogo from './PartnerLogo';
import './DreamDemo.css';
import { AnimatePresence, MotionConfig, animate, motion, useReducedMotion } from 'framer-motion';
import { ArrowPathIcon, CheckIcon, ChevronDownIcon, CircleStackIcon, DocumentMagnifyingGlassIcon, LockClosedIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Dream × NVIDIA, Posture agent validation run (Nemotron 3.5 Super VL 120B-A12B preview).
const VALIDATION = [0.6935, 0.7047, 0.7069, 0.7047, 0.7293, 0.7338, 0.7315, 0.7383, 0.7293, 0.7562, 0.7360, 0.7606];
const STEPS = ['Ingest', 'Post-train', 'Validate', 'Release'];
// Fraction of the run at which each step starts; the chart draws during Post-train.
const STEP_AT = [0, .1, .85, .95];
const RUN_SECONDS = 10;

// Researcher-approved examples 01, 05, 06 and 10 from Dream's "Nemotron MiST Before and After":
// questions, excerpts and full responses are verbatim from the evaluation logs (run 1);
// `why` is the researchers' one-line explanation from the same page. `bench` is that benchmark's
// score for the original Nemotron 3.5 Super vs MiST, mean of 3 runs. Cases without a benchmark,
// MITRE ID or recorded runs (e.g. Posture) simply omit those fields.
type Answer = { answer: string; quote: string; runs?: string };
type Category = {
  id: string; label: string; prompt: string; key?: string; tags?: string;
  bench?: { name: string; plain: string; before: number; after: number };
  before: Answer; after: Answer;
  full?: { before: string; after: string };
  why?: { base: string; ours: string };
};

const CATEGORIES: Category[] = [
  {
    id: 'cti', label: 'CTI',
    bench: { name: 'ATT&CK technique extraction', plain: 'Identifying the attack technique', before: 43.9, after: 77.8 },
    prompt: 'An attacker with access to a host’s Docker API sent a remote build request containing a Dockerfile that pulled a vanilla alpine base image and then fetched a malware binary from their C2 to bake into the image. The build completed locally on the host, avoiding alerts tied to downloading malicious images. The adversary then used the resulting custom image to deploy a container for follow-on activity.',
    why: { base: "Base describes the build correctly, then labels the final step (deploying a container).", ours: "Ours sees that the evasion happens at build time, which is exactly T1612." },
    key: 'T1612',
    before: { answer: 'T1610 · Deploy Container', runs: 'T1610 · T1610 · T1610', quote: 'This represents the use of the container build process to create and deploy malicious resources within the container environment.' },
    after: { answer: 'T1612 · Build Image on Host', runs: 'T1612 · T1612 · T1612', quote: 'The key behavior here is the creation of a custom container image on the host using a trusted base image, which is then used to deploy a container for further malicious activity. […] building an image on the host to bypass image scanning and registry monitoring controls.' },
    full: { before: "The attacker used the Docker API to initiate a local image build from a malicious Dockerfile, embedding a fetched binary into a custom image to evade detection associated with pulling pre-built malicious images. This represents the use of the container build process to create and deploy malicious resources within the container environment.\nAnswer: T1610", after: "The attacker leveraged the Docker API to initiate a build process on the host, using a legitimate base image (Alpine) and injecting malicious content during the build phase by downloading a payload from a command-and-control server. This method avoids triggering detection mechanisms that monitor for the download of malicious container images from external registries, as the malicious code is not pulled from a remote image repository but instead baked into the image during the build process. The key behavior here is the creation of a custom container image on the host using a trusted base image, which is then used to deploy a container for further malicious activity. This aligns with the tactic of Defense Evasion, specifically the technique of building an image on the host to bypass image scanning and registry monitoring controls.\nAnswer: T1612" },
  },
  {
    id: 'triage', label: 'Triage',
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
    id: 'vuln', label: 'Vulnerability',
    bench: { name: 'root-cause mapping', plain: 'Finding the root cause', before: 61.3, after: 73.7 },
    prompt: 'Open5GS MME versions <= 2.6.4 contain an assertion that can be remotely triggered via a malformed ASN.1 packet over the S1AP interface. An attacker may send an `Initial UE Message` message missing a required `PLMN Identity` field to repeatedly crash the MME, resulting in denial of service.',
    why: { base: "Base falls back to the catch-all CWE-20, which is true but uninformative.", ours: "Ours names the precise weakness: a debug-time assertion that remote traffic can reach." },
    key: 'CWE-617',
    before: { answer: 'CWE-20 · Improper Input Validation', runs: 'CWE-20 · CWE-20 · CWE-20', quote: 'The absence of this expected field triggers an assertion failure, which causes the service to crash. This is a classic case of insufficient input validation' },
    after: { answer: 'CWE-617 · Reachable Assertion', runs: 'CWE-617 · CWE-617 · CWE-617', quote: 'The key indicator here is the use of an `assert()` statement—commonly used during development to catch internal logic errors—that is reachable through attacker-controlled input. […] The root cause is not a failure to validate input per se, but rather the improper use of assertions in a context where they can be triggered by untrusted input.' },
    full: { before: "The vulnerability arises from the MME's failure to validate that a required `PLMN Identity` field is present in the `Initial UE Message` before processing it. The absence of this expected field triggers an assertion failure, which causes the service to crash. This is a classic case of insufficient input validation, where the software assumes the input conforms to the expected protocol structure without explicitly checking for the presence of mandatory elements.\nAnswer: CWE-20", after: "The vulnerability in Open5GS MME versions ≤ 2.6.4 arises from an assertion statement that is triggered by a malformed ASN.1 packet sent over the S1AP interface. Specifically, an attacker can craft an `Initial UE Message` that omits the required `PLMN Identity` field, which causes the assertion to fail and the MME process to crash. This results in a denial of service, as the service becomes unavailable to legitimate users.\nThe key indicator here is the use of an `assert()` statement—commonly used during development to catch internal logic errors—that is reachable through attacker-controlled input. Assertions are intended to fail only under conditions that should never occur in production, but when they are triggered by external input, they can be exploited to crash the application. In this case, the assertion is not properly isolated from user input, and the failure leads to a complete process crash, which is a direct consequence of the assertion being reachable via a remote attacker.\nThis behavior aligns precisely with the definition of a reachable assertion: a defensive check (assertion) that can be triggered by an attacker, leading to unintended application termination. The fact that the crash occurs in response to a malformed network packet—specifically one missing a required field—confirms that the assertion is not protected by proper input validation and is directly exposed to external input. The consequence is a denial of service, which matches the common impact of this weakness.\nFurthermore, the presence of multiple historical CVEs involving assertion failures in network services (e.g., FTP servers, LDAP, web proxies) that result in crashes due to crafted inputs reinforces that this is a well-documented pattern of misuse of assertions in production code. The root cause is not a failure to validate input per se, but rather the improper use of assertions in a context where they can be triggered by untrusted input.\nThus, the most appropriate classification is a reachable assertion, where the assertion is not only present but can be triggered remotely, leading to a denial of service.\nAnswer: CWE-617" },
  },
  {
    id: 'posture', label: 'Posture', tags: 'Posture · Discovery · Risk',
    prompt: 'Which devices can communicate directly with device db-67 without going through a router or firewall?',
    before: { answer: 'No direct peers', quote: 'No device can communicate directly with db-67 without going through a router or firewall' },
    after: { answer: 'Same-VLAN devices · 192.168.162.0/24', quote: 'Devices in the same VLAN segment as db-67 (VLAN "vlan_name2", subnet 192.168.162.0/24) can communicate with it directly without going through a router or firewall. Here are those devices: ...' },
  },
];

// Source badge for the answer IDs: MITRE ATT&CK techniques/mitigations, or MITRE CWE weaknesses.
function MitreBadge({ id }: { id: string }) {
  return id.startsWith('CWE-')
    ? <span className="mitre-badge">MITRE CWE</span>
    : <span className="mitre-badge" title="MITRE ATT&CK®"><Image src="/mitre-attack-logo.png" alt="MITRE ATT&CK" width={104} height={11} /></span>;
}

// Both panels share one open state, so either button expands/collapses both responses.
function FullResponse({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="cyber-full">
      <button className="cyber-full-toggle" aria-expanded={open} onClick={onToggle}>
        <ChevronDownIcon style={{ transform: open ? 'rotate(180deg)' : undefined }} />{open ? 'Hide full responses' : 'Full responses'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .3, ease: [.22, 1, .36, 1] }} style={{ overflow: 'hidden' }}>
            <div className="cyber-full-text">
              {text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Each benchmark question was answered 3 times per model; a run is correct when it matches the answer key.
function Runs({ runs, answerKey }: { runs: string; answerKey: string }) {
  const correct = runs.split(' · ').filter((id) => id === answerKey).length;
  return (
    <footer>
      <span className="cyber-runs" aria-label={`${correct} of 3 runs correct`}>
        {[0, 1, 2].map((i) => (
          <motion.i key={i} className={i < correct ? 'hit' : ''} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .5 + i * .15, type: 'spring', stiffness: 500, damping: 18 }} />
        ))}
        {correct}/3 runs correct
      </span>
      <span className="cyber-runs-ids">{runs}</span>
    </footer>
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
              <span className="prompt-label">CASE (ORIGINAL PROMPT)</span>
              <p>{active.prompt}</p>
              <span className="prompt-tag">{active.key ? `answer key · ${active.key}` : active.tags}</span>
            </div>
            <AttackScene scene={SCENES[active.id]} />
          </div>
          <div className="comparison-grid">
            <section className="output-panel">
              <header>
                <span className="model-mark"><CircleStackIcon /></span>
                <span><small><b className="dream-phase">BEFORE TRAINING</b> · ORIGINAL</small><strong>Nemotron 3.5 Super</strong></span>
              </header>
              <div className="response-copy">
                <span className="assistant-label">ANSWER</span>
                <div className="cyber-answer-row"><strong className="cyber-answer miss">{active.before.answer}</strong>{active.key && <MitreBadge id={active.key} />}</div>
                <p>“{active.before.quote}”</p>
                {active.full && <FullResponse text={active.full.before} open={fullOpen} onToggle={toggleFull} />}
              </div>
              {active.before.runs && active.key && <Runs runs={active.before.runs} answerKey={active.key} />}
            </section>
            <div className="comparison-divider"><span>VS</span></div>
            <section className="output-panel tuned cyber-scan">
              <header>
                <span className="model-mark"><SparklesIcon /></span>
                <span><small><b className="dream-phase">AFTER TRAINING</b> · MIST MID-TRAINED</small><strong>Nemotron-3.5-Super-MiST <em className="dream-trained-by">· Trained by Dream</em></strong></span>
                <span className="dream-claim"><CheckIcon />100% accuracy in tactic and technique identification</span>
              </header>
              <div className="response-copy">
                <span className="assistant-label">ANSWER</span>
                <div className="cyber-answer-row"><motion.strong className="cyber-answer" initial={{ opacity: 0, scale: .92, filter: 'blur(4px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ delay: .25, duration: .4 }}><CheckIcon />{active.after.answer}</motion.strong>{active.key && <MitreBadge id={active.key} />}</div>
                <TypedText text={`“${active.after.quote}”`} />
                {active.full && <FullResponse text={active.full.after} open={fullOpen} onToggle={toggleFull} />}
              </div>
              {active.after.runs && active.key && <Runs runs={active.after.runs} answerKey={active.key} />}
            </section>
          </div>
          {active.why && (
            <motion.div className="cyber-why" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .9, duration: .35 }}>
              <small>WHY MIST GETS IT RIGHT</small>
              <p><XMarkIcon /><span><b>Original</b> {active.why.base.replace(/^Base /, '')}</span></p>
              <p className="ours"><CheckIcon /><span><b>MiST</b> {active.why.ours.replace(/^Ours /, '')}</span></p>
            </motion.div>
          )}
          <StatsStrip bench={active.bench} />
        </motion.div>
      </AnimatePresence>
    </>
  );
}

const W = 640, H = 210, L = 40, R = 18, T = 14, B = 26;
const LOW = .65, HIGH = .8;
const px = (i: number) => L + (i * (W - L - R)) / (VALIDATION.length - 1);
const py = (v: number) => T + (1 - (v - LOW) / (HIGH - LOW)) * (H - T - B);

function TrainingRun() {
  const reduce = useReducedMotion();
  const [runId, setRunId] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, 1, { duration: RUN_SECONDS, ease: 'linear', onUpdate: setProgress });
    return () => controls.stop();
  }, [runId, reduce]);

  const p = reduce ? 1 : progress;
  const stepIndex = STEP_AT.findLastIndex((at) => p >= at);
  const done = p >= 1;
  // Chart position in checkpoint units: 0 → first point, 11 → last.
  const pos = Math.min(1, Math.max(0, (p - STEP_AT[1]) / (STEP_AT[2] - STEP_AT[1]))) * (VALIDATION.length - 1);
  const whole = Math.floor(pos);
  const headValue = whole >= VALIDATION.length - 1 ? VALIDATION[whole] : VALIDATION[whole] + (VALIDATION[whole + 1] - VALIDATION[whole]) * (pos - whole);
  const points = [...VALIDATION.slice(0, whole + 1).map((v, i) => [px(i), py(v)]), [px(pos), py(headValue)]];
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L ${px(pos).toFixed(1)} ${H - B} L ${L} ${H - B} Z`;
  const started = p > STEP_AT[1];

  return (
    <div className="cyber-run">
      <div className="cyber-run-head">
        <div>
          <small>VALIDATION SCORE · HELD-OUT POSTURE QUESTIONS</small>
          <strong>checkpoint {started ? whole + 1 : 0}/{VALIDATION.length} · <em>{started ? headValue.toFixed(4) : '—'}</em></strong>
        </div>
        <span className={`run-state ${done ? 'complete' : ''}`}><i className="status-dot" />{done ? 'RELEASED' : STEPS[stepIndex].toUpperCase()}</span>
        <button className="ghost-button" onClick={() => { setProgress(0); setRunId((id) => id + 1); }}><ArrowPathIcon /> Replay</button>
      </div>

      <svg className="cyber-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Validation score climbs from 0.69 to 0.76 over 12 checkpoints">
        <defs>
          <linearGradient id="cyber-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[.65, .7, .75, .8].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={py(t)} y2={py(t)} className={t === .7 ? 'cyber-baseline' : 'chart-grid'} />
            <text x={L - 8} y={py(t) + 3} textAnchor="end">{t.toFixed(2)}</text>
          </g>
        ))}
        <text x={L} y={H - 6}>start of run</text>
        <text x={W - R} y={H - 6} textAnchor="end">end of run</text>
        {started && <>
          <path d={area} fill="url(#cyber-area)" />
          <path d={line} className="cyber-line" />
          {VALIDATION.slice(0, whole + 1).map((v, i) => (
            <motion.circle key={`${runId}-${i}`} cx={px(i)} cy={py(v)} initial={{ r: 0 }} animate={{ r: 3 }} className="cyber-point" />
          ))}
          <circle cx={px(pos)} cy={py(headValue)} r="5" className="cyber-head" />
        </>}
        {pos >= VALIDATION.length - 1 && (
          <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <text x={px(VALIDATION.length - 1) - 8} y={py(.7606) - 12} textAnchor="end" className="cyber-peak">peak 0.76</text>
          </motion.g>
        )}
      </svg>

      <ol className="cyber-steps">
        {STEPS.map((step, i) => {
          const state = done || i < stepIndex ? 'complete' : i === stepIndex ? 'active' : '';
          return (
            <li key={step} className={state}>
              <span className="timeline-node">{state === 'complete' ? <CheckIcon /> : String(i + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Dreamer agent runtime, ported from Dream's "Dreamer Continuous Post-Training" page.
type Path = 'core' | 'live' | 'train';
const EDGES: { d: string; kind: Path; both?: boolean }[] = [
  { d: 'M206,100 L312,100', kind: 'train', both: true },
  { d: 'M60,142 L60,180', kind: 'train' },
  { d: 'M206,218 L328,218', kind: 'train' },
  { d: 'M384,140 L384,188', kind: 'core' },
  { d: 'M502,140 L502,188', kind: 'core' },
  { d: 'M620,140 L620,188', kind: 'core' },
  { d: 'M384,78 L384,56 L620,56 L620,78', kind: 'core' },
  { d: 'M502,56 L502,78', kind: 'core' },
  { d: 'M690,92 L740,92 L740,64 L790,64', kind: 'live' },
  { d: 'M690,120 L740,120 L740,238 L790,238', kind: 'train' },
  { d: 'M887,150 L887,104', kind: 'live' },
  { d: 'M887,290 L887,272', kind: 'train' },
  { d: 'M280,367 L340,367', kind: 'train' },
  { d: 'M507,342 L507,250', kind: 'train' },
];
const EDGE_LABELS: [number, number, string, Path, ('middle' | 'start')?][] = [
  [259, 90, 'rollouts', 'train', 'middle'], [259, 116, 'trajectories', 'train', 'middle'], [70, 165, 'scored rollouts', 'train'],
  [259, 209, 'weights', 'train', 'middle'], [392, 168, 'infer', 'core'], [392, 70, 'route', 'core'],
  [740, 53, 'production MCP', 'live', 'middle'], [515, 300, 'MiST checkpoint', 'train'], [740, 256, 'training MCP', 'train', 'middle'], [895, 132, 'populate', 'live'],
];
const MODES = [
  { id: 'live', label: 'Live request' },
  { id: 'train', label: 'Training loop' },
] as const;
// One dot walks these hops in order; `edges` are the EDGES indexes lit while it travels.
const SEQUENCES: Record<'live' | 'train', { d: string; edges: number[]; caption: string; lands?: boolean }[]> = {
  live: [
    { d: 'M887,150 L887,104', edges: [10], caption: 'Agentic data pipelines populate production storage: assets, findings, intel, alerts.' },
    { d: 'M384,78 L384,56 L620,56 L620,78', edges: [6], caption: 'An analyst question reaches the orchestrator, which routes it to the CTI · Detection agent.' },
    { d: 'M620,140 L620,188', edges: [5], caption: 'The agent infers on Nemotron, served via vLLM.' },
    { d: 'M690,92 L740,92 L740,64 L790,64', edges: [8], caption: 'Its tools read production storage over MCP, inside the client network.' },
  ],
  train: [
    { d: 'M280,367 L340,367', edges: [12], caption: 'Mid-training data: a compact, expert-vetted security corpus (CVE, CWE, ATT&CK, threat reports), rewritten into synthetic training data such as explainers, Q&A chains and paraphrases.' },
    { d: 'M507,342 L507,250', edges: [13], caption: 'MiST mid-training, then SFT, on NeMo AutoModel gives Nemotron deep security knowledge: the checkpoint the rest of the stack, including RL, starts from.', lands: true },
    { d: 'M206,100 L312,100', edges: [0], caption: 'RL: Dreamer Gym sends a rollout to the unchanged production agent, exactly as an analyst question would.' },
    { d: 'M384,78 L384,56 L502,56 L502,78', edges: [6, 7], caption: 'The orchestrator routes it to the Posture agent.' },
    { d: 'M502,140 L502,188', edges: [4], caption: 'The agent infers on the same Nemotron model.' },
    { d: 'M690,120 L740,120 L740,238 L790,238', edges: [9], caption: 'Only the data path differs: tools read the synthetic digital twin over the training MCP.' },
    { d: 'M312,100 L206,100', edges: [0], caption: 'The trajectory returns to Dreamer Gym and is scored.' },
    { d: 'M60,142 L60,180', edges: [1], caption: 'Scored rollouts go to nemo-rl for RL post-training.' },
    { d: 'M206,218 L328,218', edges: [2], caption: 'New weights return to the same Nemotron the agents infer on.', lands: true },
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
      duration: Math.max(.7, path.getTotalLength() / 170), delay: .35, ease: 'easeInOut',
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
      <svg className={`rt-diagram mode-${mode}`} viewBox="0 0 1000 410" role="img" aria-label="First, MiST mid-training on NeMo AutoModel turns an expert-vetted security corpus into a security-specialized Nemotron checkpoint. Then Dreamer Gym, an extension of NVIDIA nemo-gym, sends rollouts through the unchanged production Dreamer agent (orchestrator plus posture, CTI and detection agents) which infers on NVIDIA Nemotron served via vLLM. In production the agents read production storage over MCP; in training the same agents read a synthetic digital twin. nemo-rl trains on the trajectories and writes new weights back into Nemotron.">
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

        <motion.rect className="rt-group train" x="16" y="30" width="190" height="270" rx="12" animate={{ opacity: mode === 'train' ? 1 : .3 }} />
        <NvidiaLogo className="rt-nv-mark" x="30" y="273" width="17" height="17" /><text className="rt-nv" x="50" y="286">NVIDIA</text>
        <text className="rt-kicker train" x="30" y="56">2 · RL TRAINING</text>
        <Box x={30} y={72} w={162} h={70} kind="train" mode={mode} hero>
          <text className="rt-main" x="111" y="98" textAnchor="middle">Dreamer Gym</text>
          <text className="rt-sub" x="111" y="115" textAnchor="middle">extends nemo-gym</text>
          <text className="rt-sub" x="111" y="129" textAnchor="middle">drives the real agent</text>
        </Box>
        <Box x={30} y={180} w={162} h={70} kind="train" mode={mode}>
          <text className="rt-main" x="111" y="208" textAnchor="middle">nemo-rl</text>
          <text className="rt-sub" x="111" y="226" textAnchor="middle">RL post-training</text>
          <text className="rt-sub" x="111" y="240" textAnchor="middle">Megatron backend</text>
        </Box>

        <rect className="rt-group core" x="316" y="18" width="374" height="270" rx="12" />
        <text className="rt-kicker" x="330" y="36">PRODUCTION DREAMER AGENT, UNCHANGED</text>
        {[[330, 'Orchestrator'], [448, 'Posture'], [566, 'CTI · Detection']].map(([x, name]) => (
          <Box key={name} x={x as number} y={78} w={108} h={62} kind="core" mode={mode}>
            <text className="rt-kicker" x={(x as number) + 54} y="98" textAnchor="middle">DEEP AGENT</text>
            <text className="rt-main" x={(x as number) + 54} y="120" textAnchor="middle">{name}</text>
          </Box>
        ))}
        <Box x={330} y={188} w={344} h={60} kind="core" mode={mode} hero>
          <NvidiaLogo className="rt-nv-mark" x="342" y="204" width="26" height="26" />
          <text className="rt-main" x="518" y="212" textAnchor="middle">NEMOTRON 3.5 Super VL 120B-A12B</text>
          <text className="rt-sub" x="518" y="232" textAnchor="middle">fine-tuned per agent · served via vLLM</text>
        </Box>
        {/* Weights land on Nemotron: flash when the training loop is on. */}
        {seq[step].lands && !reduce && <rect className="rt-flash" x="330" y="188" width="344" height="60" rx="8" />}

        <Box x={790} y={34} w={194} h={70} kind="live" mode={mode}>
          <text className="rt-kicker live" x="806" y="56">LIVE</text>
          <text className="rt-main" x="887" y="78" textAnchor="middle">Production Storage</text>
          <text className="rt-sub" x="887" y="94" textAnchor="middle">client environments</text>
        </Box>
        <Box x={790} y={150} w={194} h={52} kind="live" mode={mode}>
          <text className="rt-main" x="887" y="172" textAnchor="middle">Agentic Data Pipelines</text>
          <text className="rt-sub" x="887" y="189" textAnchor="middle">assets · findings · intel · alerts</text>
        </Box>
        <Box x={790} y={212} w={194} h={60} kind="train" mode={mode}>
          <text className="rt-kicker train" x="806" y="234">TRAINING</text>
          <text className="rt-main" x="887" y="252" textAnchor="middle">Training Storage</text>
          <text className="rt-sub" x="887" y="266" textAnchor="middle">synthetic digital twin</text>
        </Box>
        <Box x={790} y={290} w={194} h={30} kind="train" mode={mode}>
          <text className="rt-sub" x="887" y="309" textAnchor="middle">generated, never from production</text>
        </Box>

        <motion.rect className="rt-group train" x="16" y="314" width="674" height="88" rx="12" animate={{ opacity: mode === 'train' ? 1 : .3 }} />
        <NvidiaLogo className="rt-nv-mark" x="30" y="320" width="17" height="17" /><text className="rt-nv" x="50" y="333">NVIDIA</text>
        <text className="rt-kicker train" x="676" y="333" textAnchor="end">1 · MID-TRAINING · MiST</text>
        <Box x={30} y={342} w={250} h={50} kind="train" mode={mode}>
          <text className="rt-main" x="155" y="363" textAnchor="middle">Security corpus</text>
          <text className="rt-sub" x="155" y="380" textAnchor="middle">expert-vetted seed + synthetic flows</text>
        </Box>
        <Box x={340} y={342} w={334} h={50} kind="train" mode={mode} hero>
          <text className="rt-main" x="507" y="363" textAnchor="middle">MiST mid-training</text>
          <text className="rt-sub" x="507" y="380" textAnchor="middle">NeMo AutoModel · mid-training + SFT</text>
        </Box>

        {!reduce && <>
          <path ref={track} d={seq[step].d} fill="none" stroke="none" />
          <g ref={dot} transform="translate(-50 -50)"><circle r="9" className={`rt-halo ${mode}`} /><circle r="4.5" className={`rt-dot ${mode}`} /></g>
        </>}
      </svg>
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={`${mode}-${step}`} className="rt-note" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .2 }}>
          <b>{String(step + 1).padStart(2, '0')}/{String(seq.length).padStart(2, '0')}</b>{seq[step].caption}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// From Dream's "Mid-Training NVIDIA Nemotron 3.5 Super for Cybersecurity" post.
const MODEL_SPECS = [
  ['Base model', 'NVIDIA Nemotron 3.5 Super · 120B hybrid Mamba-Transformer MoE · 12B active per token'],
  ['Method', 'MiST cybersecurity mid-training (arXiv:2609.18496, EMNLP 2026): a dedicated mid-training stage on a synthetic security corpus, then SFT with replayed general data'],
  ['Corpus', 'Expert-vetted seed (CVE records, CWE, MITRE ATT&CK, threat reports, defensive guidance) rewritten into synthetic training data, verifier-filtered, decontaminated'],
  ['Training', 'NeMo AutoModel · 2× DGX B200 (16 GPUs) · 28.5 h · 61–63K tokens/s'],
  ['Deployment', 'Open weights, on-prem and air-gapped. Starting point for task SFT, expert trajectories and RL with NeMo RL'],
];
const MODEL_SCORES = [
  { name: 'Nemotron-3.5-Super-MiST', security: 74.1, general: 92.4, ours: true },
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
        <div><small>MODEL CARD · DREAM</small><strong>Nemotron-3.5-Super-MiST</strong></div>
      </div>
      <div className="cyber-card-grid">
        <dl className="cyber-specs">
          {MODEL_SPECS.map(([k, v], i) => (
            <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .05 + i * .06 }}>
              <dt>{k}</dt><dd>{v}</dd>
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
          <p>Mean of 3 runs. Improves on all 15 security benchmarks, leads every 120B-class open model tested on 12. General: GSM8K, MMLU, ARC-Challenge, IFEval.</p>
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
    { label: 'General skills', note: 'math, reasoning, instructions: kept intact', before: 91.8, after: 92.4 },
  ];
  return (
    <div className="cyber-stats" style={{ '--cols': stats.length } as React.CSSProperties}>
      <small className="cyber-stats-label">SCORES OUT OF 100 · ORIGINAL NEMOTRON → AFTER MIST</small>
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
  { id: 'compare', label: 'Model comparison' },
  { id: 'how', label: 'How we train' },
  { id: 'run', label: 'Training run' },
  { id: 'card', label: 'Model card' },
] as const;

type CyberTab = (typeof TABS)[number]['id'];

// Gallery entry for Dream's standalone card; page.tsx adds it to the use-case list.
export const DREAM_DEMO = {
  kind: 'demo' as const, id: 'dream', name: 'Security Mid-Training', task: 'Cybersecurity · Dream',
  color: '#b7ff54', glow: 'rgba(183, 255, 84, .18)', icon: LockClosedIcon,
  embedUrl: '', // unused: DreamCard renders the expanded view itself
  previewLabel: 'Explore demo',
};

function CyberTabs({ tab, onChange }: { tab: CyberTab; onChange: (tab: CyberTab) => void }) {
  return (
    <div className="cyber-tabs" role="tablist" aria-label="Security Mid-Training demo">
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => onChange(t.id)}>
          {tab === t.id && <motion.span layoutId="cyber-tab" className="cyber-tab-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span>{t.id === 'card' && <DocumentMagnifyingGlassIcon />}{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// The whole expanded card: window bar, header with the NVIDIA × Dream lockup, tabs and tab content.
export default function DreamCard({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<CyberTab>('compare');
  return (
    <MotionConfig reducedMotion="user">
      <div className="expanded-window-bar">
        <span className="expanded-traffic"><i /><i /><i /></span>
        <button className="view-all-button" onClick={onBack}>← All use cases</button>
      </div>
      <div className="expanded-header dream-header">
        <div className="expanded-identity">
          <span className="expanded-icon"><LockClosedIcon /></span>
          <div><h2>{DREAM_DEMO.name}</h2></div>
        </div>
        <div className="dream-brand">
          <PartnerLogo className="partner-logo" />
          <p className="dream-tagline">Security knowledge built into the model, on hardware the nation owns</p>
        </div>
      </div>
      <div className="cyber-tabs-row"><CyberTabs tab={tab} onChange={setTab} /></div>
      <div className="cyber-demo">
        <AnimatePresence mode="wait">
          <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: .25 }}>
            {tab === 'compare' ? <BeforeAfter /> : tab === 'how' ? <RuntimeDiagram /> : tab === 'run' ? <TrainingRun /> : <ModelCard />}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
