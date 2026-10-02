import {createLearningCinema} from './learning-cinema-r01.js';

export function createArchitecture() {
  const root=document.querySelector('#architecture');
  const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
  const stage=$('.learn-stage'),svg=$('.learn-wires'),sheets=$$('.learn-sheet');
  const names=sheets.filter(n=>n.dataset.task!==undefined).map(n=>n.textContent.trim());
  const phases=['practice','feedback','update'],durations=[12.8,6,6.2];
  const captions=['Patient replies. Agent responses. Experience across healthcare tasks.','The verifier and judge assess what worked and what was missed.','NeMo RL turns scored experience into a policy update. Practice repeats.'];
  const headlines=['Practice across healthcare tasks.','Feedback makes practice count.','Update the agent. Practice again.'];
  const offsets=[0,durations[0],durations[0]+durations[1]],total=durations.reduce((a,b)=>a+b,0);
  const timeline=$('#arch-timeline'),heading=document.querySelector('#learn-title'),presentButton=document.querySelector('#arch-present');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),paths={},ns='http://www.w3.org/2000/svg';
  let phase=0,task=0,elapsed=0,playing=!reduced.matches,visible=false,raf=0,last=0,motion=[],presentation=false;
  for(const kind of ['conversation','reply','trace','feedback','update','evaluation']) {
    paths[kind]=['learn-wire','learn-signal'].map(type=>{
      const node=document.createElementNS(ns,'path');node.classList.add(type);node.dataset.kind=kind;
      if(type==='learn-signal')node.setAttribute('pathLength','100');
      svg.append(node);return node;
    });
  }
  const cinema=createLearningCinema(root,box,paths);
  const running=()=>playing&&visible&&!document.hidden;
  function stopMotion(){for(const animation of motion)animation.cancel();motion=[];}
  function pose(slot){const css=getComputedStyle(root);return `translate(${(4-slot)*parseFloat(css.getPropertyValue('--sheet-offset'))}px,${slot*parseFloat(css.getPropertyValue('--sheet-step'))}px)`;}
  const slotFor=(index,selected)=>index===4?0:1+(selected-index+7)%4;
  function rotateTask(next,animate=true) {
    const from=sheets.map(sheet=>getComputedStyle(sheet).transform);stopMotion();
    const previous=task;task=(next+4)%4;
    sheets.forEach((sheet,index)=>{
      const slot=slotFor(index,task),oldSlot=slotFor(index,previous),to=pose(slot);
      sheet.style.transform=to;sheet.style.zIndex=String(10+slot);sheet.dataset.slot=String(slot);
      sheet.classList.toggle('active',index===task);
      sheet.querySelector('button')?.setAttribute('aria-pressed',String(index===task));
      if(animate&&!reduced.matches&&task!==previous)motion.push(sheet.animate([
        {transform:from[index],zIndex:10+oldSlot},{transform:to,zIndex:10+slot}
      ],{duration:760,easing:'cubic-bezier(.22,.75,.25,1)'}));
    });
    root.dataset.activeTask=String(task);
  }
  function box(selector){const h=stage.getBoundingClientRect(),b=$(selector).getBoundingClientRect();return {x:b.left-h.left,y:b.top-h.top,right:b.right-h.left,bottom:b.bottom-h.top,cx:b.left-h.left+b.width/2,cy:b.top-h.top+b.height/2};}
  function label(kind,x,y){const node=$(`[data-label="${kind}"]`);node.style.left=`${x}px`;node.style.top=`${y}px`;}
  function draw() {
    if(!visible||!stage.clientWidth)return;
    const bounds=stage.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    const a=box('.learn-model>img'),h=box('.learn-harness'),p=box('.learn-patient'),s=box('.learn-stack'),
      e=box('.learn-evaluation'),j=box('.learn-judges'),r=box('.learn-optimizer>img'),o=box('.learn-optimizer'),v=box('.learn-heldout'),g=box('.learn-gym');
    const mobile=innerWidth<=900,d={};
    if(mobile) {
      const y0=s.bottom+9,y1=h.y-9,x0=h.cx-14,x1=h.cx+14;
      d.conversation=`M ${x0} ${y1} L ${x0} ${y0}`;
      d.reply=`M ${x1} ${y0} L ${x1} ${y1}`;
      label('conversation',x0-49,(y0+y1)/2);label('reply',x1+42,(y0+y1)/2);
      d.trace=`M ${h.cx} ${h.bottom+6} L ${h.cx} ${e.y-8}`;
      label('trace',h.cx+65,(h.bottom+e.y)/2);
      d.feedback=`M ${bounds.width-25} ${e.bottom+7} L ${bounds.width-25} ${r.cy} L ${r.right+10} ${r.cy}`;
      label('feedback',(r.right+bounds.width-25)/2,r.cy-34);
      d.update=`M ${r.x-10} ${r.cy} L 11 ${r.cy} L 11 ${a.cy} L ${h.x-5} ${a.cy}`;
      label('update',11,(a.cy+r.cy)/2);
      d.evaluation=`M ${o.cx} ${o.bottom+8} L ${o.cx} ${v.cy} L ${v.x-5} ${v.cy}`;
    } else {
      const y=a.cy-6,mid=(h.right+s.x)/2;
      d.conversation=`M ${h.right+8} ${y} L ${s.x-8} ${y}`;
      d.reply=`M ${s.x-8} ${y+27} L ${h.right+8} ${y+27}`;
      label('conversation',mid,y-25);label('reply',mid,y+53);
      const end=s.x+sheets[0].clientWidth;
      d.trace=`M ${end+8} ${j.cy} L ${e.x-9} ${j.cy}`;
      label('trace',(end+e.x)/2,j.cy+24);
      d.feedback=`M ${e.cx} ${e.bottom+9} L ${e.cx} ${r.cy} L ${r.right+10} ${r.cy}`;
      label('feedback',(e.cx+r.right)/2,r.cy-(presentation&&innerWidth>=1600?44:28));
      d.update=`M ${r.cx} ${r.y-7} L ${r.cx} ${h.bottom+5}`;
      label('update',r.cx+78,h.bottom+13);
      d.evaluation=`M ${o.cx+80} ${v.cy} L ${v.x-8} ${v.cy}`;
    }
    for(const [kind,nodes] of Object.entries(paths))for(const node of nodes)node.setAttribute('d',d[kind]);
    cinema.resize();paint();
  }
  function paint() {
    root.style.setProperty('--phase-progress',String(elapsed/durations[phase]));
    root.style.setProperty('--time-progress',`${(offsets[phase]+elapsed)/total*100}%`);
    timeline.value=String(offsets[phase]+elapsed);
    timeline.setAttribute('aria-valuetext',`${phases[phase]}, ${Math.round(offsets[phase]+elapsed)} seconds`);
    cinema.paint({phase,elapsed,durations});
  }
  function render() {
    root.dataset.phase=phases[phase];root.dataset.playing=String(running());
    $('#phase-caption').textContent=captions[phase];
    heading.textContent=headlines[phase];
    $$('[data-phase-select]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.phaseSelect)===phase)));
    const active=[['conversation','reply'],['trace','feedback'],['update','evaluation']][phase];
    for(const [kind,nodes] of Object.entries(paths))nodes[1].classList.toggle('on',active.includes(kind));
    const control=$('#arch-play');control.setAttribute('aria-label',playing?'Pause workflow':'Play workflow');control.title=control.getAttribute('aria-label');
    control.querySelector('img').src=`assets/beyond-request-${playing?'pause':'play'}-r01.svg`;
    paint();
  }
  function schedule(){cancelAnimationFrame(raf);raf=0;last=0;if(running())raf=requestAnimationFrame(tick);}
  function tick(now) {
    raf=0;if(!running())return;
    elapsed+=last?Math.min((now-last)/1000,.1):0;last=now;
    if(elapsed>=durations[phase]){elapsed=0;phase=(phase+1)%3;if(phase===0)rotateTask(0);render();}
    if(phase===0){const next=Math.min(3,Math.floor(elapsed/(durations[0]/4)));if(task!==next)rotateTask(next);}
    paint();raf=requestAnimationFrame(tick);
  }
  function pause(){playing=false;motion.forEach(a=>{if(a.playState==='running')a.pause();});render();schedule();}
  function play(){playing=true;motion.forEach(a=>{if(a.playState==='paused')a.play();});render();schedule();}
  function select(value){pause();phase=(value+3)%3;elapsed=[task*3.2+2.9,3.3,4.9][phase];rotateTask(task,false);render();draw();}
  function selectTask(value){pause();phase=0;elapsed=((value+4)%4)*3.2+2.9;rotateTask(value);render();}
  function seek(value) {
    pause();const t=Math.min(total-.001,Math.max(0,Number(value)||0));
    phase=t<offsets[1]?0:t<offsets[2]?1:2;elapsed=t-offsets[phase];
    rotateTask(phase===0?Math.min(3,Math.floor(elapsed/3.2)):3,false);render();draw();
  }
  function reset(){phase=0;elapsed=0;playing=!reduced.matches;rotateTask(0,false);root.style.setProperty('--travel','0');render();draw();schedule();}
  function setVisible(value) {
    const changed=visible!==value;visible=value;
    if(changed){stopMotion();rotateTask(task,false);}
    if(!visible&&presentation)setPresentation(false);
    render();if(visible)draw();schedule();
  }
  function setPresentation(value,fullscreen=false) {
    presentation=!!value;document.body.classList.toggle('workflow-presentation',presentation);
    presentButton.setAttribute('aria-pressed',String(presentation));
    presentButton.setAttribute('aria-label',presentation?'Exit presentation view':'Enter presentation view');presentButton.title=presentButton.getAttribute('aria-label');
    presentButton.querySelector('img').src=`assets/beyond-request-${presentation?'x':'maximize'}-r01.svg`;
    if(presentation&&fullscreen)document.documentElement.requestFullscreen?.().catch(()=>{});
    if(!presentation&&document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
    const url=new URL(location.href);if(presentation)url.searchParams.set('view','presentation');else url.searchParams.delete('view');history.replaceState(null,'',url);
    draw();window.scrollTo(0,0);
  }
  $$('.learn-sheet button').forEach((button,index)=>button.addEventListener('click',()=>selectTask(index)));
  $$('[data-phase-select]').forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.phaseSelect))));
  $('#arch-play').addEventListener('click',()=>playing?pause():play());
  $('#arch-next').addEventListener('click',()=>select(phase+1));$('#arch-reset').addEventListener('click',reset);
  timeline.addEventListener('input',()=>seek(timeline.value));
  presentButton.addEventListener('click',()=>setPresentation(!presentation,true));
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&presentation)setPresentation(false);});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&presentation){setPresentation(false);presentButton.focus();}
    if(!presentation||event.target.closest('button,input,a,summary'))return;
    if(event.code==='Space'){event.preventDefault();playing?pause():play();}
    if(event.key==='ArrowRight'){event.preventDefault();select(phase+1);}
    if(event.key==='ArrowLeft'){event.preventDefault();select(phase-1);}
  });
  document.addEventListener('visibilitychange',()=>{stopMotion();rotateTask(task,false);render();schedule();});
  reduced.addEventListener('change',()=>{if(reduced.matches){pause();stopMotion();rotateTask(task,false);}});
  new ResizeObserver(()=>{stopMotion();rotateTask(task,false);draw();}).observe(stage);
  const api={setVisible,draw,render,select,selectPhase:select,selectTask,pause,play,reset,seek,setPresentation,
    getState:()=>({phase,task,taskName:names[task],elapsed,playing,visible,running:running(),durations:[...durations],mode:'rotation',presentation,cinema:cinema.getState(),slots:sheets.map(sheet=>Number(sheet.dataset.slot))})};
  window.architectureFlow=api;rotateTask(0,false);render();
  if(new URL(location.href).searchParams.get('view')==='presentation'&&location.hash==='#how-it-learns')setPresentation(true);
  return api;
}
