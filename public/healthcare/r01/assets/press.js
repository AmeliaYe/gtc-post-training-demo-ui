import {Marked} from './marked.esm.js';
import {createArchitecture} from './architecture-r04.js';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const markdown=new Marked({gfm:false,renderer:{link:({text})=>esc(text),image:({text})=>esc(text)}});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const pages=['how-it-learns','before-after','results','get-started'];
let currentPage='how-it-learns';
function navigate(id,replace=false){
  if(!pages.includes(id))id='how-it-learns';
  currentPage=id;
  for(const page of $$('.screen')){const active=page.id===id;page.classList.toggle('active',active);page.hidden=!active;}
  for(const tab of $$('.tab')){const active=tab.dataset.page===id;tab.classList.toggle('active',active);if(active)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');}
  if(location.hash!==`#${id}`)history[replace?'replaceState':'pushState']({},'',`#${id}`);
  window.scrollTo({top:0,behavior:'instant'});
  syncPlayback();
  if(id==='how-it-learns')requestAnimationFrame(drawWires);
}
document.addEventListener('click',event=>{const tab=event.target.closest('[data-page],[data-go]');if(tab)navigate(tab.dataset.page||tab.dataset.go);});
window.addEventListener('popstate',()=>navigate(location.hash.slice(1),true));
window.pressDemo={navigate,getState:()=>({page:currentPage,case:caseKey})};

const workflow=createArchitecture();
function syncPlayback(){workflow.setVisible(currentPage==='how-it-learns');}
function drawWires(){workflow.draw();}
function renderPhase(){workflow.render();}

// Excerpts are contiguous slices of the source, not re-authored dialogue.
const evidence=window.CASE_TRACE_EVIDENCE;
const cases={refill:evidence.cases.find(c=>c.id==='adult-validation-0035'),symptoms:evidence.cases.find(c=>c.id==='adult-validation-0021')};
let caseKey='refill';
const selections={
  refill:{
    before:[{turn:0,start:0,to:' I\'d like'},{turn:1,start:0,to:' You\u2019ll be notified'}],
    after:[{turn:0,start:0,to:' I\'ve been taking'},{turn:1,from:'Before I submit',to:'- Is your depression'},{turn:2,start:0,to:' My depression'},{turn:3,start:0,to:'\n\n**What happens next**'}],
    title:'Both submit the refill. Only one checks first.',beforeCaption:'Submitted without safety questions',afterCaption:'Asks. Waits. Then submits.',takeaway:'Task completion is not the same as following the required process.',limit:'Further refinement: parts of the closing advice and promised turnaround still need review.'
  },
  symptoms:{
    before:[{turn:0,start:0,to:' It\'s disrupting'},{turn:1,from:'- **No red',to:'\n\n**Home'}],
    after:[{turn:0,start:0,to:' I\'m drinking'},{turn:1,from:'**What I need',to:'\n\n**Home'},{turn:2,from:'Can I book',to:undefined}],
    title:'Not mentioned is not the same as checked.',beforeCaption:'Assumes warning signs are absent',afterCaption:'Explicitly asks about warning signs',takeaway:'A visible shift from assuming to asking.',limit:'Further refinement: this policy still offers advice before the patient answers.'
  }
};
function getSlice(record,side,selection){
  const turn=record[side].trace[selection.turn],key=turn.role==='patient'?'content':'reply',source=turn[key];
  const start=selection.from===undefined?(selection.start||0):source.indexOf(selection.from);
  const end=selection.to===undefined?(selection.end??source.length):source.indexOf(selection.to,start);
  if(start<0||end<start||end>source.length)throw Error(`Invalid excerpt ${record.id}/${side}/${selection.turn}`);
  return {source,text:source.slice(start,end),start,end,key,role:turn.role,turn:selection.turn};
}
function highlighted(text,record,side,path,offset=0){
  const annotations=record.annotations.filter(a=>a.side===side&&a.path===path&&a.start<offset+text.length&&a.end>offset).sort((a,b)=>a.start-b.start);
  let result='',cursor=0;
  for(const a of annotations){const start=Math.max(0,a.start-offset),end=Math.min(text.length,a.end-offset);if(start<cursor)continue;result+=esc(text.slice(cursor,start))+`<mark class="${a.tone}" title="${esc(a.label)}">${esc(text.slice(start,end))}</mark>`;cursor=end;}
  return result+esc(text.slice(cursor));
}
function renderCase(key){
  caseKey=key;const record=cases[key],selection=selections[key];
  $('#case-title').textContent=selection.title;$('#case-subtitle').textContent='Nemotron 3.5 Lightning / recorded conversation excerpts';
  $('#case-takeaway').textContent=selection.takeaway;$('#case-limit').textContent=selection.limit;
  $$('[data-case]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.case===key)));
  $('#comparison').innerHTML=['before','after'].map(side=>`<section class="case-column ${side}"><header><h2>${side==='before'?'Before training':'After training'}</h2><span>${side==='before'?'Baseline':'GRPO step 75'}</span></header><p class="behavior-caption">${esc(selection[`${side}Caption`])}</p>${selection[side].map((spec,index)=>{
    const s=getSlice(record,side,spec);let html=highlighted(s.text,record,side,`/health_trace/${s.turn}/${s.key}`,s.start);
    // The refill defect is an omission before the tool call; mark its actual confirmation.
    if(side==='before'&&key==='refill'&&s.role==='assistant')html=`<mark title="The recorded refill tool action precedes any safety questions.">${html}</mark>`;
    return `<div class="bubble ${s.role}" style="animation-delay:${index*.09}s" data-turn="${s.turn}" data-start="${s.start}" data-end="${s.end}" data-source-excerpt="${esc(s.text)}"><span>${s.role==='patient'?'Patient':'Assistant'}</span><div class="quote-text">${markdown.parseInline(html)}</div></div>`;
  }).join('')}</section>`).join('');
}
$$('[data-case]').forEach(button=>button.addEventListener('click',()=>renderCase(button.dataset.case)));
const dialog=$('#trace-dialog');
$('#full-trace').addEventListener('click',()=>{
  const record=cases[caseKey];$('#trace-dialog-title').textContent=`${caseKey==='refill'?'Refill':'Symptoms'} / full conversations`;
  $('#trace-content').innerHTML=['before','after'].map(side=>`<section class="full-side"><h3>${side==='before'?'Baseline':'GRPO step 75'}</h3>${record[side].trace.map((turn,i)=>{
    const key=turn.role==='patient'?'content':'reply';
    const tools=(turn.tool_results||[]).map((tool,k)=>`<details><summary>Agent tool call: ${esc(tool.tool_call.name)}</summary><pre>${esc(JSON.stringify(tool,null,2))}</pre></details>`).join('');
    return `<div class="full-turn" data-side="${side}" data-turn="${i}"><strong>${turn.role==='patient'?'Patient':'Assistant'}</strong>${tools}<div class="verbatim">${highlighted(turn[key],record,side,`/health_trace/${i}/${key}`)}</div></div>`;
  }).join('')}<p class="trace-provenance">${esc(record.id)} / ${esc(record[side].source)}<br>Trace SHA-256: ${esc(record[side].traceSha256)}</p></section>`).join('');
  dialog.showModal();
});
$('#close-trace').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
window.pressEvidence={getSlice,selections,cases,getState:()=>({caseKey})};

const results=window.PRESS_RESULTS;
// Scope the press chart without altering the full rubric or its aggregate.
const displayedAxes=evidence.axes.filter(([key])=>key!=='conversational_quality');
$('#mean-before').textContent=results.aggregate.before.toFixed(2);$('#mean-after').textContent=results.aggregate.after.toFixed(2);
$('#score-table').innerHTML='<div class="score-row header" role="row"><span role="columnheader">Rubric / 5</span><span role="columnheader">Baseline / step 75</span><span role="columnheader">Before</span><span role="columnheader">After</span><span role="columnheader">Change</span></div>'+displayedAxes.map(([key,name])=>{const {before,after}=results.axes[key],delta=after-before;return `<div class="score-row ${delta<0?'regression':''}" role="row" data-axis="${key}"><span role="cell">${esc(name)}</span><div class="bar-pair" aria-hidden="true"><i class="score-bar" style="--width:${before/5*100}%"></i><i class="score-bar after" style="--width:${after/5*100}%"></i></div><span role="cell">${before.toFixed(2)}</span><span role="cell">${after.toFixed(2)}</span><span role="cell" class="delta">${delta>=0?'+':''}${delta.toFixed(2)}</span></div>`;}).join('');
renderCase('refill');renderPhase();navigate(location.hash.slice(1)||'how-it-learns',true);
document.documentElement.dataset.pressReady='true';
