const icon = name => `<img src="assets/architecture-r04/${name}.png" alt="" aria-hidden="true">`;
const control = name => `<img src="assets/beyond-request-${name}-${name === 'info' ? 'r02' : 'r01'}.svg" alt="" width="18" height="18">`;

export function mountArchitecture(root) {
  root.classList.add('architecture-screen');
  const evidence = document.createElement('details');
  evidence.id = 'trainingEvidence';
  evidence.className = 'af-evidence ef-details';
  evidence.innerHTML = '<summary>Recorded training evidence</summary><p class="af-evidence-intro">September 16 migraine case: four conversations sampled from one policy, with recorded rewards and optimizer advantages. This is a separate example from the refill validation case.</p>';
  for (const node of [...root.children]) if (!node.classList.contains('nf-footer')) evidence.append(node);
  evidence.querySelector('.ef-architecture')?.remove();
  evidence.querySelector('.copy-rail').hidden = true;
  evidence.querySelector('#autoplayButton').textContent = 'Checkpoint replay';
  root.prepend(evidence);
  const visual = document.createElement('section');
  visual.className = 'architecture-flow af-focused';
  visual.setAttribute('aria-label','Nemotron post-training architecture');
  visual.innerHTML = `
    <header class="af-heading"><p>How to post-train</p><h1>Practice. Feedback. A model update.</h1></header>
    <div class="af-diagram">
      <svg class="af-wires" aria-hidden="true"><defs><marker id="af-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs></svg>
      <div class="af-policy af-part" data-component="policy">
        <button type="button" class="af-open" data-inspect="policy" title="Inspect the trainable assistant policy">
          ${icon('nemotron')}<h2>Nemotron</h2><p class="af-job">The agent that learns</p><span class="af-model">3.5 Lightning</span><span class="af-harness">Hermes agent harness</span>
        </button>
      </div>
      <section class="af-gym af-part" data-component="gym" aria-labelledby="af-gym-title">
        <div class="af-gym-symbol" aria-hidden="true">${icon('tools')}<span class="af-symbol-arrow">${control('arrow-right')}</span>${icon('verifier')}</div>
        <h2 id="af-gym-title">NeMo Gym</h2><p class="af-job">Practice + feedback</p>
        <div class="af-gym-links"><button type="button" data-inspect="sandbox" title="Inspect the simulated patient and clinical tools">Environment ${control('info')}</button><button type="button" data-inspect="verifier" title="Inspect verification and recorded judging">Verifier ${control('info')}</button></div>
        <div class="af-process" aria-hidden="true"><div>${[1,2,3,4].map(i=>`<span style="--attempt:${i}"><i></i><i></i><i></i><b>${control('check')}</b></span>`).join('')}</div><p class="af-process-label">Sample conversations</p></div>
      </section>
      <div class="af-optimizer af-part" data-component="optimizer"><button type="button" class="af-open" data-inspect="optimizer" title="Inspect the GRPO optimizer">${icon('rl')}<h2>NeMo RL</h2><p class="af-job">Update the model</p><span class="af-algorithm">GRPO</span></button></div>
      <div class="af-return"><span>Updated assistant policy</span></div>
    </div>
    <div class="af-playback"><div class="af-phases" role="group" aria-label="Training stages">${['Practice','Score','Update'].map((name,i)=>`<button type="button" data-phase="${i}" aria-pressed="${i===0}"><span>0${i+1}</span>${name}<i></i></button>`).join('')}</div><div class="af-player"><button type="button" data-architecture="play" title="Pause architecture animation" aria-label="Pause architecture animation">${control('pause')}</button><button type="button" data-architecture="restart" title="Replay architecture animation" aria-label="Replay architecture animation">${control('rotate-ccw')}</button></div></div>
    <p class="af-caption"></p>
    <div class="af-setup">${icon('codex')}<strong>Codex</strong><span>+</span>${icon('skills')}<strong>Agent Skills for NeMo</strong><span class="af-setup-role">Develop &amp; deploy</span></div>
    <footer class="af-compute"><div><strong>DGX Station</strong><span>Post-training platform</span></div><p>Illustrated workflow. Recorded evidence below; no live training.</p></footer>
    <details class="af-components"><summary>Workflow components</summary><div class="af-component-grid"><section><h3>Assistant</h3><p>Nemotron 3.5 Lightning</p><p>Trainable policy in Hermes</p><h3>Simulated patient</h3><p>Nemotron 3.5 Lightning</p><p class="af-fixed">Fixed patient policy</p></section><section><h3>Healthcare tasks</h3><p>Prescription renewal<br>Symptom assessment<br>Appointment cancellation<br>Pharmacy update</p><h3>Clinical tools</h3><p>Called by the assistant</p><p class="af-tools-code">get_profile, list_medications, request_refill, schedule_appointment, cancel_appointment, update_pharmacy</p></section><section><h3>Verifier</h3><p>Scores conversation and tool outcomes</p><p>Safety, workflow, triage, helpfulness, task completion and conversation quality</p><h3>NeMo RL / GRPO</h3><p>Group-relative feedback updates only the assistant policy</p></section></div></details>
    <div class="af-bottom"><button type="button" data-architecture="evidence">Recorded attempts &amp; scoring ${control('arrow-right')}</button><a href="../../architecture-r05/nemotron-healthcare-architecture-r05.pptx" download>Editable architecture ${control('arrow-right')}</a></div>`;
  root.prepend(visual);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phases = [
    'The agent practices with a simulated patient and clinical tools.',
    'The verifier rewards how the task was handled, not just whether it finished.',
    'NeMo RL uses the feedback to update the assistant model. The patient model stays fixed.'
  ];
  let phase = 0, elapsed = 0, playing = !reduced.matches, last = 0, raf = 0;
  const duration = 6000;
  const active = () => root.classList.contains('active') && !document.hidden;
  function render() {
    visual.dataset.phase = ['practice','score','update'][phase];
    visual.dataset.playing = String(playing && active());
    visual.style.setProperty('--phase-progress',String(elapsed/duration));
    visual.querySelector('.af-caption').textContent = phases[phase];
    visual.querySelector('.af-process-label').textContent=['Sample conversations','Score the behavior','Use the feedback'][phase];
    visual.querySelectorAll('[data-phase]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===phase)));
    const play=visual.querySelector('[data-architecture="play"]');
    play.innerHTML=control(playing?'pause':'play');
    play.title=playing?'Pause architecture animation':'Play architecture animation';
    play.setAttribute('aria-label',play.title);
  }
  function tick(now) {
    raf=0;
    if(!active()||!playing){last=0;render();return;}
    elapsed+=last?Math.min(now-last,100):0;last=now;
    if(elapsed>=duration){phase=(phase+1)%3;elapsed=0;}
    render();raf=requestAnimationFrame(tick);
  }
  function schedule(){if(playing&&active()&&!raf)raf=requestAnimationFrame(tick);}
  function pause(){playing=false;last=0;cancelAnimationFrame(raf);raf=0;render();}
  function select(next,run=false){phase=next;elapsed=0;last=0;playing=run;cancelAnimationFrame(raf);raf=0;render();schedule();}
  function reveal(){pause();evidence.open=true;evidence.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}
  visual.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.phase!==undefined){select(Number(button.dataset.phase));return;}
    if(button.dataset.architecture==='play'){if(playing)pause();else{playing=true;last=0;render();schedule();}return;}
    if(button.dataset.architecture==='restart'){select(0,!reduced.matches);return;}
    if(button.dataset.architecture==='evidence'){reveal();return;}
    if(button.dataset.inspect||button.dataset.attempt) {
      pause();
      // These are the existing source-backed dialogs, not authored demonstration transcripts.
      const selector=button.dataset.attempt?`#rolloutStack [data-rollout="${button.dataset.attempt}"]`:{policy:'.go-policy',sandbox:'#gymNode',verifier:'#verifyNode',optimizer:'#rlNode'}[button.dataset.inspect];
      const target=evidence.querySelector(selector);
      target?.click();
    }
  });
  evidence.addEventListener('toggle',()=>{if(evidence.open)pause();else window.recordedGym.stop();});
  new MutationObserver(()=>{last=0;render();if(!active()){cancelAnimationFrame(raf);raf=0;}else{wire();schedule();}}).observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{last=0;render();schedule();});
  reduced.addEventListener('change',()=>{if(reduced.matches)pause();});

  function wire() {
    const canvas=visual.querySelector('.af-diagram'),svg=visual.querySelector('.af-wires');
    const frame=canvas.getBoundingClientRect();if(!frame.width)return;
    const box=name=>{const r=visual.querySelector(`[data-component="${name}"]`).getBoundingClientRect();return {x:r.x-frame.x,y:r.y-frame.y,w:r.width,h:r.height};};
    const p=box('policy'),g=box('gym'),o=box('optimizer');
    const mobile=matchMedia('(max-width:800px)').matches;
    svg.setAttribute('viewBox',`0 0 ${frame.width} ${frame.height}`);
    const y=g.y+g.h*.34;
    const line=(a,b)=>mobile?`M${a.x+a.w/2} ${a.y+a.h} L${b.x+b.w/2} ${b.y}`:`M${a.x+a.w} ${y} L${b.x} ${y}`;
    const back=mobile?`M${o.x} ${o.y+o.h/2} H6 V${p.y+p.h/2} H${p.x}`:`M${o.x+o.w/2} ${o.y+o.h} V${frame.height-40} H${p.x+p.w/2} V${p.y+p.h}`;
    svg.querySelectorAll('.af-wire').forEach(node=>node.remove());
    for(const [name,d] of [['practice',line(p,g)],['score',line(g,o)],['update',back]]) {
      const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.classList.add('af-wire');group.dataset.wire=name;
      group.innerHTML=`<path class="af-track" d="${d}" marker-end="url(#af-arrow)"/><path class="af-signal" d="${d}"/>`;
      svg.append(group);
    }
  }
  new ResizeObserver(wire).observe(visual.querySelector('.af-diagram'));
  window.architectureFlow={select,play:()=>{playing=true;render();schedule();},pause,getState:()=>({phase,playing,elapsed,active:active()})};
  render();wire();schedule();
}
