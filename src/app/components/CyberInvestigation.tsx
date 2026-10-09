'use client';

import Image from 'next/image';
import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { CYBER_ATTACKS } from '@/lib/cyber-attacks';
import { OPENFIRE_REPLAY_PROVENANCE, OPENFIRE_SOURCE_ASSESSMENT, OPENFIRE_TOOL_CALLS } from '@/lib/cyber-replay';
import { CyberAttackDemo } from './CyberAttackDemo';
import styles from './CyberInvestigation.module.css';

const VISUAL = CYBER_VISUALS.openfire;
const SCOPE_CALL = OPENFIRE_TOOL_CALLS.find((call) => call.id === 'scope')!;
const SOURCE_CALL = OPENFIRE_TOOL_CALLS.find((call) => call.id === 'favicon')!;
const ROUTE_CALLS = OPENFIRE_TOOL_CALLS.filter((call) => call.id === 'registration' || call.id === 'endpoint');
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

export function CyberInvestigation({ step, playing, progress = 0, onInteract }: {
  step: number;
  playing: boolean;
  progress?: number;
  onInteract?: () => void;
}) {
  const snippet = step >= 2 && step <= 4 ? VISUAL.code[step - 2] : null;
  const calls = step === 0 ? [SCOPE_CALL] : snippet ? [SOURCE_CALL] : ROUTE_CALLS;
  const reasoning = snippet ? OPENFIRE_SOURCE_ASSESSMENT.text : calls[0].rationale;
  const files = SCOPE_CALL.output.split('\n');
  const rows: { number?: number | string; text: string; highlight: boolean; path?: string }[] = step === 0
    ? files.map((path, index) => ({ number: String(index + 1).padStart(2, '0'), text: path.split('/').at(-1)!, highlight: false, path }))
    : snippet ? snippet.lines : ROUTE_CALLS[1].output.split('\n').map((text) => ({ text, highlight: /<servlet-name>|<url-pattern>/.test(text) }));
  const focusRows = rows.flatMap((row, index) => step === 0 || row.highlight ? [index] : []);
  const activeRow = focusRows[Math.min(Math.floor(Math.max(0, progress) * focusRows.length), focusRows.length - 1)];

  if (step === 1) return (
    <div className={styles.diagramStage}>
      <CyberAttackDemo attack={CYBER_ATTACKS.openfire} scenarioId="openfire" step={2} playing={playing} progress={progress} onInteract={onInteract} />
      <p className={styles.threatNote}>The supplied host controls the server’s request. Internal access depends on deployment.</p>
    </div>
  );

  return (
    <div className={styles.stage}>
      <section className={styles.reasoning} aria-label="Recorded agent reasoning">
        <header><h4>{snippet ? 'Agent assessment' : 'Agent reasoning'}</h4></header>
        <blockquote>{reasoning}</blockquote>
      </section>
      <div className={styles.editor}>
        <header className={styles.toolBar}>
          <h4>{step === 0 ? 'Scanning repositories' : snippet ? 'Inspecting source code' : 'Checking the endpoint'}</h4>
        </header>
        <div className={styles.fileBar}>
          <code>{step === 0 ? 'Openfire / Java files' : snippet ? 'FaviconServlet.java' : 'WEB-INF/web.xml'}</code>
          <span className={styles.fileBadge}>{snippet ? ['Untrusted input', 'URL construction', 'HTTP request'][step - 2] : 'shell_tool'}</span>
        </div>
        <div className={styles.commands}>
          {calls.map((call) => <code key={call.id}><span aria-hidden="true">$ </span>{SHORT_COMMANDS[call.id]}</code>)}
        </div>
        <div className={styles.codeFrame} onFocusCapture={onInteract} onPointerDown={onInteract} onWheel={(event) => { if (event.deltaX || event.shiftKey) onInteract?.(); }}>
          <pre className={`${styles.source} ${step === 0 ? styles.fileList : step === 5 ? styles.routeOutput : ''}`} tabIndex={0} aria-label={step === 0 ? 'Files returned by recorded search, paths shortened' : snippet ? `${snippet.title}, exact source excerpt` : 'Recorded servlet mapping output excerpt'}>
            {rows.map((row, index) => (
              <span key={row.number ?? index} className={`${row.highlight || index === activeRow ? styles.highlight : ''} ${index === activeRow ? styles.activeLine : ''}`}>
                {row.number !== undefined && <span className={styles.lineNumber}>{row.number}</span>}
                <code title={row.path}>
                  {snippet ? <HighlightedCode text={row.text || ' '} /> : row.text}
                  {index === activeRow && <Image className={styles.agentCursor} src="/cyber/agent-cursor.svg" alt="" aria-hidden="true" width={183} height={127} style={{ left: `${Math.max(0, row.text.search(/\S/))}ch` }} loading="eager" />}
                </code>
              </span>
            ))}
          </pre>
        </div>
        <details className={styles.transcript}>
          <summary>Exact recorded {calls.length === 1 ? 'command and output' : 'commands and outputs'}</summary>
          <p>{snippet ? `Lines ${snippet.lines[0].number}–${snippet.lines.at(-1)!.number}. The assessment above was recorded after this file read.` : step === 0 ? `${files.length} files located; paths shortened in the editor above.` : 'Servlet mapping output.'}</p>
          <p>Final checkpoint · training step {OPENFIRE_REPLAY_PROVENANCE.policyStep}. Selected calls from {OPENFIRE_REPLAY_PROVENANCE.totalToolCalls} recorded tools. The cursor and highlights illustrate the review; source highlights show three details of the same file read.</p>
          {calls.map((call) => <div key={call.id}><p>Call {call.ordinal} · {call.tool} · exit {call.exitCode}</p><blockquote>{call.rationale}</blockquote><pre tabIndex={0} aria-label={`Exact command for call ${call.ordinal}`}><code>{call.command}</code></pre><pre tabIndex={0} aria-label={`Recorded output excerpt for call ${call.ordinal}`}><code>{call.output}</code></pre></div>)}
        </details>
      </div>
    </div>
  );
}
