'use client';

import { CYBER_VISUALS } from '@/lib/cyber-visuals';
import { CYBER_ATTACKS } from '@/lib/cyber-attacks';
import { OPENFIRE_SOURCE_ASSESSMENT, OPENFIRE_TOOL_CALLS } from '@/lib/cyber-replay';
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

export function CyberInvestigation({ step, progress = 0, playing = true, onInteract }: {
  step: number;
  progress?: number;
  playing?: boolean;
  onInteract?: () => void;
}) {
  const snippet = step >= 2 && step <= 4 ? VISUAL.code[step - 2] : null;
  const calls = step === 0 ? [SCOPE_CALL] : snippet ? [SOURCE_CALL] : ROUTE_CALLS;
  const reasoning = snippet ? OPENFIRE_SOURCE_ASSESSMENT.text : calls[0].rationale;
  const files = SCOPE_CALL.output
    .replaceAll('/app/igniterealtime/Openfire', '/app/server')
    .replaceAll('org/jivesoftware', 'org/example')
    .split('\n');
  const rows: { number?: number | string; text: string; highlight: boolean; path?: string }[] = step === 0
    ? files.map((path, index) => ({ number: String(index + 1).padStart(2, '0'), text: path.split('/').at(-1)!, highlight: false, path }))
    : snippet ? snippet.lines : ROUTE_CALLS[1].output.split('\n').map((text) => ({ text, highlight: /<servlet-name>|<url-pattern>/.test(text) }));
  const focusRows = rows.flatMap((row, index) => step === 0 || row.highlight ? [index] : []);
  const activeRow = focusRows[Math.min(Math.floor(Math.max(0, progress) * focusRows.length), focusRows.length - 1)];

  if (step === 1) return (
    <div className={styles.diagramStage}>
      <CyberAttackDemo attack={CYBER_ATTACKS.openfire} scenarioId="openfire" />
    </div>
  );

  return (
    <div className={styles.stage}>
      <section className={styles.reasoning} data-playing={playing} aria-label="Recorded agent reasoning">
        <header>
          <h2>{snippet ? 'Agent assessment' : 'Agent reasoning'}</h2>
          <span className={styles.thinking} aria-label={playing ? 'Thinking' : 'Thinking animation paused'}>
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
          </span>
        </header>
        <blockquote>{reasoning}</blockquote>
      </section>
      <div className={styles.editor}>
        <header className={styles.toolBar}>
          <h2>{step === 0 ? 'Scanning repositories' : snippet ? 'Inspecting source code' : 'Checking the endpoint'}</h2>
          <span className={styles.fileBadge}>{snippet ? ['Untrusted input', 'URL construction', 'HTTP request'][step - 2] : 'shell_tool'}</span>
        </header>
        <div className={styles.fileBar}>
          <code>{step === 0 ? 'Messaging server / Java files' : snippet ? 'FaviconServlet.java' : 'WEB-INF/web.xml'}</code>
        </div>
        <div className={styles.commands}>
          {calls.map((call) => <code key={call.id}><span aria-hidden="true">$ </span>{SHORT_COMMANDS[call.id]}</code>)}
        </div>
        <div className={styles.codeFrame} onFocusCapture={onInteract} onPointerDown={onInteract} onWheel={(event) => { if (event.deltaX || event.shiftKey) onInteract?.(); }}>
          <pre className={`${styles.source} ${step === 0 ? styles.fileList : step === 5 ? styles.routeOutput : ''}`} tabIndex={0} aria-label={step === 0 ? 'Files returned by recorded search, paths shortened' : snippet ? `${snippet.title}, exact source excerpt` : 'Recorded servlet mapping output excerpt'}>
            {rows.map((row, index) => (
              <span key={row.number ?? index} className={`${row.highlight || index === activeRow ? styles.highlight : ''} ${index === activeRow ? styles.activeLine : ''} ${step === 4 && (row.number === 195 || row.number === 197) ? styles.riskLine : ''}`}>
                {row.number !== undefined && <span className={styles.lineNumber}>{row.number}</span>}
                <code title={row.path}>
                  {snippet ? <HighlightedCode text={row.text || ' '} /> : row.text}
                </code>
              </span>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
