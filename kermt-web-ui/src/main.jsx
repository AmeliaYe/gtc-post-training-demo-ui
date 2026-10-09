/** One scripted scenario: a scientist's problem, answered by two models side by side. */
import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import {splitReasoning} from './reasoning.js';
import data from './scenarios.json';

const scenario = data.scenarios[0];
const images = import.meta.glob('./molecules/*.svg', {eager:true, query:'?url', import:'default'});
const moleculeImage = images[`./molecules/${scenario.id}.svg`];
const arms = ['base', 'kermt'];
const labels = {base: 'Nemotron Lightning', kermt: 'Post-trained Nemotron Lightning + KERMT'};
const inputs = {base: 'Reads the molecule as SMILES text', kermt: 'Reads the molecular graph in KERMT soft token format'};

/** Deduplicate consecutive repeated paragraphs the model sometimes emits (it drafts the
 * reasoning once, then repeats it verbatim before closing </think>). Keeps first occurrence. */
function dedupeParagraphs(text) {
  const paras = text.split(/\n\n+/);
  const seen = new Set();
  return paras.filter(p => { const k = p.trim(); return k && !seen.has(k) && seen.add(k); }).join('\n\n');
}

/** The integer a model committed to: the last number after its reasoning. */
function finalInteger(text) {
  const {thinking, answer} = splitReasoning(text);
  const numbers = (answer ?? thinking.split(/\n\n+/).pop()).match(/\d+/g);
  return numbers ? Number(numbers[numbers.length - 1]) : null;
}

/** Response content: thinking toggle (collapsed) + answer text, or pulsing dots while streaming.
 * When <think> tags are present the split is authoritative; otherwise the last paragraph is the
 * answer and everything before it is collapsed.
 */
function ResponseTrace({text, streaming, stopped}) {
  const {thinking, answer} = splitReasoning(text);
  const [open, setOpen] = useState(false);
  if (streaming) return <span className="thinking-dots" aria-label="Thinking"><span/><span/><span/></span>;
  if (stopped) return <pre className="answer-text answer-stopped">Generation stopped.</pre>;

  let reasoningText, displayAnswer;
  if (answer !== null) {
    reasoningText = thinking ? dedupeParagraphs(thinking) : null;
    displayAnswer = answer;
  } else {
    const paras = dedupeParagraphs(thinking).split(/\n\n+/);
    displayAnswer = paras[paras.length - 1].trim();
    reasoningText = paras.length > 1 ? paras.slice(0, -1).join('\n\n') : null;
  }
  return <div className="answer-appear">
    <pre className="answer-text">{displayAnswer}</pre>
    {reasoningText && <button type="button" className="thinking-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
      {open ? '▾' : '▸'} reasoning · {reasoningText.split(/\s+/).filter(Boolean).length} words
    </button>}
    {open && <section className="trace-section thinking"><pre>{reasoningText}</pre></section>}
  </div>;
}

/** Live clock and token count under the model name; the faster side is highlighted in green. */
function TurnMetrics({response, tokenWin, timeWin}) {
  const [now, setNow] = useState(() => performance.now());
  const {startedAt, finishedAt} = response ?? {};
  useEffect(() => {
    if (startedAt == null || finishedAt != null) return;
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, [startedAt, finishedAt]);
  const seconds = startedAt == null ? 0 : Math.max(0, ((finishedAt ?? now) - startedAt) / 1000);
  const tenths = Math.round(seconds * 10);
  const elapsed = `${String(Math.floor(tenths / 600)).padStart(2, '0')}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`;
  return <div className="turn-foot">
    <span className={timeWin ? 'metric-win' : ''}><span className="metric-label">time</span>{elapsed}</span>
    <span className={tokenWin ? 'metric-win' : ''}><span className="metric-label">tokens</span>{(response?.tokens ?? 0).toLocaleString()}</span>
  </div>;
}

/** Correlate the two model requests without relying on secure-context-only APIs. */
function newSubmissionId() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/** Consume NDJSON across arbitrary network chunk boundaries, including UTF-8 splits. */
async function consumeStream(response, onEvent) {
  if (!response.ok) throw new Error((await response.text()).slice(0, 300));
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = '', finished = false;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      pending += value;
      let end;
      while ((end = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, end); pending = pending.slice(end + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.error) throw new Error(event.error);
        if (event.done) finished = true;
        onEvent(event);
      }
    }
    if (!finished) throw new Error('Connection ended before generation completed.');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}


const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** SMILES text arrives character by character, the way a text model reads it. */
function TypedText({text, animate, delay}) {
  const [count, setCount] = useState(animate && !reducedMotion() ? 0 : text.length);
  useEffect(() => {
    if (!animate || reducedMotion()) return;
    const step = Math.ceil(text.length / 50);
    let timer;
    const start = setTimeout(() => {timer = setInterval(() => setCount(n => Math.min(text.length, n + step)), FILL_MS / Math.ceil(text.length / step));}, delay);
    return () => {clearTimeout(start); clearInterval(timer);};
  }, [animate, text, delay]);
  return <code className="smiles-text">{text.slice(0, count)}<span className="smiles-rest">{text.slice(count)}</span></code>;
}

/** One MOL token, then one token per atom and per bond, appearing in order. */
function TokenChips({atoms, bonds, animate, delay: lead}) {
  const kinds = ['mol', ...Array(atoms).fill('atom'), ...Array(bonds).fill('bond')];
  const delay = animate && !reducedMotion() ? FILL_MS / kinds.length : 0;
  return <div className="token-chips" aria-hidden="true">
    {kinds.map((kind, i) => <span key={i} className={`token-chip ${kind}${delay ? ' pop' : ''}`} style={delay ? {animationDelay: `${Math.round(lead + i * delay)}ms`} : undefined}/>)}
  </div>;
}

/** What each model is actually given, shown above its answer. */
function InputStrip({arm, animate}) {
  const lead = animate && !reducedMotion() ? FLIGHT_MS : 0;
  const total = 1 + scenario.atoms + scenario.bonds;
  // Nothing is shown until the molecule has been sent; the empty slot is also where the flight lands.
  if (!animate) return <div className="input-strip waiting" data-strip={arm}><span className="caption">Waiting for the molecule…</span></div>;
  return <div className="input-strip" data-strip={arm}>
    <span className={lead ? 'caption arrive' : 'caption'} style={lead ? {animationDelay: `${lead}ms`} : undefined}>{arm === 'base'
      ? <>Input · SMILES text · {scenario.smiles.length} characters</>
      : <>Input · {total} tokens: <span className="dot mol"/>1 molecule · <span className="dot atom"/>{scenario.atoms} atoms · <span className="dot bond"/>{scenario.bonds} bonds</>}</span>
    {arm === 'base' ? <TypedText text={scenario.smiles} animate={animate} delay={lead}/> : <TokenChips atoms={scenario.atoms} bonds={scenario.bonds} animate={animate} delay={lead}/>}
  </div>;
}

/** The molecule travels for FLIGHT_MS, then each input fills in over FILL_MS; models start after both. */
const FLIGHT_MS = 1600, FILL_MS = 2200, SEQUENCE_MS = FLIGHT_MS + FILL_MS + 300;

/** Copies of the molecule drawing that travel from the question into each model's input strip,
 * shrinking and fading as the strip fills with that model's own representation.
 */
function Flight({from, targets, src, onDone}) {
  const refs = useRef([]);
  useEffect(() => {
    const anims = refs.current.map((el, i) => {
      const to = targets[i];
      const scale = Math.min(0.28, (to.height * 0.6) / from.height);
      const dx = (to.left + 90) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      return el.animate([
        {transform: 'translate(0,0) scale(1)', opacity: 1},
        {transform: `translate(${dx}px,${dy}px) scale(${scale})`, opacity: 1, offset: 0.7},
        {transform: `translate(${dx}px,${dy}px) scale(${scale * 0.8})`, opacity: 0},
      ], {duration: FLIGHT_MS, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'});
    });
    const done = setTimeout(onDone, FLIGHT_MS);
    return () => {clearTimeout(done); anims.forEach(a => a.cancel());};
  }, []);
  return <>{targets.map((_, i) => <img key={i} ref={el => {refs.current[i] = el;}} className="flight" src={src} alt=""
    style={{left: from.left, top: from.top, width: from.width, height: from.height}}/>)}</>;
}

/** Question text with hoverable definitions for terms a visitor may not know. */
function WithGlossary({text, glossary = []}) {
  if (!glossary.length) return text;
  const escape = term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${glossary.map(g => escape(g.term)).join('|')})`, 'i');
  return text.split(pattern).map((part, i) => {
    const entry = glossary.find(g => g.term.toLowerCase() === part.toLowerCase());
    return entry
      ? <span className="term" key={i} tabIndex={0}>{part}<span className="tip" role="tooltip">{entry.definition}</span></span>
      : part;
  });
}

/** Simple stand-in for the scientist asking the question. */
function Scientist({role}) {
  return <div className="speaker"><svg className="scientist" viewBox="0 0 72 72" aria-hidden="true">
    <circle cx="36" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 68c0-16 12-24 28-24s28 8 28 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg><span className="caption">{role}</span></div>;
}

function App() {
  const [turn, setTurn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState(0);
  const [flight, setFlight] = useState(null);
  const moleculeRef = useRef(null);
  const controller = useRef(null);

  /** Both models receive the same fixed question; cancellation reaches both requests. */
  async function run() {
    if (busy) return;
    controller.current = new AbortController();
    const {signal} = controller.current;
    setTurn(null); setBusy(true); setRunId(n => n + 1);
    const source = moleculeRef.current;
    const strips = arms.map(arm => document.querySelector(`[data-strip="${arm}"]`));
    if (source && strips.every(Boolean) && !reducedMotion()) {
      setFlight({from: source.getBoundingClientRect(), targets: strips.map(el => el.getBoundingClientRect())});
      // The models only start once each has been handed its representation of the molecule.
      await new Promise(resolve => {
        const timer = setTimeout(resolve, SEQUENCE_MS);
        signal.addEventListener('abort', () => {clearTimeout(timer); resolve();});
      });
      setFlight(null);
      if (signal.aborted) {setBusy(false); reset(); return;}
    }
    const startedAt = performance.now();
    setTurn({base: {text:'', state:'Preparing', tokens:0, startedAt}, kermt: {text:'', state:'Preparing', tokens:0, startedAt}});
    const submissionId = newSubmissionId();
    const patch = (arm, change) => setTurn(current => current ? {...current, [arm]: {...current[arm], ...change}} : current);
    await Promise.allSettled(arms.map(async arm => {
      let text = '';
      try {
        const response = await fetch(`/api/${arm}/generate`, {method:'POST', signal:controller.current.signal,
          headers:{'Content-Type':'application/json'}, body:JSON.stringify({submission_id:submissionId, question:scenario.question, smiles:scenario.smiles})});
        await consumeStream(response, e => {
          if (e.text) text += e.text;
          patch(arm, {text, state:e.done ? (e.finish_reason === 'length' ? 'Token limit exceeded' : 'Complete') : 'Generating', ...(e.tokens != null ? {tokens:e.tokens} : {}), ...(e.done ? {finishedAt:performance.now()} : {})});
        });
      } catch (e) { patch(arm, {state:e.name === 'AbortError' ? 'Stopped' : 'Error', finishedAt:performance.now(), error:e.name === 'AbortError' ? '' : e.message}); }
    }));
    setBusy(false);
  }

  /** Return to the starting state so the demo can be run again from the top. */
  function reset() {
    setTurn(null); setRunId(0); setFlight(null);
  }

  const finished = arm => turn?.[arm]?.finishedAt != null;
  const bothDone = turn && arms.every(finished);
  const wins = bothDone ? {
    tokens: turn.kermt.tokens <= turn.base.tokens ? 'kermt' : 'base',
    time: (turn.kermt.finishedAt - turn.kermt.startedAt) <= (turn.base.finishedAt - turn.base.startedAt) ? 'kermt' : 'base',
  } : null;
  /** A finished, uninterrupted answer is judged against the reference count. */
  const verdict = arm => {
    const r = turn?.[arm];
    if (!r || r.finishedAt == null || r.state === 'Stopped' || r.state === 'Error') return null;
    const answer = finalInteger(r.text);
    return {answer, correct: answer === scenario.expectedAnswer};
  };

  /** The story closes only when the outcome supports it: post-trained right, base wrong. */
  const showPayoff = Boolean(scenario.payoff && verdict('kermt')?.correct && verdict('base') && !verdict('base').correct);

  return <main>
    <header className="page-head">
    </header>
    <section className="scene" aria-label="Scenario">
      <Scientist role={scenario.speaker}/>
      <div className="bubble">
        <div className="bubble-text">
          <p className="ask"><WithGlossary text={scenario.displayQuestion ?? scenario.question} glossary={scenario.glossary}/></p>
          {showPayoff && <p className="why payoff" role="status">{scenario.payoff.replace('{expected}', scenario.expectedAnswer)}</p>}
          <div className="scene-actions">
            {busy
              ? <button type="button" onClick={() => controller.current.abort()}>Stop</button>
              : runId > 0
                ? <button type="button" onClick={reset}>Reset</button>
                : <button className="primary" type="button" onClick={run}>Ask both models <span aria-hidden="true">↗</span></button>}
          </div>
        </div>
        <img ref={moleculeRef} className={flight ? 'molecule sending' : 'molecule'} src={moleculeImage} alt={`Structure of ${scenario.chemblId}`}/>
      </div>
    </section>
    <section className="comparison" aria-label="Model comparison">
      {arms.map(arm => {
        const v = verdict(arm);
        return <article className={`model ${arm}${v ? (v.correct ? ' is-correct' : ' is-wrong') : ''}`} key={arm}>
          <div className="model-head">
            <div><h2>{labels[arm]}</h2><span className="caption">{inputs[arm]}</span></div>
            {turn && !finished(arm) && <span className="gen-spinner" aria-label="Generating"><span/><span/><span/></span>}
            {v && <span className={v.correct ? 'verdict ok' : 'verdict bad'}>{v.correct ? '✓' : '✗'} {v.answer ?? 'No answer'} · {v.correct ? 'Correct' : 'Incorrect'}</span>}
          </div>
          <TurnMetrics response={turn?.[arm]} tokenWin={wins?.tokens === arm} timeWin={wins?.time === arm}/>
          <InputStrip key={`${arm}-${runId}`} arm={arm} animate={runId > 0}/>
          <div className="transcript" aria-label={`${labels[arm]} response`}>
            {!turn && <div className="empty-wait">{busy ? 'Handing the molecule to the model…' : 'Press “Ask both models” to see how this one answers.'}</div>}
            {turn && <>
              <ResponseTrace text={turn[arm].text} streaming={turn[arm].finishedAt == null} stopped={turn[arm].state === 'Stopped'}/>
              {turn[arm].error && <p className="error">{turn[arm].error}</p>}
            </>}
          </div>
        </article>;
      })}
    </section>
    {flight && <Flight {...flight} src={moleculeImage} onDone={() => setFlight(null)}/>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
