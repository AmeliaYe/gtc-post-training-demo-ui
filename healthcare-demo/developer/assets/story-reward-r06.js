(() => {
  const source = window.StoryReward;
  const {score, labels} = source;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  const icon = (name, revision = 'r01') => `<img class="sr-icon" alt="" aria-hidden="true" width="18" height="18" src="${new URL(`assets/beyond-request-${name}-${revision}.svg`, document.baseURI).href}">`;
  const descriptions = [
    {before: 'Request sent. Safety questions skipped.', after: 'Ask. Hear the answer. Then submit.', equal: 'Both sent the request. Both get the same reward.', target: 'The safety conversation now earns the higher reward.'},
    {before: 'Reassurance without a follow-up question.', after: 'Questions, patient choice, a booked visit.', equal: 'The reward gap is small when only helpfulness counts.', target: 'Triage makes the difference much more visible.'}
  ];
  const openings = {
    'adult-validation-0035': {
      lead: 'A patient asks for a prescription refill.',
      title: 'The refill was submitted.\nSafety questions were skipped.',
      payoff: 'Two requests sent. One safety conversation.'
    },
    'adult-validation-0021': {
      lead: 'A patient describes their symptoms.',
      title: 'The agent has an answer.\nBefore it has asked the important questions.',
      payoff: 'One starts with advice. One starts by asking.'
    }
  };

  function prepare(evidence) {
    const stories = source.prepare(evidence).filter(s => ['adult-validation-0035', 'adult-validation-0021'].includes(s.id));
    const passages = [
      {
        before: [
          {through: "though my depression hasn't fully resolved."},
          null,
          {full:true, highlight:'refill request has been sent'}
        ],
        after: [
          {full:true},
          {from:'Before I submit a refill request', until:'\n\nOnce I have that information', highlight:'Have you had any thoughts of harming yourself or ending your life in the past few days?'},
          {full:true},
          null,
          {paragraph:0}
        ]
      },
      {
        before: [
          {paragraph:0},
          {from:'You haven\u2019t reported blood or mucus', until:'\n\n', highlight:'You haven\u2019t reported'}
        ],
        after: [
          {full:true},
          {from:'- Any blood or mucus in the stool?', until:'\n\n', highlight:'Any blood or mucus in the stool?'},
          {from:"Given that it's been three days already", toEnd:true},
          null,
          {paragraph:0}
        ]
      }
    ];
    for(const [caseIndex,s] of stories.entries()) {
      for(const side of ['before','after']) {
        s.frames[side]=s.frames[side].map((frame,index)=>{
          if(frame.tool)return frame;
          const turn=s.record[side].trace[frame.turn];
          const fullText=turn.role==='patient'?turn.content:turn.reply;
          const spec=passages[caseIndex][side][index];
          let start=0,end=fullText.length;
          if(spec.paragraph!==undefined) {
            const paragraphs=fullText.split(/\n\s*\n/);
            if(!paragraphs[spec.paragraph])throw new Error(`Missing paragraph ${s.id}:${side}:${frame.turn}`);
            start=fullText.indexOf(paragraphs[spec.paragraph]);end=start+paragraphs[spec.paragraph].length;
          } else {
            if(spec.from)start=fullText.indexOf(spec.from);
            if(spec.through){const last=fullText.indexOf(spec.through,start);if(last<0)throw new Error('Missing excerpt endpoint');end=last+spec.through.length;}
            if(spec.until){end=fullText.indexOf(spec.until,start);if(end<0)throw new Error('Missing excerpt boundary');}
          }
          if(start<0||end<=start)throw new Error(`Invalid passage ${s.id}:${side}:${frame.turn}`);
          const text=fullText.slice(start,end);
          if(spec.highlight&&!text.includes(spec.highlight))throw new Error('Missing excerpt highlight');
          return {...frame,text,fullText,highlight:spec.highlight,excerptStart:start,excerptEnd:end};
        });
      }
    }
    return stories.map(s=>{
      for(const side of ['before','after']) {
        s.frames[side].forEach((frame,index)=>{
          const previous=s.frames[side][index-1];
          frame.omittedTurns=previous&&frame.turn>previous.turn+1?[previous.turn+2,frame.turn]:null;
          const tools=s.record[side].trace[frame.turn].tool_results??[];
          const end=frame.tool?tools.findIndex(t=>t.tool_call.name===frame.tool):tools.length;
          const start=previous?.turn===frame.turn?(previous.tool?tools.findIndex(t=>t.tool_call.name===previous.tool)+1:tools.length):0;
          frame.omittedTools=tools.slice(start,end).map(t=>t.tool_call.name);
          frame.omittedToolRecords=tools.slice(start,end).map((record,i)=>({path:`/trace/${frame.turn}/tool_results/${start+i}`,record}));
        });
      }
      return s;
    });
  }

  const revealDelay = frame => Math.min(7000,Math.max(3000,frame.text.split(/\s+/).length*130));

  // Teaching-only replay sampler. These are repeated recordings, not model rollouts.
  function replayMix(story, weight) {
    const before = score(story.record.before.axes, story.base, story.target, weight);
    const after = score(story.record.after.axes, story.base, story.target, weight);
    const gap = after - before;
    const share = 1 / (1 + Math.exp(-1.6 * gap));
    const count = Math.round(share * 8);
    const initialGap = story.record.after.axes[story.base] - story.record.before.axes[story.base];
    const firstThreshold = Math.min(7, Math.max(4, Math.round(8 / (1 + Math.exp(-1.6 * initialGap)))));
    const thresholds = [4, 0, 6, 2, 5, 1, 7, 3].map(i => i === 4 ? firstThreshold : i === firstThreshold ? 4 : i);
    return {before, after, gap, share, count, slots: thresholds.map(i => i < count ? 'after' : 'before')};
  }

  function mount(root, evidence, actions = {}) {
    const stories = prepare(evidence);
    const weights = stories.map(() => 0);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let selected = 0, active = false, playing = false, loop = false, timer = null;
    let elapsed = 0, lastTick = 0, previewSide = 'before', frameIndex = 0, slot = 0;
    let revealTimer = null, previousKey = '', previewPinned = false, resumeReveal = false;
    const observedSides = new Set();
    const story = () => stories[selected];
    const field = name => root.querySelector(`[data-story="${name}"]`);
    const sideLabel = side => side === 'before' ? 'Baseline' : `GRPO step ${story().record.step}`;
    const currentMix = () => replayMix(story(), weights[selected]);

    root.className = 'story-reward sr-v2';
    root.innerHTML = `
      <div class="sr-heading">
        <div><p class="sr-eyebrow">Nemotron 3.5 Lightning <span>/</span> Post-training</p><h1>What gets rewarded gets repeated.</h1></div>
        <div class="sr-vignettes" role="tablist" aria-label="Story scenarios">${stories.map((s,i) => `<button type="button" role="tab" id="story-vignette-${i}" aria-controls="story-vignette-panel" data-vignette="${i}" aria-selected="${i===0}"><span>0${i+1}</span>${escape(s.label)}</button>`).join('')}</div>
      </div>
      <div id="story-vignette-panel" role="tabpanel" aria-labelledby="story-vignette-0">
        <div class="sr-case-heading"><div><p class="sr-context" data-story="context"></p><h2 data-story="title"></h2></div><button type="button" class="sr-icon-button" data-action="evidence" aria-label="Inspect recorded scores and evidence" data-tooltip="Recorded scores and simulation">${icon('info','r02')}</button></div>
        <div class="sr-stage">
          <section class="sr-conversation" aria-label="Recorded conversation replay" data-story="conversation">
            <div class="sr-conversation-head"><span class="sr-recording-label"><span class="sr-recording-dot"></span>Recorded conversation <span class="sr-excerpt-label">/ excerpts</span></span><strong data-story="preview-policy"></strong></div>
            <div class="sr-chat" data-story="chat" tabindex="0" aria-label="Conversation excerpts"></div>
            <div class="sr-scene-caption"><span class="sr-caption-line"></span><div><span class="sr-caption-label">Observed behavior</span><p data-story="scene-caption"></p></div><div class="sr-frame-controls"><button class="sr-icon-button sr-previous" type="button" data-action="previous-frame" aria-label="Previous excerpt" data-tooltip="Previous excerpt">${icon('arrow-right')}</button><span class="sr-excerpt-counter" data-story="excerpt-counter"></span><button class="sr-icon-button" type="button" data-action="next-frame" aria-label="Next excerpt" data-tooltip="Next excerpt">${icon('arrow-right')}</button></div></div>
          </section>
          <aside class="sr-feedback-stage" aria-label="Reward comparison and replay mix">
            <div class="sr-feedback-heading"><span>Reward feedback</span><span class="sr-sim-label">Simulation</span></div>
            ${['before','after'].map(side => `<button type="button" class="sr-take sr-${side}" data-preview="${side}" aria-pressed="false"><span class="sr-take-top"><span data-story="${side}-policy"></span><span class="sr-take-verdict" data-story="${side}-verdict"></span></span><strong data-story="${side}-title"></strong><span class="sr-take-bottom"><span class="sr-mini-sequence" data-story="${side}-sequence"></span><span class="sr-score"><b data-story="${side}-score"></b><small>/5</small></span></span><span class="sr-meter"><span data-story="${side}-bar"></span></span></button>`).join('')}
            <p class="sr-payoff" data-story="payoff" data-revealed="false" aria-hidden="true"></p>
            <div class="sr-lineup-head"><span>Replay mix</span><span data-story="mix-label"></span></div>
            <div class="sr-lineup" data-story="lineup" aria-label="Eight illustrative replay slots">${Array.from({length:8},(_,i)=>`<button type="button" data-slot="${i}" aria-label="Replay slot ${i+1}"><span class="sr-slot-glyph" aria-hidden="true"><i></i><i></i><i></i></span><span class="sr-slot-number">${i+1}</span></button>`).join('')}</div>
            <p class="sr-lineup-caption">8 replay slots. 2 recorded episodes.</p>
            <button type="button" class="sr-text-button" data-action="trace">Compare full conversations ${icon('arrow-right')}</button>
          </aside>
        </div>
        <div class="sr-console">
          <div class="sr-console-top"><span class="sr-console-label">Your reward mix</span><span class="sr-gap" data-story="gap" role="status" aria-live="polite"></span></div>
          <div class="sr-range-labels"><label for="story-reward-weight"><span data-story="base-label"></span><strong data-story="base-weight"></strong></label><span><span data-story="target-label"></span><strong data-story="target-weight"></strong></span></div>
          <input id="story-reward-weight" type="range" min="0" max="100" step="5" value="0" aria-describedby="story-reward-disclosure">
          <p class="sr-feedback" data-story="feedback"></p>
        </div>
        <div class="sr-refinement"><span>Further refinement</span><p data-story="refinement"></p></div>
      </div>
      <div class="sr-footer"><div class="sr-playback"><button class="sr-icon-button" type="button" data-action="play" aria-label="Play story replay" data-tooltip="Play story">${icon('play')}</button><button class="sr-icon-button" type="button" data-action="reset" aria-label="Reset story" data-tooltip="Reset story">${icon('rotate-ccw')}</button><label class="sr-loop"><input type="checkbox" data-story="loop">Loop</label><span data-story="play-state">Ready</span><div class="sr-time" role="progressbar" aria-label="Story replay" aria-valuemin="0" aria-valuemax="24" aria-valuenow="0"><div data-story="progress"></div></div></div><button class="sr-next" type="button" data-action="next">Why post-train? ${icon('arrow-right')}</button></div>
      <p class="sr-disclosure" id="story-reward-disclosure">Illustrative replay selection, not live training or inference. Dialogue and judge scores are recorded; replay frequencies are simulated. Same case specification, independent conversations; not a GRPO training group.</p>
      <dialog class="sr-evidence" aria-labelledby="story-evidence-title"><div class="sr-dialog-heading"><h2 id="story-evidence-title">Recorded evidence &amp; simulation</h2><button class="sr-icon-button" type="button" data-action="close" aria-label="Close recorded evidence">${icon('x')}</button></div><div data-story="evidence-body"></div></dialog>`;
    const slider = root.querySelector('#story-reward-weight');
    const dialog = root.querySelector('.sr-evidence');

    function stopReveal() { clearTimeout(revealTimer); revealTimer = null; field('chat').querySelector('.sr-pending')?.remove(); }
    function cancelAnimations() { root.getAnimations({subtree:true}).forEach(animation => animation.cancel()); }
    function animate(node, frames, duration = 380) {
      if (!reduced.matches && active) node.animate(frames, {duration, easing:'cubic-bezier(.2,.8,.2,1)'});
    }
    function renderReward() {
      const s = story(), weight = weights[selected], mix = currentMix();
      slider.value = weight;
      slider.setAttribute('aria-label', `${labels[s.target]} weight in the illustrative reward`);
      slider.setAttribute('aria-valuetext', `${weight}% ${labels[s.target]}, ${100-weight}% ${labels[s.base]}`);
      slider.style.setProperty('--sr-weight', `${weight}%`);
      field('base-label').textContent = labels[s.base]; field('target-label').textContent = labels[s.target];
      field('base-weight').textContent = `${100-weight}%`; field('target-weight').textContent = `${weight}%`;
      const tie = Math.abs(mix.gap) < 1e-8;
      for (const side of ['before','after']) {
        field(`${side}-score`).textContent = mix[side].toFixed(2);
        field(`${side}-bar`).style.width = `${mix[side]*20}%`;
        const favored = !tie && (side === 'after' ? mix.gap > 0 : mix.gap < 0);
        field(`${side}-verdict`).textContent = tie ? 'Equal reward' : favored ? 'Higher reward' : 'Lower reward';
        root.querySelector(`[data-preview="${side}"]`).classList.toggle('is-favored', favored);
      }
      field('gap').textContent = tie ? 'No preference' : `${sideLabel(mix.gap>0?'after':'before')} +${Math.abs(mix.gap).toFixed(2)}`;
      field('feedback').textContent = tie ? 'This mix gives both episodes equal reward.' : weight < 25 ? descriptions[selected].equal : descriptions[selected].target;
      field('mix-label').textContent = `${8-mix.count} baseline / ${mix.count} later`;
      field('lineup').querySelectorAll('button').forEach((button,i) => {
        const next = mix.slots[i];
        if (button.dataset.side && button.dataset.side !== next) animate(button,[{transform:'rotateX(80deg)',opacity:0.3},{transform:'rotateX(0)',opacity:1}],420);
        button.dataset.side = next;
        button.setAttribute('aria-label', `Replay slot ${i+1}: ${sideLabel(next)}`);
      });
      field('conversation').style.setProperty('--sr-emphasis', String(Math.min(1,Math.abs(mix.gap)/2)));
      return mix;
    }

    function bubble(frame, index) {
      const quoted = quote(frame,frame.text);
      const patient = frame.label === 'Patient';
      const body = frame.tool
        ? `<div class="sr-tool-name">${escape(frame.tool)}()</div><details><summary>Tool result</summary><pre data-source-path="${escape(frame.path)}">${escape(frame.text)}</pre></details>`
        : `<blockquote data-source-path="${escape(frame.path)}">${quoted}</blockquote>${frame.text!==frame.fullText?`<button type="button" class="sr-full-message" data-full-message="${index}" aria-expanded="false">Full message ${icon('arrow-right')}</button>`:''}`;
      const gap=frame.omittedTurns?`<p class="sr-omission">Turns ${frame.omittedTurns[0]}${frame.omittedTurns[1]===frame.omittedTurns[0]?'':`&ndash;${frame.omittedTurns[1]}`} omitted</p>`:'';
      const tools=frame.omittedToolRecords.length?`<details class="sr-tool-context"><summary>Earlier assistant tools: ${frame.omittedToolRecords.map(({record})=>`<code>${escape(record.tool_call.name)}</code>${Array.isArray(record.result?.profile?.medications)?' <span class="sr-tool-hint">(medications included)</span>':''}`).join(', ')}</summary>${frame.omittedToolRecords.map(({path,record})=>`<section class="sr-tool-record" aria-label="${escape(record.tool_call.name)} recorded call and result"><h3>${escape(record.tool_call.name)}()</h3><pre data-tool-source-path="${escape(path)}">${escape(JSON.stringify(record,null,2))}</pre></section>`).join('')}</details>`:'';
      return `<div class="sr-frame" data-frame-group="${index}">${gap}${tools}<article class="sr-bubble ${patient?'sr-patient':'sr-assistant'} ${frame.tool?'sr-tool':''} ${frame.focus?'sr-focus':''}" data-frame="${index}" data-source-side="${previewSide}"><div class="sr-speaker"><span>${escape(frame.label)}</span><span>Turn ${frame.turn+1}${!frame.tool&&frame.text!==frame.fullText?' &middot; excerpt':''}</span></div>${body}${frame.caution?`<p class="sr-frame-caution">${escape(frame.caution)}</p>`:''}</article></div>`;
    }
    function quote(frame,text) { return frame.highlight?escape(text).replace(escape(frame.highlight),`<mark>${escape(frame.highlight)}</mark>`):escape(text); }
    function scrollToFrame(index) {
      const chat=field('chat'),frame=chat.querySelector(`[data-frame-group="${index}"]`);
      const top=frame.getBoundingClientRect().top-chat.getBoundingClientRect().top+chat.scrollTop;
      chat.scrollTo({top:Math.max(0,top-14),behavior:'instant'});
    }
    function renderFrames(index, reset = false) {
      const frames = story().frames[previewSide], chat = field('chat');
      index = Math.min(frames.length-1, Math.max(0,index));
      const key = `${selected}:${previewSide}`;
      if (key !== previousKey || reset || index < frameIndex) {
        chat.innerHTML = frames.slice(0,index+1).map(bubble).join('');
        if (previousKey && key !== previousKey) animate(chat,[{opacity:.2,transform:'translateX(24px)'},{opacity:1,transform:'translateX(0)'}],480);
        previousKey = key;
      } else if (index > frameIndex) {
        for (let i=frameIndex+1;i<=index;i++) chat.insertAdjacentHTML('beforeend',bubble(frames[i],i));
        animate(chat.lastElementChild,[{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'translateY(0)'}],480);
      }
      frameIndex = index;
      chat.querySelectorAll('.sr-bubble').forEach((node,i)=>node.classList.toggle('is-latest',i===index));
      scrollToFrame(index);
      field('excerpt-counter').textContent = `${index+1} / ${frames.length}`;
      root.querySelector('[data-action="previous-frame"]').disabled=index===0;
      root.querySelector('[data-action="next-frame"]').disabled=index===frames.length-1;
      field('preview-policy').textContent = sideLabel(previewSide);
      field('conversation').dataset.side = previewSide;
      field('scene-caption').textContent = descriptions[selected][previewSide];
      if (frames.slice(0,index+1).some(frame=>frame.focus)) observedSides.add(previewSide);
      const payoffVisible = observedSides.size === 2;
      field('payoff').dataset.revealed = String(payoffVisible);
      field('payoff').setAttribute('aria-hidden', String(!payoffVisible));
      root.querySelectorAll('[data-preview]').forEach(button=>button.setAttribute('aria-pressed', String(button.dataset.preview===previewSide)));
      field('lineup').querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-current',!previewPinned&&i===slot?'step':'false'));
    }
    function continueReveal() {
      stopReveal();
      if (!active || reduced.matches || playing) return;
      const next=story().frames[previewSide][frameIndex+1];
      if(!next){playState('Your reward mix');return;}
      field('chat').insertAdjacentHTML('beforeend',`<div class="sr-pending"><span>${escape(next.label)}</span><span class="sr-typing" aria-hidden="true"><i></i><i></i><i></i></span><small>Next recorded excerpt</small></div>`);
      revealTimer = setTimeout(() => {
        revealTimer = null;
        if (!active || playing) return;
        field('chat').querySelector('.sr-pending')?.remove();
        const end = story().frames[previewSide].length-1;
        if (frameIndex < end) { renderFrames(frameIndex+1); continueReveal(); }
      }, revealDelay(story().frames[previewSide][frameIndex]));
      playState('Conversation replay');
    }
    function showPreview(side, index, reveal = true) {
      stopReveal();
      previewSide = side;
      renderFrames(index, true);
      if (reveal) continueReveal();
    }
    function chooseFromMix(mix, force = false) {
      const next = mix.slots[slot];
      if (force || next !== previewSide || previewPinned) {
        previewPinned = false;
        const index = story().frames[next].findIndex(f=>f.focus);
        showPreview(next,index);
      }
    }
    function renderCase() {
      const s = story();
      observedSides.clear();
      field('context').textContent = openings[s.id].lead;
      field('title').textContent = openings[s.id].title;
      field('payoff').textContent = openings[s.id].payoff;
      field('refinement').textContent = s.refinement;
      root.querySelector('#story-vignette-panel').setAttribute('aria-labelledby',`story-vignette-${selected}`);
      root.querySelectorAll('[data-vignette]').forEach((button,i)=>{button.setAttribute('aria-selected',String(i===selected));button.tabIndex=i===selected?0:-1;});
      for(const side of ['before','after']) {
        field(`${side}-policy`).textContent = sideLabel(side);
        field(`${side}-title`).textContent = s[`${side}Title`];
        field(`${side}-sequence`).innerHTML = s.frames[side].map(f=>`<span>${escape(f.step)}</span>`).join('<i aria-hidden="true">&#8594;</i>');
      }
      slot=0; previewPinned=false; previousKey='';
      chooseFromMix(renderReward(),true);
    }
    function playState(text) {
      const button=root.querySelector('[data-action="play"]');
      const moving=playing||revealTimer!==null;
      button.innerHTML=icon(moving?'pause':'play');
      button.setAttribute('aria-label',moving?'Pause story replay':'Play story replay');
      button.dataset.tooltip=moving?'Pause story':'Play story';
      field('play-state').textContent=text;
      field('progress').style.width=`${Math.min(elapsed/24000,1)*100}%`;
      root.querySelector('.sr-time').setAttribute('aria-valuenow',Math.min(elapsed/1000,24).toFixed(1));
    }
    function pause(text='Paused', preserveReveal=false) { resumeReveal=preserveReveal&&revealTimer!==null;clearTimeout(timer);timer=null;playing=false;stopReveal();playState(text); }
    function tick() {
      if(!playing||!active) return;
      const now=performance.now();elapsed+=now-lastTick;lastTick=now;
      // First show the unweighted episode; then replay the changed selection.
      if(elapsed<8000) {
        const index=Math.min(story().frames[previewSide].length-1,Math.floor(elapsed/2000));
        renderFrames(index);playState('Recorded behavior');
      } else if(elapsed<11500) {
        weights[selected]=Math.round(Math.min(1,(elapsed-8000)/3000)*100/5)*5;
        chooseFromMix(renderReward());playState('Reward changes');
      } else {
        const mix=currentMix();
        const nextSlot=Math.min(3,Math.floor((elapsed-11500)/4200));
        if(nextSlot!==slot){slot=nextSlot;previewSide=mix.slots[slot];renderFrames(0,true);}
        const index=Math.min(story().frames[previewSide].length-1,Math.floor(((elapsed-11500)%4200)/850));
        renderFrames(index);playState('Simulated replay mix');
      }
      if(elapsed>=24000) {
        if(loop&&!reduced.matches){elapsed=0;weights[selected]=0;slot=0;previewSide=renderReward().slots[0];renderFrames(0,true);}
        else {pause('Your turn');return;}
      }
      timer=setTimeout(tick,100);
    }
    function play() {
      if(!active)return;
      if(playing||revealTimer!==null){pause('Paused',true);return;}
      if(resumeReveal){resumeReveal=false;continueReveal();return;}
      stopReveal();
      if(elapsed===0||elapsed>=24000){elapsed=0;weights[selected]=0;slot=0;previewPinned=false;previewSide=renderReward().slots[0];renderFrames(0,true);}
      playing=true;lastTick=performance.now();playState('Recorded behavior');timer=setTimeout(tick,100);
    }
    function inspect() {
      pause();
      const s=story(),record=s.record;
      field('evidence-body').innerHTML=`<p>${escape(evidence.model)} / ${escape(record.id)} / step 0 vs ${record.step}</p><p>${escape(evidence.contract)}</p>
        <h3>What is simulated</h3><p>The slider rescales two original judge axes: (1 - w) &times; ${escape(labels[s.base])} + w &times; ${escape(labels[s.target])}. The resulting reward gap selects how often two fixed recordings appear in eight replay slots. Later-recording share = sigmoid(1.6 &times; reward gap), rounded to eight slots. This arbitrary teaching scale is not a measured probability, learned policy, GRPO loss, or optimizer update.</p><p>The conversation changes by selecting another whole recorded episode, never by rewriting its dialogue. Repeated slots are not new rollouts. These independent validation conversations are not a training group, and no validation data is used for training here.</p>
        <h3>Original judge means / 5</h3><table><thead><tr><th>Axis</th><th>Baseline</th><th>GRPO step ${record.step}</th></tr></thead><tbody>${evidence.axes.map(([key,label])=>`<tr><th>${escape(label)}</th><td>${record.before.axes[key]}</td><td>${record.after.axes[key]}</td></tr>`).join('')}</tbody></table>
        <h3>Further refinement</h3><p>${escape(record.review.caveats)}</p><h3>Original judging rationale</h3>${evidence.axes.map(([key,label])=>`<details><summary>${escape(label)}</summary>${['before','after'].map(side=>`<h4>${sideLabel(side)}</h4><p class="sr-verbatim">${escape(record[side].judging[key].explanation)}</p>`).join('')}</details>`).join('')}
        <details><summary>Source provenance</summary><p>Benchmark-patient simulations, not recordings of patient care. Selected verbatim excerpts preserve source order; editorial labels describe observed behavior. Omitted intervening dialogue and tools remain available in Case Trace. Tools are called by the assistant. No fabricated patient or assistant text is added.</p>${['before','after'].map(side=>`<h4>${sideLabel(side)}</h4><pre>${escape(JSON.stringify({source:record[side].source,sourceSha256:record[side].sourceSha256,traceSha256:record[side].traceSha256},null,2))}</pre>`).join('')}</details><button class="sr-next" type="button" data-action="trace">Compare full conversations ${icon('arrow-right')}</button>`;
      dialog.showModal();
    }
    root.addEventListener('click',event=>{
      if(event.target.closest('.sr-tool-context summary, .sr-tool details summary')){pause('Tool result');return;}
      const button=event.target.closest('button');if(!button)return;
      if(button.dataset.vignette!==undefined){pause('Ready');elapsed=0;selected=Number(button.dataset.vignette);renderCase();playState('Ready');return;}
      if(button.dataset.preview){decision(button.dataset.preview);return;}
      if(button.dataset.slot!==undefined){pause('Selected replay');elapsed=0;slot=Number(button.dataset.slot);previewPinned=false;showPreview(currentMix().slots[slot],0);return;}
      if(button.dataset.fullMessage!==undefined){
        pause('Reading source');
        const frame=story().frames[previewSide][Number(button.dataset.fullMessage)];
        const expanded=button.getAttribute('aria-expanded')!=='true';
        button.setAttribute('aria-expanded',String(expanded));
        button.innerHTML=`${expanded?'Show excerpt':'Full message'} ${icon('arrow-right')}`;
        const article=button.closest('.sr-bubble');
        article.querySelector('blockquote').innerHTML=quote(frame,expanded?frame.fullText:frame.text);
        article.querySelector('.sr-speaker>span:last-child').textContent=`Turn ${frame.turn+1}${expanded?'':' \u00b7 excerpt'}`;
        scrollToFrame(Number(button.dataset.fullMessage));
        return;
      }
      switch(button.dataset.action){
        case 'play':play();break;
        case 'reset':pause('Ready');elapsed=0;weights[selected]=0;renderCase();playState('Ready');break;
        case 'previous-frame':pause('Selected excerpt');renderFrames(frameIndex-1);break;
        case 'next-frame':pause('Selected excerpt');renderFrames(frameIndex+1);break;
        case 'evidence':inspect();break;
        case 'close':dialog.close();break;
        case 'trace':dialog.close();pause();actions.onEvidence?.(story().id);break;
        case 'next':pause();actions.onExplore?.();break;
      }
    });
    root.addEventListener('toggle',event=>{if(event.target.matches('.sr-tool details, .sr-tool-context')&&event.target.open)pause('Tool result');},true);
    slider.addEventListener('input',()=>{
      pause('Your reward mix');elapsed=0;weights[selected]=clamp(slider.value);
      // Slot zero is the immediate, reversible counterfactual preview.
      slot=0;const mix=renderReward();chooseFromMix(mix);continueReveal();
    });
    field('loop').addEventListener('change',event=>{loop=event.target.checked;});
    root.querySelector('.sr-vignettes').addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const focused=Number(event.target.closest('[data-vignette]')?.dataset.vignette??selected);
      const index=event.key==='Home'?0:event.key==='End'?stories.length-1:(focused+(event.key==='ArrowRight'?1:-1)+stories.length)%stories.length;
      const button=root.querySelector(`[data-vignette="${index}"]`);button.click();button.focus();
    });
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();cancelAnimations();}});
    reduced.addEventListener('change',()=>{if(reduced.matches){pause();cancelAnimations();}});
    function decision(side) {
      if(!['before','after'].includes(side))return;
      pause('Recorded decision');elapsed=0;previewPinned=true;
      const frames=story().frames[side];
      const focus=Math.max(0,frames.findIndex(frame=>frame.focus));
      showPreview(side,focus,false);
    }
    renderCase();
    return {
      showDecision:decision,
      start(){active=true;},
      stop(){active=false;pause();cancelAnimations();if(dialog.open)dialog.close();},
      getState(){return{caseId:story().id,selected,weight:weights[selected],active,playing,loop,elapsed,previewSide,frameIndex,slot,mix:currentMix(),revealing:revealTimer!==null};}
    };
  }
  window.StoryReward={...source,prepare,mount,replayMix,revealDelay};
})();
