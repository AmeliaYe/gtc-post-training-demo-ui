'use client';

import {
  ArrowRightIcon, ArrowTopRightOnSquareIcon, CheckIcon,
  CodeBracketIcon, DocumentTextIcon, FolderIcon,
} from '@heroicons/react/24/outline';
import { CYBER_SCENARIOS } from '@/lib/cyber-fixture';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { CYBER_ATTACKS } from '@/lib/cyber-attacks';
import { OPENFIRE_REPLAY_PROVENANCE, OPENFIRE_SOURCE_ASSESSMENT, OPENFIRE_TOOL_CALLS } from '@/lib/cyber-replay';
import { CyberAttackDemo } from './CyberAttackDemo';
import styles from './CyberInvestigation.module.css';

const SCENARIO = CYBER_SCENARIOS.find((scenario) => scenario.id === 'openfire')!;
const VISUAL = CYBER_VISUALS.openfire;
const SCOPE_CALL = OPENFIRE_TOOL_CALLS.find((call) => call.id === 'scope')!;
const SOURCE_CALL = OPENFIRE_TOOL_CALLS.find((call) => call.id === 'favicon')!;
const ROUTE_CALLS = OPENFIRE_TOOL_CALLS.filter((call) => call.id === 'registration' || call.id === 'endpoint');
const REPORTS = SCENARIO.after.findings.flatMap((finding) => Array.from({ length: finding.count }, () => finding));
const TRACE_LABELS = ['User input', 'Build URL', 'Send request'];
const SHORT_COMMANDS: Record<string, string> = {
  scope: 'find … -type f -name "*.java" | grep -E … | head -20',
  favicon: 'cat …/FaviconServlet.java',
  registration: 'grep -rn "FaviconServlet" --include="*.xml" …',
  endpoint: "sed -n '110,160p' …/web.xml",
};

function HighlightedCode({ text }: { text: string }) {
  const tokens = text.split(/("(?:\\.|[^"\\])*"|\/\/.*$|\b(?:public|final|byte|if|try|return|new|null|class|void)\b|\b\d+\b|\b[A-Z][A-Za-z0-9_]*\b|\b[a-zA-Z_]\w*(?=\())/g);
  return tokens.map((token, index) => {
    const color = token.startsWith('//') ? styles.comment : token.startsWith('"') ? styles.string : /^(public|final|byte|if|try|return|new|null|class|void)$/.test(token) ? styles.keyword : /^\d+$/.test(token) ? styles.number : /^[A-Z][A-Za-z0-9_]*$/.test(token) ? styles.type : /^[a-zA-Z_]\w*$/.test(token) ? styles.function : undefined;
    return <span key={index} className={color}>{token}</span>;
  });
}

export function CyberInvestigation({ step, playing }: { step: number; playing: boolean }) {
  const snippet = step >= 2 && step <= 4 ? VISUAL.code[step - 2] : null;
  const calls = step === 0 ? [SCOPE_CALL] : snippet ? [SOURCE_CALL] : step === 5 ? ROUTE_CALLS : [];
  const reasoning = snippet ? OPENFIRE_SOURCE_ASSESSMENT.text : calls[0]?.rationale;

  return (
    <div className={styles.stage}>
      {reasoning && <section className={styles.reasoning} aria-label="Recorded agent reasoning">
        <header><h4>Agent reasoning</h4><span>{snippet ? 'Recorded excerpt · after reading the file' : 'Recorded excerpt · before the tool call'}</span></header>
        <blockquote>{reasoning}</blockquote>
      </section>}
      <div className={`${styles.investigation} ${step === 1 ? styles.diagramPanel : ''}`}>
        <div className={styles.toolBar}>
          <h4>{step === 0 ? 'Scanning the repository' : snippet ? 'Reading source code' : step === 5 ? 'Checking the servlet mapping' : step === 1 ? 'Following the request' : 'Reviewing submitted findings'}</h4>
          <span className={styles.provenance}>{calls.length ? 'Recorded tool output' : step === 1 ? 'Illustrated from source' : 'Recorded evaluation'}</span>
        </div>
        {calls.map((call) => <div className={styles.command} key={call.id}><CodeBracketIcon /><code>{SHORT_COMMANDS[call.id]}</code><small>abbreviated</small></div>)}
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
          <p className={styles.threatNote}>The supplied host controls the server’s request. Internal access depends on deployment.</p>
        </div>}
        {snippet && <>
          <ol className={styles.trace} aria-label="Source to sink trace">
            {TRACE_LABELS.map((label, index) => <li key={label} aria-current={snippet.node === index ? 'step' : undefined}>
              <span><b>{index + 1}</b>{label}</span>{index < TRACE_LABELS.length - 1 && <ArrowRightIcon aria-hidden="true" />}
            </li>)}
          </ol>
          <div className={styles.sourceHeader}>
            <code title={snippet.path}>FaviconServlet.java <span>· lines {snippet.lines[0].number}–{snippet.lines.at(-1)!.number}</span></code>
            <a href={snippet.url} target="_blank" rel="noopener noreferrer">View original<ArrowTopRightOnSquareIcon /></a>
          </div>
          <pre className={styles.source} tabIndex={0} aria-label={`${snippet.title}, exact source excerpt`}>
            {snippet.lines.map((line) => <span key={line.number} className={line.highlight ? styles.highlight : ''}><span className={styles.lineNumber}>{line.number}</span><code><HighlightedCode text={line.text || ' '} /></code></span>)}
          </pre>
        </>}
        {step === 5 && <>
          <div className={styles.sourceHeader}><code>web.xml <span>· servlet mapping</span></code><a href={ROUTE_CALLS[1].source} target="_blank" rel="noopener noreferrer">View original<ArrowTopRightOnSquareIcon /></a></div>
          <pre className={`${styles.source} ${styles.routeOutput}`} tabIndex={0} aria-label="Recorded servlet mapping output excerpt"><code>{ROUTE_CALLS[1].output}</code></pre>
        </>}
        {step === 6 && <div className={styles.verifier}>
          <div className={styles.findingsSummary}><span>{SCENARIO.after.findingsCount} reports from the final checkpoint</span><strong><CheckIcon />{SCENARIO.after.matchedCount} reference match</strong></div>
          <ul className={styles.findings} aria-label="Recorded submitted findings">
            {REPORTS.map((finding, index) => <li key={`${finding.title}-${index}`}>
              <span className={finding.referenceMatch === 'matched' ? styles.matchedIcon : styles.reportIcon}>{finding.referenceMatch === 'matched' ? <CheckIcon /> : <DocumentTextIcon />}</span>
              <div><strong>{finding.title}</strong><span>{finding.path?.split('/').at(-1) || `Report ${index + 1} · XML review`}</span></div>
              <span className={finding.referenceMatch === 'matched' ? styles.matchBadge : styles.otherBadge}>{finding.referenceMatch === 'matched' ? 'Reference matched' : 'Other report'}</span>
            </li>)}
          </ul>
          <p className={styles.verifierNote}>{SCENARIO.after.matchedCount} of {SCENARIO.after.referenceTotal} reference vulnerabilities matched. The other reports are not confirmed false positives.</p>
        </div>}
        {calls.length > 0 && <details className={styles.transcript}>
          <summary>Exact recorded {calls.length === 1 ? 'command and output' : 'commands and outputs'}</summary>
          <p>Final checkpoint · training step {OPENFIRE_REPLAY_PROVENANCE.policyStep}. Selected calls from {OPENFIRE_REPLAY_PROVENANCE.totalToolCalls} recorded tools; source highlights show three details of the same file read.</p>
          {calls.map((call) => <div key={call.id}><p>Call {call.ordinal} · {call.tool} · exit {call.exitCode}</p><blockquote>{call.rationale}</blockquote><pre tabIndex={0} aria-label={`Exact command for call ${call.ordinal}`}><code>{call.command}</code></pre><pre tabIndex={0} aria-label={`Recorded output excerpt for call ${call.ordinal}`}><code>{call.output}</code></pre></div>)}
        </details>}
      </div>
    </div>
  );
}
