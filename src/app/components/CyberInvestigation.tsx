'use client';

import {
  ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon,
  CodeBracketIcon, DocumentTextIcon, FolderIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { CYBER_SCENARIOS } from '@/lib/cyber-fixture';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { CYBER_ATTACKS } from '@/lib/cyber-attacks';
import { OPENFIRE_REPLAY_PROVENANCE, OPENFIRE_TOOL_CALLS } from '@/lib/cyber-replay';
import { CyberAttackDemo } from './CyberAttackDemo';
import styles from './CyberInvestigation.module.css';

const SCENARIO = CYBER_SCENARIOS.find((scenario) => scenario.id === 'openfire')!;
const VISUAL = CYBER_VISUALS.openfire;
const SCOPE_CALL = OPENFIRE_TOOL_CALLS.find((call) => call.id === 'scope')!;
const SOURCE_CALL = OPENFIRE_TOOL_CALLS.find((call) => call.id === 'favicon')!;
const ROUTE_CALLS = OPENFIRE_TOOL_CALLS.filter((call) => call.id === 'registration' || call.id === 'endpoint');
const TRACE_LABELS = ['Source: user input', 'Propagation: build URL', 'Sink: send request'];
const SHORT_COMMANDS: Record<string, string> = {
  scope: 'find … -type f -name "*.java" | grep -E … | head -20',
  favicon: 'cat …/FaviconServlet.java',
  registration: 'grep -rn "FaviconServlet" --include="*.xml" …',
  endpoint: "sed -n '110,160p' …/web.xml",
};

export function CyberInvestigation({ step, playing }: { step: number; playing: boolean }) {
  const snippet = step >= 2 && step <= 4 ? VISUAL.code[step - 2] : null;
  const calls = step === 0 ? [SCOPE_CALL] : snippet ? [SOURCE_CALL] : step === 5 ? ROUTE_CALLS : [];
  const referenceReports = SCENARIO.after.findings.reduce((count, finding) => count + (finding.referenceMatch === 'matched' ? finding.count : 0), 0);

  return (
    <div className={styles.investigation}>
      <div className={styles.toolBar}>
        <span><CodeBracketIcon />{calls.length ? 'shell_tool' : step === 1 ? 'Map trust boundary' : 'Check recorded findings'}</span>
        {calls.length > 0 && <span className={styles.callIdentity}>{calls.length > 1 ? `Calls ${calls.map((call) => call.ordinal).join(' → ')}` : `Call ${calls[0].ordinal}`} of {OPENFIRE_REPLAY_PROVENANCE.totalToolCalls}{snippet && ' · same source read'}</span>}
        <span className={styles.provenance}>{calls.length ? 'Recorded activity' : step === 1 ? 'Source-based illustration' : 'Recorded evaluation'}</span>
      </div>
      {calls.map((call) => <div className={styles.command} key={call.id}><span aria-hidden="true">$</span><code>{SHORT_COMMANDS[call.id]}</code><small>abbreviated</small></div>)}
      {step === 0 && <div className={styles.fileOutput}>
        <div className={styles.repo}><FolderIcon />Openfire<span>{SCOPE_CALL.output.split('\n').length} Java files located</span></div>
        <ul className={styles.fileTree} aria-label="Files returned by recorded search, paths shortened">
          {SCOPE_CALL.output.split('\n').map((path) => <li key={path} className={path.endsWith('/FaviconServlet.java') ? styles.focusFile : ''}>
            <DocumentTextIcon /><code title={path}>{path.split('/').at(-1)}</code>
          </li>)}
        </ul>
      </div>}
      {step === 1 && <div className={styles.threatOutput}>
        <CyberAttackDemo attack={CYBER_ATTACKS.openfire} scenarioId="openfire" step={2} playing={playing} />
        <p className={styles.threatNote}>Attacker-controlled host → server-side HTTP request. Internal access depends on deployment.</p>
      </div>}
      {snippet && <>
        <ol className={styles.trace} aria-label="Source to sink trace">
          {TRACE_LABELS.map((label, index) => <li key={label} aria-current={snippet.node === index ? 'step' : undefined}>
            <span>{label}</span>{index < TRACE_LABELS.length - 1 && <ArrowRightIcon aria-hidden="true" />}
          </li>)}
        </ol>
        <div className={styles.sourceHeader}>
          <code title={snippet.path}>FaviconServlet.java <span>· lines {snippet.lines[0].number}–{snippet.lines.at(-1)!.number}</span></code>
          <a href={snippet.url} target="_blank" rel="noopener noreferrer">View original<ArrowTopRightOnSquareIcon /></a>
        </div>
        <pre className={styles.source} tabIndex={0} aria-label={`${snippet.title}, exact source excerpt`}>
          {snippet.lines.map((line) => <span key={line.number} className={line.highlight ? styles.highlight : ''}><span className={styles.lineNumber}>{line.number}</span><code>{line.text || ' '}</code></span>)}
        </pre>
        <div className={styles.observation}><span>Observation</span><p>{snippet.explanation}</p></div>
      </>}
      {step === 5 && <>
        <div className={styles.sourceHeader}><code>web.xml <span>· servlet mapping</span></code><a href={ROUTE_CALLS[1].source} target="_blank" rel="noopener noreferrer">View original<ArrowTopRightOnSquareIcon /></a></div>
        <pre className={`${styles.source} ${styles.routeOutput}`} tabIndex={0} aria-label="Recorded servlet mapping output excerpt"><code>{ROUTE_CALLS[1].output}</code></pre>
        <div className={styles.observation}><span>Observation</span><p><code>/getFavicon</code> is mapped to <code>FaviconServlet</code>.</p></div>
      </>}
      {step === 6 && <div className={styles.verifier}>
        <div className={styles.reference}><ShieldCheckIcon /><span>Reference vulnerability: <strong>SSRF in Openfire</strong></span></div>
        <div className={styles.verifierResults}>
          <div className={styles.matched}>
            <span>Final checkpoint</span>
            <strong>{SCENARIO.after.matchedCount}<small> / {SCENARIO.after.referenceTotal}</small></strong>
            <p>Known flaw matched</p>
          </div>
        </div>
        <div className={styles.reportSummary}>
          <strong>{SCENARIO.after.findingsCount} final reports</strong>
          <span className={styles.matchCount}><CheckIcon />{referenceReports} known match</span>
          <span><DocumentTextIcon />{SCENARIO.after.findingsCount - referenceReports} other reports</span>
        </div>
      </div>}
      {calls.length > 0 && <details className={styles.transcript}>
        <summary>Exact recorded {calls.length === 1 ? 'command and output' : 'commands and outputs'}</summary>
        <p>Final checkpoint · training step {OPENFIRE_REPLAY_PROVENANCE.policyStep}. Selected calls from the recorded run; source highlights show three details of the same file read.</p>
        {calls.map((call) => <div key={call.id}><p>Call {call.ordinal} · {call.tool} · exit {call.exitCode}</p><pre tabIndex={0} aria-label={`Exact command for call ${call.ordinal}`}><code>{call.command}</code></pre><pre tabIndex={0} aria-label={`Recorded output excerpt for call ${call.ordinal}`}><code>{call.output}</code></pre></div>)}
      </details>}
    </div>
  );
}
