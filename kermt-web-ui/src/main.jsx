/** One standalone shared question and two independent real token streams. */
import React, {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import {splitReasoning} from './reasoning.js';
import library from './examples.json';
const loadEditor = () => import('./Editor.jsx');
const Editor = lazy(loadEditor);

/** Keep failed editor downloads visible and recoverable without hiding the composer. */
class EditorBoundary extends React.Component {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() {
    return this.state.failed ? <p role="alert">The molecule editor could not load. Close this dialog and refresh the page to try again.</p> : this.props.children;
  }
}

/** Explain a slow first download over a forwarded connection. */
function EditorLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {const timer = setTimeout(() => setSlow(true), 10000); return () => clearTimeout(timer);}, []);
  return <p role="status">{slow ? 'Still downloading the molecule editor. The first load can take a minute over a remote connection.' : 'Loading molecule editor…'}</p>;
}
/** Inline mol chip inside the user bubble; hover reveals the raw representation. */
function MolChip({arm, molecule}) {
  const [hover, setHover] = useState(false);
  const tokenCount = 1 + molecule.atoms + molecule.bonds;
  const label = arm === 'kermt' ? ` [KERMT soft token representation of molecule]` : ' [SMILES representation of molecule]';
  return (
    <span className="mol-chip-wrap">
      <span className="mol-chip-token" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>{label}</span>
      {hover && <span className="mol-chip-pop">
        {arm === 'kermt'
          ? `1 MOL · ${molecule.atoms} atom · ${molecule.bonds} bond tokens`
          : molecule.smiles}
      </span>}
    </span>
  );
}
/** Deduplicate consecutive repeated paragraphs the model sometimes emits (it drafts the
 * reasoning once, then repeats it verbatim before closing </think>). Keeps first occurrence. */
function dedupeParagraphs(text) {
  const paras = text.split(/\n\n+/);
  const seen = new Set();
  return paras.filter(p => { const k = p.trim(); return k && !seen.has(k) && seen.add(k); }).join('\n\n');
}

/** Response bubble content: thinking toggle (collapsed) + answer text, or pulsing dots while streaming.
 * When <think> tags are present the split is authoritative: thinking goes in the toggle, answer
 * goes in the bubble. When there are no tags we take the last double-newline paragraph as the
 * answer and collapse everything before it — sufficient for the short counting answers here.
 * The model sometimes emits its thinking twice; dedupeParagraphs strips the duplicate.
 */
function ResponseTrace({text, streaming, stopped}) {
  const {thinking, answer} = splitReasoning(text);
  const [open, setOpen] = useState(false);
  if (streaming) return <span className="thinking-dots" aria-label="Thinking"><span/><span/><span/></span>;

  if (stopped) {
    const stoppedText = text.trim() || null;
    return <div className="answer-appear">
      {stoppedText && <button type="button" className="thinking-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? '▾' : '▸'} partial output · {stoppedText.split(/\s+/).filter(Boolean).length} words
      </button>}
      {open && <section className="trace-section thinking"><pre>{stoppedText}</pre></section>}
      <pre className="answer-text answer-stopped">Generation stopped.</pre>
    </div>;
  }

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
    {reasoningText && <button type="button" className="thinking-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
      {open ? '▾' : '▸'} reasoning · {reasoningText.split(/\s+/).filter(Boolean).length} words
    </button>}
    {open && <section className="trace-section thinking"><pre>{reasoningText}</pre></section>}
    <pre className="answer-text">{displayAnswer}</pre>
  </div>;
}
/** Footer metrics shown once both arms are done; highlights the winner in green. */
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
const arms = ['base', 'kermt'];
const labels = {base: 'Nemotron Lightning', kermt: 'Post-trained Nemotron Lightning + KERMT'};
/** Compact heatmap strip for embedding inside the chat attachment pill. */
const MINI_DIMS = 14, MINI_COL = 3, MINI_ROW = 2;
function MiniTokenGrid({molecule}) {
  const {atoms, bonds, smiles} = molecule;
  const totalTokens = 1 + atoms + bonds;
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const vecs = generateVectors(atoms, bonds, smiles);
    const W = totalTokens * MINI_COL, H = MINI_DIMS * MINI_ROW;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    const d = img.data;
    for (let dim = 0; dim < MINI_DIMS; dim++) {
      for (let t = 0; t < totalTokens; t++) {
        const rgba = valueToRGBA(vecs[t][dim]);
        for (let pr = 0; pr < MINI_ROW; pr++) {
          for (let pc = 0; pc < MINI_COL; pc++) {
            const idx = ((dim * MINI_ROW + pr) * W + t * MINI_COL + pc) * 4;
            d[idx] = rgba[0]; d[idx+1] = rgba[1]; d[idx+2] = rgba[2]; d[idx+3] = rgba[3];
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [smiles, atoms, bonds, totalTokens]);
  return <canvas ref={canvasRef} className="mol-att-canvas"/>;
}

/** Inline attachment shown at the top of each model's first turn.
 * Shows what format the model received — a molecule thumbnail for the base
 * model, a soft-token heatmap strip for the trained model. Hover reveals
 * the underlying representation (SMILES string or token breakdown).
 */
function MoleculeAttachment({arm, molecule}) {
  const [hover, setHover] = useState(false);
  if (!molecule) return null;
  const tokenCount = 1 + molecule.atoms + molecule.bonds;
  return (
    <div className="mol-attachment" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="mol-att-row">
        {arm === 'kermt'
          ? <MiniTokenGrid molecule={molecule}/>
          : <img className="mol-att-img" src={molecule.image} alt="" aria-hidden="true"/>}
        <div className="mol-att-info">
          <span className="mol-att-name">{molecule.name}</span>
          <span className="mol-att-sub">{arm === 'kermt' ? `${tokenCount} soft tokens` : 'SMILES text'}</span>
        </div>
        <span className="mol-att-badge">{arm === 'kermt' ? 'KERMT' : 'SMILES'}</span>
      </div>
      {hover && <div className="mol-att-expand">
        {arm === 'kermt'
          ? <span>1 MOL · {molecule.atoms} atom · {molecule.bonds} bond tokens</span>
          : <code>{molecule.smiles}</code>}
      </div>}
    </div>
  );
}

// Heatmap constants: dimensions shown per token and pixel dimensions of each cell.
const DIMS = 40;
const COL_W = 4;
const ROW_H = 2;

/** Hash a SMILES string to a uint32 seed for the PRNG. */
function smilesToSeed(smiles) {
  let h = 5381;
  for (let i = 0; i < smiles.length; i++) h = (Math.imul(h, 31) + smiles.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Seeded LCG PRNG — good enough for visually distinct per-molecule patterns. */
function makePRNG(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };
}

/** Box-Muller normal sample from the PRNG. */
function boxMuller(r) {
  const u1 = Math.max(r(), 1e-10), u2 = r();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Map a scalar activation to an RGBA pixel: teal (negative) → dark (zero) → amber (positive). */
function valueToRGBA(v) {
  const t = Math.max(-1, Math.min(1, v / 1.8));
  if (t < 0) {
    const s = Math.pow(-t, 0.7);
    return [Math.round(18), Math.round(18 + 130 * s), Math.round(18 + 120 * s), 255];
  }
  const s = Math.pow(t, 0.7);
  return [Math.round(18 + 210 * s), Math.round(18 + 145 * s), Math.round(18), 255];
}

/** Synthetic token vectors seeded by SMILES so each molecule has a consistent pattern.
 * The MOL token uses denser activations (global pooling); atom and bond tokens are
 * sparser. All share a low-frequency molecular basis, producing correlated structure
 * across tokens — a rough proxy for what a real GNN encoder would produce.
 * Replace with actual encoder output when the backend exposes the embeddings.
 */
function generateVectors(atoms, bonds, smiles) {
  const r = makePRNG(smilesToSeed(smiles));
  const rn = () => boxMuller(r);
  const basis = Array.from({length: DIMS}, () => rn() * 0.4);
  const salient = Array.from({length: DIMS}, () => r() < 0.15 ? 1 : 0);
  const mkVec = (scale, noise, sparse) => basis.map((b, d) => {
    let x = b * scale + rn() * noise + salient[d] * rn() * (noise * 1.4);
    if (sparse && Math.abs(x) < sparse) x *= 0.15;
    return x;
  });
  return [
    mkVec(1.2, 0.9, 0),
    ...Array.from({length: atoms}, () => mkVec(0.6, 0.8, 0.25)),
    ...Array.from({length: bonds}, () => mkVec(0.4, 0.65, 0.3)),
  ];
}

/** The soft-token sequence the KERMT model receives, rendered as a pixel heatmap.
 * Each column is one token vector; each row is one of DIMS dimensions sampled from
 * the full 1,600-d embedding. Colors show activation magnitude (teal=negative,
 * amber=positive). The MOL token and the atom/bond sections are separated by
 * two-pixel gaps. Vectors are synthetic pending real encoder output from the backend.
 */
function TokenHeatmap({molecule, onPreview}) {
  const {atoms, bonds, smiles, name} = molecule;
  const totalTokens = 1 + atoms + bonds;
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const vecs = generateVectors(atoms, bonds, smiles);
    const W = totalTokens * COL_W, H = DIMS * ROW_H;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    const d = img.data;
    for (let dim = 0; dim < DIMS; dim++) {
      for (let t = 0; t < totalTokens; t++) {
        const rgba = valueToRGBA(vecs[t][dim]);
        // Two-pixel gap at section boundaries (before atom tokens and before bond tokens).
        const gapCols = (t === 1 || t === atoms + 1) ? 2 : 0;
        for (let pr = 0; pr < ROW_H; pr++) {
          for (let pc = 0; pc < COL_W; pc++) {
            const idx = ((dim * ROW_H + pr) * W + t * COL_W + pc) * 4;
            if (pc < gapCols) {
              d[idx] = 35; d[idx+1] = 35; d[idx+2] = 35; d[idx+3] = 255;
            } else {
              d[idx] = rgba[0]; d[idx+1] = rgba[1]; d[idx+2] = rgba[2]; d[idx+3] = rgba[3];
            }
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [smiles, atoms, bonds, totalTokens]);
  const molW = COL_W, atomsW = atoms * COL_W, bondsW = bonds * COL_W;
  return <div className="token-heatmap" aria-label={`Soft token input for ${name}: ${totalTokens} tokens`}>
    <div className="thm-labels">
      <span className="thm-sec" style={{width: molW}}>MOL</span>
      <span className="thm-sec" style={{width: atomsW}}>{atomsW > 50 ? `${atoms} atom tokens` : atomsW > 20 ? `${atoms}a` : ''}</span>
      <span className="thm-sec" style={{width: bondsW}}>{bondsW > 50 ? `${bonds} bond tokens` : bondsW > 20 ? `${bonds}b` : ''}</span>
    </div>
    <div className="thm-canvas-wrap">
      <canvas ref={canvasRef} className="thm-canvas"/>
    </div>
    <div className="stb-footer">
      <span>{totalTokens} tokens · {DIMS} of 1,600 dims · synthetic</span>
      <button type="button" onClick={() => onPreview(molecule)}>View structure</button>
    </div>
  </div>;
}

/** Enlarge the validated SVG without opening an editor or changing the request.
 * The selected molecule is a snapshot: a submitted preview must stay tied to
 * that turn even when the composer contains a different draft molecule.
 */
function MoleculePreview({molecule, onClose}) {
  const ref = useRef(null);
  useEffect(() => {ref.current.showModal();}, []);
  return <dialog className="molecule-preview" ref={ref} aria-labelledby="molecule-preview-title" onCancel={onClose}>
    <div className="dialog-head"><h2 id="molecule-preview-title">{molecule.name}</h2><button type="button" onClick={onClose} autoFocus>Close preview</button></div>
    <img src={molecule.image} alt={`Molecular structure of ${molecule.name} with atom indices`}/>
    <p>{1 + molecule.atoms + molecule.bonds} soft tokens</p>
  </dialog>;
}
// Placeholder suggestions mirror the qualified example library.
const examples = library.examples.map(example => example.question);

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

/** One page owns one paired response; every submission replaces it. */
function App() {
  const [question, setQuestion] = useState('');
  const [molecule, setMolecule] = useState(null);
  const [turn, setTurn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(0);
  useEffect(() => {
    // Begin the editor download after the small chat UI has rendered.
    const timer = setTimeout(() => {loadEditor().catch(() => {});}, 1000);
    return () => clearTimeout(timer);
  }, []);
  const [dialog, setDialog] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const controller = useRef(null), dialogRef = useRef(null), questionRef = useRef(null);
  const transcripts = useRef({}), following = useRef({base:true, kermt:true});
  useEffect(() => {
    for (const arm of arms) {
      const node = transcripts.current[arm];
      if (node && following.current[arm]) node.scrollTop = node.scrollHeight;
    }
  }, [turn]);
  useEffect(() => {
    let active = true;
    const check = () => fetch('/api/health').then(r => r.ok ? r.json() : Promise.reject())
      .then(value => {if(active) setStatus(value);})
      .catch(() => {if(active) setStatus({base:false, kermt:false});});
    check();
    const timer = setInterval(check, 15000);
    return () => {active = false; clearInterval(timer);};
  }, []);
  useEffect(() => {
    if (busy || question || dialog || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setSuggestion(n => (n + 1) % examples.length), 5000);
    return () => clearInterval(timer);
  }, [busy, question, dialog]);
  useEffect(() => { if (dialog) dialogRef.current.showModal(); }, [dialog]);

  /** Validate before insertion; the server returns canonical atom indices and a depiction. */
  async function insert(smiles, name = 'Molecule') {
    setSaving(true); setError('');
    try {
      if (!smiles.trim()) throw new Error('Draw or import a molecule before inserting it.');
      const response = await fetch('/api/molecule', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({smiles})});
      if (!response.ok) {
        const detail = (await response.json()).detail;
        throw new Error(typeof detail === 'string' ? detail : 'Invalid molecule. Check the structure and try again.');
      }
      setMolecule({...await response.json(), name});
      setDialog(false); setEditor(null); questionRef.current.focus();
      return true;
    } catch (e) { setError(e.message); return false; }
    finally { setSaving(false); }
  }
  /** One standalone turn fans out concurrently; cancellation reaches both requests. */
  async function submit(submittedQuestion = question, submittedMolecule = molecule) {
    if (!submittedQuestion.trim() || busy) return;
    const startedAt = performance.now();
    const request = {submissionId:newSubmissionId(), question: submittedQuestion.trim(), molecule: submittedMolecule, base: {text:'', state:'Preparing', tokens:0, startedAt}, kermt: {text:'', state:'Preparing', tokens:0, startedAt}};
    setTurn(request); setBusy(true); setError('');
    controller.current = new AbortController();
    const patch = (arm, change) => setTurn(current => current ? {...current, [arm]: {...current[arm], ...change}} : current);
    await Promise.allSettled(arms.map(async arm => {
      let text = '';
      try {
        const response = await fetch(`/api/${arm}/generate`, {method:'POST', signal:controller.current.signal,
          headers:{'Content-Type':'application/json'}, body:JSON.stringify({submission_id:request.submissionId, question:request.question, smiles:request.molecule?.smiles || null})});
        await consumeStream(response, e => {
          if (e.text) text += e.text;
          patch(arm, {text, state:e.done ? (e.finish_reason === 'length' ? 'Token limit exceeded' : 'Complete') : 'Generating', ...(e.tokens != null ? {tokens:e.tokens} : {}), ...(e.done ? {finishedAt:performance.now()} : {})});
        });
      } catch (e) { patch(arm, {state:e.name === 'AbortError' ? 'Stopped' : 'Error', finishedAt:performance.now(), error:e.name === 'AbortError' ? '' : e.message}); }
    }));
    setBusy(false);
  }
  /** Fill an editable draft with a validated library molecule and question.
   * Loading an example leaves any submitted turn intact; only the explicit
   * Compare action starts generation with the user's final edits.
   */
  async function loadExample(example) {
    if (busy || saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/molecule', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({smiles:example.smiles})});
      if (!response.ok) throw new Error('Could not load the example molecule. Please try again.');
      const selectedMolecule = {...await response.json(), name:example.name};
      setQuestion(example.question); setMolecule(selectedMolecule);
      questionRef.current.focus();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  const example = examples[suggestion];
  return <main>
    <header className="topbar"><span className="wordmark">NVIDIA <span>/</span> Nemotron</span><span className="caption">Molecular reasoning demo</span></header>
    <section className="hero"><h1>Post-training Nemotron for Multimodal Input</h1><p>Draw a molecule, ask a question, and watch two models respond.</p></section>
    <section className="input-stage">
      <div className="input-molecule">
        <div className="input-section-label">Pick an example molecule</div>
        <div className="example-picker">
          <button type="button" className="example-featured" disabled={busy || saving} title={library.examples[previewIdx].question} onClick={() => loadExample(library.examples[previewIdx])}>
            {library.examples[previewIdx].image && <img src={library.examples[previewIdx].image} alt={library.examples[previewIdx].label} className="example-featured-img"/>}
          </button>
          <div className="example-tabs">{library.examples.map((ex, i) => <button type="button" key={ex.id} disabled={busy || saving} className={i === previewIdx ? 'example-tab active' : 'example-tab'} onClick={() => { setPreviewIdx(i); loadExample(ex); }}>{ex.label}</button>)}</div>
        </div>
        <button className="insert-button" type="button" disabled={busy || saving} onClick={() => {setError(''); setDialog(true);}}>＋ Create your own</button>
      </div>
      <form className="input-question" onSubmit={event => {event.preventDefault(); if (!saving) void submit();}}>
        <label htmlFor="question" className="input-section-label">Ask a question</label>
        <textarea id="question" ref={questionRef} value={question} onChange={e => setQuestion(e.target.value)} placeholder={example} maxLength={4000} rows={3}/>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="input-actions">
          <button type="button" disabled={busy || saving} onClick={() => {setTurn(null); setQuestion(''); setMolecule(null); setError('');}}>Clear</button>
          {busy ? <button type="button" onClick={event => {event.preventDefault(); controller.current.abort();}}>Stop generation</button> : <button className="primary" disabled={!question.trim() || saving} type="submit">Send to both models <span aria-hidden="true">↗</span></button>}
        </div>
      </form>
    </section>
    <section className="comparison" aria-label="Model comparison">
      {(() => {
        const bothDone = turn && arms.every(arm => turn[arm]?.finishedAt != null);
        const wins = bothDone ? {
          tokens: turn.kermt.tokens <= turn.base.tokens ? 'kermt' : 'base',
          time: (turn.kermt.finishedAt - turn.kermt.startedAt) <= (turn.base.finishedAt - turn.base.startedAt) ? 'kermt' : 'base',
        } : null;
        const winner = wins?.tokens ?? (turn ? arms.find(a => turn[a]?.finishedAt != null) ?? null : null);
        return arms.map(arm => <article className={`model ${arm}${winner === arm ? ' model-winner' : ''}`} key={arm}>
          <div className="model-head">
            <h2>{labels[arm]}</h2>
            {turn && (turn[arm]?.finishedAt != null ? <span className="gen-done" aria-label="Done">✓</span> : <span className="gen-spinner" aria-label="Generating"><span/><span/><span/></span>)}
          </div>
          <div className="transcript" ref={node => {transcripts.current[arm] = node;}} onScroll={e => {const n=e.currentTarget; following.current[arm] = n.scrollHeight - n.scrollTop - n.clientHeight < 64;}} aria-label={`${labels[arm]} response`}>
            {!turn && <div className="empty-wait">Pick a molecule and ask a question to see how this model responds.</div>}
            {turn && <section className="turn">
              <div className="user-bubble">
                {turn.question}
                {turn.molecule && <> <MolChip arm={arm} molecule={turn.molecule}/></>}
              </div>
              <div className="model-bubble">
                <ResponseTrace text={turn[arm].text} streaming={turn[arm].finishedAt == null} stopped={turn[arm].state === 'Stopped'}/>
                {turn[arm].error && <p className="error">{turn[arm].error}</p>}
              </div>
            </section>}
          </div>
          {turn && <TurnMetrics response={turn[arm]} tokenWin={wins?.tokens === arm} timeWin={wins?.time === arm}/>}
        </article>);
      })()}
    </section>
    <footer> Submitted inputs and model traces are stored on this machine.</footer>
    {preview && <MoleculePreview molecule={preview} onClose={() => setPreview(null)}/>}
    {dialog && <dialog ref={dialogRef} onCancel={() => {setDialog(false);setEditor(null);}}><div className="dialog-head"><div><h2>Insert a molecule</h2><p>Draw a structure or paste SMILES using the editor's Open tool.</p></div><button onClick={() => {setDialog(false);setEditor(null);}}>Cancel</button></div><div className="editor"><EditorBoundary><Suspense fallback={<EditorLoading/>}><Editor onInit={async k => {try {if(molecule) await k.setMolecule(molecule.smiles);setEditor(k);} catch(e) {setError(e.message);}}}/></Suspense></EditorBoundary></div>{error && <p role="alert" className="error">{error}</p>}<div className="dialog-actions"><span className="caption">RDKit validates the structure and assigns canonical atom indices.</span><button className="primary" disabled={!editor || saving} onClick={async () => {try {await insert(await editor.getSmiles());} catch(e) {setError(e.message);}}}>{saving ? 'Validating…' : 'Insert molecule'}</button></div></dialog>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
