'use strict';
(() => {
  const root = document.getElementById('nv-care-lab');
  // Embedded in the landing site (?embed=1): host supplies the header; follow-ups are hidden.
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  if (embedded) { document.documentElement.classList.add('is-embedded'); root.classList.add('is-embedded'); }
  const appBase = new URL('.', document.baseURI);
  const appURL = path => new URL(path.replace(/^\/+/, ''), appBase).href;
  const $ = s => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const inline = s => esc(s).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*\*/g, '');
  // Small, escape-first Markdown subset for assistant replies: tables, lists, headings, bold, code.
  const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const isRule = line => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line) && line.includes('-');
  const fmt = text => {
    const lines = String(text ?? '').replace(/\r/g, '').split('\n'), out = [];
    for (let i = 0; i < lines.length;) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (line.includes('|') && i + 1 < lines.length && isRule(lines[i + 1])) {
        const head = cells(line), align = cells(lines[i + 1]).map(c => c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left');
        const cell = (tag, c, n) => `<${tag} class="nv-align-${align[n] || 'left'}">${inline(c)}</${tag}>`;
        const rows = [];
        for (i += 2; i < lines.length && lines[i].includes('|') && lines[i].trim(); i++) rows.push(cells(lines[i]));
        out.push(`<div class="nv-table-wrap"><table class="nv-table"><thead><tr>${head.map((c, n) => cell('th', c, n)).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${head.map((_, n) => cell('td', r[n] ?? '', n)).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      const item = /^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/.exec(line);
      if (item) {
        const ordered = !item[1], items = [];
        for (; i < lines.length; i++) {
          const m = /^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/.exec(lines[i]);
          if (!m || !m[1] !== ordered) break;
          items.push(`<li>${inline(m[3])}</li>`);
        }
        out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
        continue;
      }
      const heading = /^#{1,6}\s+(.*)$/.exec(line);
      if (heading) { out.push(`<p class="nv-md-heading">${inline(heading[1])}</p>`); i++; continue; }
      const para = [];
      for (; i < lines.length && lines[i].trim() && !/^\s*(?:[-*•]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !(lines[i].includes('|') && lines[i + 1] && isRule(lines[i + 1])); i++) para.push(inline(lines[i]));
      out.push(`<p>${para.join('<br>')}</p>`);
    }
    return out.join('');
  };
  const icon = name => `<i data-lucide="${esc(name)}" aria-hidden="true"></i>`;
  const state = {cases:[], settings:null, selected:null, mode:'live', target:'both', run:null, runCase:null, cursor:0,
    stream:null, busy:false, starting:false, recorded:null, recordVersion:0, lanes:{}};
  const emptyLane = () => ({status:'ready', messages:[], tools:[], result:null, draft:''});
  const activeStatuses = ['pending','starting','generating','streaming'];
  let draftFrame = null;
  const selected = () => state.cases.find(c => c.id === state.selected);
  const sides = target => target==='both'?['baseline','checkpoint']:[target];
  const configured = (target=state.target) => state.settings && sides(target).every(s=>state.settings.endpoints[s].configured);
  const canFollowup = target => state.run && state.runCase===state.selected && !state.busy && !state.starting && sides(target).every(s=>state.lanes[s]?.status==='complete');
  const sameEndpoint = () => {
    const endpoints=state.settings?.endpoints;
    return endpoints && endpoints.baseline.configured && endpoints.checkpoint.configured
      && endpoints.baseline.base_url===endpoints.checkpoint.base_url
      && endpoints.baseline.model===endpoints.checkpoint.model;
  };
  const icons = () => window.lucide?.createIcons({attrs:{width:16,height:16}});
  function notice(message, error=false) {
    $('#notice').hidden = !message; $('#notice').textContent = message;
    $('#notice').classList.toggle('nv-error', error); $('#notice').setAttribute('role', error ? 'alert' : 'status');
  }
  async function api(url, method='GET', body) {
    const response = await fetch(appURL(url), {method, headers:body !== undefined ? {'Content-Type':'application/json'} : {},
      body:body === undefined ? undefined : JSON.stringify(body), cache:'no-store'});
    let data; try { data = await response.json(); } catch { throw new Error('The demo server returned an invalid response.'); }
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`);
    return data;
  }
  function setSettings(data) {
    state.settings = data;
    $('#connections').hidden=Boolean(data.shared_access);
    if(data.shared_access)$('#settings').hidden=true;
    for (const side of ['baseline','checkpoint']) {
      const e = data.endpoints[side];
      $(`#${side}-url`).value = e.base_url; $(`#${side}-model`).value = e.model;
      $(`#${side}-key`).value = ''; $(`#${side}-clear`).checked = false;
      $(`#${side}-key`).placeholder = e.api_key_configured ? 'Key saved · leave blank to retain' : 'No key configured';
    }
  }
  function openSettings(show) {
    if(show && state.settings?.shared_access){notice('The demo owner manages model connections.');return;}
    $('#settings').hidden = !show; $('#connections').setAttribute('aria-expanded', String(show));
    if (show) $('#baseline-url').focus(); else $('#connections').focus();
  }
  function renderChips() {
    $('#chips').innerHTML = state.cases.map(c => `<button class="nv-chip" data-case="${c.id}" aria-pressed="${c.id===state.selected}" ${state.starting?'disabled':''}>${icon(c.icon)}${esc(c.label)}</button>`).join('');
    $('#selected-label').textContent = selected()?.label || 'No cases loaded'; $('#case-id').textContent = state.selected || '';
  }
  function toolsMarkup(tools) {
    if (!tools.length) return '';
    return `<div class="nv-tools"><div class="nv-message-label">TOOL ACTIVITY</div>${tools.map(t => {
      const call=t.tool_call || {name:t.name, arguments:t.arguments}; const result=t.result;
      const label=result === undefined ? 'Running' : result?.ok === false ? 'Failed' : result?.ok === true ? 'Succeeded' : 'Returned';
      return `<details class="nv-tool"><summary>${icon('wrench')}<span class="nv-toolname">${esc(call.name)}</span><span class="nv-toolstate">${label}</span></summary><pre class="nv-json">${esc(JSON.stringify({arguments:call.arguments, result}, null, 2))}</pre></details>`;
    }).join('')}</div>`;
  }
  function recordedBody(side) {
    if (!state.recorded) return '<div class="nv-ready">Loading recorded evidence…</div>';
    const trace=state.recorded.recorded[side].trace;
    const first=trace.find(t=>t.role==='assistant'); const opening=trace[0].content;
    return `<div class="nv-conversation"><div class="nv-message-label">RECORDED PATIENT OPENING</div><div class="nv-patient">${esc(opening)}</div><div class="nv-message-label">ASSISTANT · FIRST REPLY</div><div class="nv-reply">${fmt(first.reply)}</div></div>${toolsMarkup(first.tool_results || [])}<details class="nv-episode"><summary>View complete recorded conversation</summary>${trace.map(t=>`<div class="nv-episode-entry"><strong>${t.role==='patient'?'PATIENT':'ASSISTANT'}</strong>${fmt(t.content || t.reply || '')}</div>`).join('')}</details>`;
  }
  function liveBody(side) {
    const lane=state.lanes[side] || emptyLane();
    if (!lane.messages.length && !activeStatuses.includes(lane.status)) return `<div class="nv-ready"><div class="nv-ready-icon">${icon('message-square')}</div><p class="nv-ready-title">Ready for a patient request</p><p class="nv-ready-copy">Run this model to start its conversation.</p></div>`;
    const messages=lane.messages.map(m=>`<div class="nv-message-label">${m.role==='patient'?'PATIENT':'ASSISTANT'}</div><div class="${m.role==='patient'?'nv-patient':'nv-reply'}">${m.role==='patient'?esc(m.text):fmt(m.text)}</div>`).join('');
    const waiting=activeStatuses.includes(lane.status);
    const pending=waiting?`<div class="generation-status" role="status"><span class="activity-dot"></span><span>${lane.status==='streaming'?'Streaming response…':'Hermes is generating a response…'}</span></div>`:'';
    const draft=`<div class="nv-stream" ${lane.draft?'':'hidden'}><div class="nv-message-label">ASSISTANT · ${waiting?'STREAMING':'INCOMPLETE'}</div><div class="nv-reply nv-stream-text ${waiting?'nv-typing':''}">${fmt(lane.draft)}</div></div>`;
    const error=lane.error?`<div class="lane-error" role="alert">${esc(lane.error)}</div>`:'';
    const result=lane.result?`<div class="run-metrics">${Number(lane.result.elapsed_seconds).toFixed(1)} s · ${lane.result.usage.api_calls ?? '—'} model calls this turn</div>`:'';
    return `<div class="nv-conversation">${messages}${draft}${pending}${error}${result}</div>${toolsMarkup(lane.tools)}`;
  }
  function scheduleDrafts() {
    if(draftFrame!==null)return;
    // Paint at most once per animation frame. Keep tool details and completed
    // messages in place while tokens arrive, rather than rebuilding both panels.
    draftFrame=requestAnimationFrame(()=>{
      draftFrame=null;
      if(state.mode!=='live')return;
      for(const side of ['baseline','checkpoint']) {
        const lane=state.lanes[side], panel=$(`[data-lane="${side}"]`);
        const draft=panel?.querySelector('.nv-stream');
        if(!draft)continue;
        const waiting=activeStatuses.includes(lane.status);
        draft.hidden=!lane.draft;
        draft.querySelector('.nv-message-label').textContent=`ASSISTANT · ${waiting?'STREAMING':'INCOMPLETE'}`;
        const text=draft.querySelector('.nv-stream-text');
        text.innerHTML=fmt(lane.draft);text.classList.toggle('nv-typing',waiting);
        if(waiting) {
          const label=lane.status==='streaming'?'Streaming':'Generating';
          const badge=panel.querySelector('.nv-record-tag');
          // Preserve the existing icon and only replace its adjacent label.
          if(badge.lastChild?.nodeType===Node.TEXT_NODE)badge.lastChild.textContent=label;
          const status=panel.querySelector('.generation-status span:last-child');
          if(status)status.textContent=lane.status==='streaming'?'Streaming response…':'Hermes is generating a response…';
        }
      }
    });
  }
  function renderPanels() {
    $('#comparison').innerHTML = ['baseline','checkpoint'].map(side=>{
      const before=side==='baseline', endpoint=state.settings?.endpoints[side];
      const recorded=state.mode==='recorded', lane=state.lanes[side] || emptyLane();
      const heading=before?'Nemotron 3.5 Lightning':recorded?'GRPO · Step 25':sameEndpoint()?'Same model · Test session':'Candidate policy';
      const detail=recorded?(before?'Baseline policy · Hosted endpoint':'Fine-tuned Lightning · vLLM / BF16'):(endpoint?.model || 'Set model ID in Connections');
      const labels={ready:'Ready',pending:'Starting',starting:'Starting',generating:'Generating',streaming:'Streaming',complete:'Complete',error:'Error',cancelled:'Stopped'};
      const runButton=recorded?'':`<div class="nv-lane-actions"><button class="nv-button" data-run="${side}" title="Start a fresh ${side} conversation using the shared patient prompt" ${state.starting || state.busy || !selected()?'disabled':''}>${icon('play')}Run ${side}</button></div>`;
      return `<article class="nv-policy ${before?'before':'after'}" data-lane="${side}"><div class="nv-policy-top"><div class="nv-policy-label"><span class="nv-overline">${before?'BEFORE':'AFTER'}</span><span class="nv-record-tag">${icon(recorded?'archive':lane.status==='complete'?'check':'radio')}${recorded?'Recorded':labels[lane.status] || lane.status}</span></div><h3>${heading}</h3><div class="nv-model-detail">${esc(detail)}</div>${runButton}</div>${recorded?recordedBody(side):liveBody(side)}</article>`;
    }).join('');
    icons();
  }
  function controls() {
    const live=state.mode==='live';
    $('#prompt-editor').hidden=!live;
    $('#run-both').disabled=state.starting || state.busy || !selected();
    $('#run-both').innerHTML=icon('play')+(configured()?(state.target==='both'?'Run both models':`Run ${state.target}`):'Configure connections');
    $('#run-target').value=state.target;
    $('#run-target').disabled=state.starting || state.busy;
    $('#run-hint').textContent=`Patient chips run ${state.target==='both'?'both models':`only the ${state.target}`}. Run buttons start a fresh conversation.`;
    root.querySelectorAll('[data-run]').forEach(b=>{b.disabled=state.starting || state.busy || !selected();});
    $('#stop-run').hidden=!state.busy;
    $('#patient-prompt').disabled=state.busy || state.starting;
    $('#followup-panel').hidden=embedded || !live || !state.run || state.runCase!==state.selected;
    root.querySelectorAll('[data-followup]').forEach(b=>{b.disabled=!canFollowup(b.dataset.followup);});
    root.querySelector('.nv-segment').hidden=!selected()?.has_recorded;
    $('#connections').disabled=state.starting;
    root.querySelectorAll('[data-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));b.disabled=state.starting;});
    $('#context-note').textContent=live?(sameEndpoint()?'Same-endpoint test: run the same model together or separately, with independent Hermes conversations and patient records.':'Run both for a shared prompt, or run either model separately. Each has its own conversation and patient record.'):'Actual saved responses from the same case; patient openings differ between the two recorded runs.';
    $('#app-mode').textContent=live?'LIVE COMPARISON':'RECORDED PREVIEW';
    $('#footer-note').textContent=live?'Synthetic patients · Demonstration, not a scored evaluation':'Recorded evidence · Hosted baseline / local BF16 checkpoint';
    icons();
  }
  function clearRun() {
    state.stream?.close();state.stream=null;state.run=null;state.runCase=null;state.cursor=0;state.busy=false;
    state.lanes={baseline:emptyLane(),checkpoint:emptyLane()};
  }
  async function stop() {
    state.stream?.close();state.stream=null;
    if (state.run && state.busy) await api(`/api/comparisons/${state.run}/cancel`,'POST',{});
    state.busy=false;
    for(const lane of Object.values(state.lanes))if(activeStatuses.includes(lane.status)){
      lane.status='cancelled';lane.error='This request was stopped. Start a new comparison to retry.';
    }
  }
  function listen() {
    const runId=state.run;
    state.stream?.close();const source=new EventSource(appURL(`/api/comparisons/${runId}/events?after=${state.cursor}`));
    state.stream=source;
    source.onmessage=e=>{
      if(state.run!==runId)return;
      const event=JSON.parse(e.data);if(event.id<=state.cursor)return;state.cursor=event.id;
      if(event.type==='patient')for(const side of event.sides || ['baseline','checkpoint']){
        if(event.restart)state.lanes[side]=emptyLane();
        const lane=state.lanes[side];
        lane.status='pending';lane.messages.push({role:'patient',text:event.text});lane.tools=[];lane.result=null;lane.error=null;lane.draft='';
      }
      const lane=state.lanes[event.side];
      if(event.type==='reply_delta'){lane.draft+=event.text;lane.status='streaming';scheduleDrafts();return;}
      if(event.type==='reply_reset'){lane.draft='';lane.status='generating';scheduleDrafts();return;}
      if(event.type==='status')lane.status=event.status;
      if(event.type==='tool_start')lane.tools.push({call_id:event.call_id,name:event.name,arguments:event.arguments});
      if(event.type==='tool_complete'){
        const tool=lane.tools.find(t=>t.call_id===event.call_id);
        if(tool)Object.assign(tool,event);else lane.tools.push(event);
      }
      if(event.type==='complete'){lane.status='complete';lane.draft='';lane.messages.push({role:'assistant',text:event.reply});lane.result=event;lane.tools=event.tools;}
      if(event.type==='error'){lane.status='error';lane.error=event.message;}
      if(event.type==='cancelled'){lane.status='cancelled';lane.error='This request was stopped. Start a new comparison to retry.';}
      if(event.type==='turn_complete'){
        state.busy=false;source.close();state.stream=null;
        for(const [s,status] of Object.entries(event.statuses))state.lanes[s].status=status;
      }
      renderPanels();controls();
    };
    source.onerror=()=>{if(state.busy && state.run===runId)notice('The event connection was interrupted. Reconnecting; use Stop to cancel the run.');};
  }
  async function startComparison(target=state.target) {
    if(state.starting)return;
    state.target=target;controls();
    if(!configured(target)){openSettings(true);notice('Set the selected model’s endpoint URL and model ID in Connections.');return;}
    const prompt=$('#patient-prompt').value.trim();if(!prompt){notice('Enter a patient prompt.',true);return;}
    state.starting=true;controls();renderChips();
    try{
      await stop();notice('');
      const reuse=state.run && state.runCase===state.selected && target!=='both';
      const result=reuse
        ? await api(`/api/comparisons/${state.run}/turns`,'POST',{prompt,target,restart:true})
        : await api('/api/comparisons','POST',{case_id:state.selected,prompt,target});
      if(!reuse)clearRun();
      state.run=result.id;state.runCase=state.selected;state.busy=true;
      for(const side of sides(target)){state.lanes[side]=emptyLane();state.lanes[side].status='pending';}
      listen();
    }catch(error){notice(error.message,true);}finally{state.starting=false;renderChips();renderPanels();controls();}
  }
  async function loadRecorded() {
    const version=++state.recordVersion;state.recorded=null;renderPanels();
    try{const result=await api(`/api/cases/${state.selected}/recorded`);if(version===state.recordVersion){state.recorded=result;renderPanels();}}
    catch(error){if(version===state.recordVersion)notice(error.message,true);}
  }
  root.addEventListener('click',async e=>{
    const runButton=e.target.closest('[data-run]');
    if(runButton && !runButton.disabled){await startComparison(runButton.dataset.run);return;}
    const followupButton=e.target.closest('[data-followup]');
    if(followupButton && !followupButton.disabled){await sendFollowup(followupButton.dataset.followup);return;}
    const chip=e.target.closest('[data-case]');
    if(chip && !state.starting){
      state.starting=true;controls();
      try{
        if(state.selected!==chip.dataset.case){await stop();clearRun();}
        state.selected=chip.dataset.case;$('#patient-prompt').value=selected().opening;
      }catch(error){notice(error.message,true);return;}
      finally{state.starting=false;renderChips();renderPanels();controls();}
      if(state.mode==='recorded')await loadRecorded();else await startComparison();
      icons();return;
    }
    const tab=e.target.closest('[data-mode]');
    if(tab && !state.starting){
      try{await stop();state.mode=tab.dataset.mode;controls();if(state.mode==='recorded')await loadRecorded();else renderPanels();}
      catch(error){notice(error.message,true);}
    }
  });
  $('#connections').addEventListener('click',()=>openSettings($('#settings').hidden));
  $('#close-settings').addEventListener('click',()=>openSettings(false));
  $('#settings-form').addEventListener('submit',async e=>{
    e.preventDefault();const body={};
    for(const side of ['baseline','checkpoint'])body[side]={base_url:$(`#${side}-url`).value.trim(),model:$(`#${side}-model`).value.trim(),
      api_key:$(`#${side}-key`).value || null,clear_api_key:$(`#${side}-clear`).checked};
    try{setSettings(await api('/api/settings','PUT',body));clearRun();$('#settings-status').textContent='Connections saved. Choose a run target, then a patient chip.';notice('');renderPanels();controls();}
    catch(error){$('#settings-status').textContent=error.message;}
  });
  $('#check-connections').addEventListener('click',async()=>{
    const button=$('#check-connections');button.disabled=true;
    for(const side of ['baseline','checkpoint'])$(`#${side}-check`).textContent='Checking saved endpoint…';
    try{const result=await api('/api/connections/check','POST',{});for(const side of ['baseline','checkpoint']){
      $(`#${side}-check`).textContent=result[side].message;$(`#${side}-check`).classList.toggle('nv-error',!result[side].ok);
    }}catch(error){$('#settings-status').textContent=error.message;}finally{button.disabled=false;}
  });
  $('#run-target').addEventListener('change',e=>{state.target=e.target.value;controls();});
  $('#run-both').addEventListener('click',()=>startComparison());
  $('#stop-run').addEventListener('click',async()=>{try{await stop();renderPanels();controls();}catch(error){notice(error.message,true);}});
  async function sendFollowup(target) {
    if(!canFollowup(target))return;
    const prompt=$('#followup').value.trim();if(!prompt)return;
    state.starting=true;controls();
    try{await api(`/api/comparisons/${state.run}/turns`,'POST',{prompt,target});state.busy=true;for(const side of sides(target))state.lanes[side].status='pending';$('#followup').value='';listen();}
    catch(error){notice(error.message,true);}finally{state.starting=false;renderPanels();controls();}
  }
  (async()=>{
    try{
      const [settings,cases]=await Promise.all([api('/api/settings'),api('/api/cases')]);setSettings(settings);state.cases=cases.cases;
      state.selected=state.cases[0]?.id;$('#cohort-label').textContent=cases.cohort_label||`${state.cases.length} selected / ${cases.cohort_size} held-out cases`;
      $('#patient-prompt').value=selected()?.opening || '';clearRun();renderChips();$('#case-picker').hidden=state.cases.length<2;renderPanels();controls();
      if(!state.cases.length)notice('Prepare the local held-out case bundle to populate the patient chips.',true);
      else if(!configured())notice(state.settings?.shared_access?'The demo owner needs to configure the selected models. Recorded preview is available now.':'Open Connections to set your baseline model ID and credentials. Recorded preview is available now.');
    }catch(error){notice(error.message,true);}
  })();
})();
