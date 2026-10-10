import {createGymScene} from '../gym-opening-r02/scene.js';
import {DURATION,REP_SECONDS,skillAt,smooth,chapterAt,chapterTimes} from '../gym-opening-r02/motion.js';

const icon=name=>`<img src="assets/beyond-request-${name}-r01.svg" alt="" width="18" height="18">`;
const panel=document.querySelector('[data-screen-panel="break-ice"]');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hero=document.createElement('section');hero.className='gym-opening r02 r03';hero.id='practice-gym';hero.setAttribute('aria-label','Practice and feedback: a gym analogy');
hero.innerHTML=`
  <div class="go-heading"><div><p>Nemotron / Post-training</p><h1>AI agents are entering clinical workflows.</h1><p class="go-premise">Before they meet patients, they need practice and feedback.</p></div></div>
  <div class="go-stage">
    <img class="go-backdrop" src="assets/gym-opening-r02/training-room.png" alt="Two coaches with clipboards observe an ordinary fitness gym" fetchpriority="high">
    <div class="go-form-cue" data-quality="developing"><span>Same exercise. Same weights.</span><strong data-gym="cue">Getting the weight up.</strong></div>
    <div class="go-reps"><span>Reps completed</span><strong data-gym="reps">00</strong></div>
    <div class="go-verifier"><p>Coach's feedback</p><div class="go-check" data-check="rep" data-state="wait"><b></b><span>Lift completed</span></div><div class="go-check" data-check="range" data-state="ignore"><b></b><span>Full movement</span></div><div class="go-check" data-check="control" data-state="ignore"><b></b><span>Steady control</span></div>
      <fieldset class="go-reward-choice"><legend>What earns the reward?</legend><div class="go-reward-segment"><label><input type="radio" name="gym-reward" value="0" checked><span>Rep only</span></label><label><input type="radio" name="gym-reward" value="1"><span>Rep + form</span></label></div></fieldset>
    </div><div class="go-name"><strong>Nemotron</strong> / learning through practice</div>
  </div>
  <div class="go-caption"><div><p data-gym="eyebrow">01 / The starting capability</p><h2 data-gym="caption">The weight goes up. Is that enough?</h2><p class="go-bridge" data-gym="bridge">A completed rep tells us little about how it was performed.</p></div><button class="go-evidence" data-gym-action="evidence">See the real agent case ${icon('arrow-right')}</button></div>
  <div class="go-controls"><button class="go-icon" data-gym-action="play" aria-label="Pause gym opening">${icon('pause')}</button><button class="go-icon" data-gym-action="restart" aria-label="Replay gym opening">${icon('rotate-ccw')}</button><div class="go-chapters" aria-label="Opening scenes">${['Lift','Notice','Coach','Practice','Apply'].map((name,i)=>`<button type="button" data-gym-chapter="${i}" aria-current="${i===0?'step':'false'}">${name}</button>`).join('')}</div><label class="go-loop"><input type="checkbox" checked>Loop</label></div>
  <div class="ef-case-bridge"><p><strong>Here, the refill was submitted, but safety questions were skipped.</strong><span>Finishing the rep isn't enough; technique matters.</span></p><button type="button" class="go-evidence" data-gym-action="evidence">See the missed step ${icon('arrow-right')}</button></div>
`;
document.getElementById('gymOpeningMount').replaceWith(hero);
hero.querySelector('.go-heading h1').textContent='AI Safety Starts with Model Specialization';
hero.querySelector('.go-premise').textContent='Give AI a place to practice and receive feedback.';
hero.querySelector('.ef-case-bridge').remove();
hero.querySelector('.go-evidence').innerHTML=`How post-training works ${icon('arrow-right')}`;
const field=name=>hero.querySelector(`[data-gym="${name}"]`),playButton=hero.querySelector('[data-gym-action="play"]');
const captions=[
  ['01 / The starting capability','The weight goes up. Is that enough?','A completed rep tells us little about how it was performed.'],
  ['02 / An incomplete reward',"Count only the reps. Miss the technique.",'The movement is incomplete and the body swings, but the rep still gets credit.'],
  ['03 / Better feedback','Reward control, not just completion.','Full movement and a steady body now count toward the reward.'],
  ['04 / Practice with feedback','Same exercise. Better execution.','Repeated practice with feedback helps make good technique a habit.'],
  ['05 / The parallel for agents',"Complete the request. Make the right checks.",'Post-training can reinforce the checks and choices that should come before action.']
];
let elapsed=0,clock=0,skill=0,playing=!reduced.matches,active=panel.classList.contains('active'),visible=true,last=0,raf=0,manual=null,lastLabel='',lastPlaying;
let scene;
try {scene=createGymScene(hero.querySelector('.go-stage'));}catch(error){playing=false;hero.querySelector('.go-stage').insertAdjacentHTML('beforeend','<p class="go-no-webgl">The animated gym needs WebGL. The recorded agent case is available below.</p>');console.warn('Gym scene unavailable:',error.message);}
function canRun(){return playing&&visible&&active&&!document.hidden;}
function updateSkill(){skill=manual?manual.from+(manual.target-manual.from)*smooth((clock-manual.start)/6):skillAt(elapsed);}
function render() {
  updateSkill();const index=manual?skill>.94?3:2:chapterAt(elapsed);
  const labelKey=`${index}:${manual?.target??'auto'}`;
  if(labelKey!==lastLabel){lastLabel=labelKey;const lines=manual&&manual.target===0?['Your reward choice / Rep only','The lift counts. Form is optional.','The practice follows what earns credit.']:captions[index];['eyebrow','caption','bridge'].forEach((key,i)=>field(key).textContent=lines[i]);hero.querySelectorAll('[data-gym-chapter]').forEach((b,i)=>b.setAttribute('aria-current',!manual&&i===index?'step':'false'));}
  hero.dataset.phase=['lift','notice','coach','practice','apply'][index];hero.dataset.manual=String(!!manual);
  const good=skill>.90,improving=skill>.08&&!good;
  field('cue').textContent=good?'Controlled. Complete.':improving?'Finding the form.':index===0?'Getting the weight up.':'Momentum over technique.';
  hero.querySelector('.go-form-cue').dataset.quality=good?'good':'developing';
  const count=Math.floor(clock/REP_SECONDS);field('reps').textContent=String(count).padStart(2,'0');
  const reward=manual?manual.target:elapsed>=11?1:0;
  hero.querySelectorAll('[name="gym-reward"]').forEach(el=>{el.checked=Number(el.value)===reward;});
  for(const key of ['rep','range','control']) {
    const state=key==='rep'?(count?'pass':'wait'):good?'pass':index===0?'ignore':improving?'wait':'miss';
    const row=hero.querySelector(`[data-check="${key}"]`);row.dataset.state=state;row.querySelector('b').textContent=state==='pass'?'\u2713':state==='miss'?'!':'\u00b7';
  }
  if(playing!==lastPlaying){lastPlaying=playing;playButton.innerHTML=icon(playing?'pause':'play');playButton.setAttribute('aria-label',playing?'Pause gym opening':'Play gym opening');}
  scene?.render(clock,skill);
}
function schedule(){if(canRun()&&!raf)raf=requestAnimationFrame(tick);}
function tick(now){raf=0;if(!canRun()){last=0;return;}const dt=last?Math.min((now-last)/1000,.08):0;last=now;clock+=dt;if(!manual)elapsed+=dt;
  if(!manual&&elapsed>=DURATION){if(hero.querySelector('.go-loop input').checked&&!reduced.matches){elapsed=0;clock=0;}else{elapsed=DURATION;clock=DURATION;playing=false;}}
  render();schedule();
}
function pause(){playing=false;last=0;cancelAnimationFrame(raf);raf=0;render();}
function seek(time,run=false){manual=null;elapsed=Math.min(DURATION,Math.max(0,time));clock=elapsed;playing=run;last=0;cancelAnimationFrame(raf);raf=0;render();schedule();}
function coach(target){manual={target,from:skill,start:clock};lastLabel='';
  if(reduced.matches){manual.from=target;clock=Math.floor(clock/REP_SECONDS)*REP_SECONDS+1.8;manual.start=clock;playing=false;}
  else playing=true;
  render();schedule();
}
function evidence(){
  pause();
  if(parent===window){location.assign('/');return;}
  parent.postMessage({type:'gtc-demo:enter'},location.origin);
}
hero.addEventListener('change',event=>{if(event.target.name==='gym-reward')coach(Number(event.target.value));});
hero.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.gymChapter!==undefined){seek(chapterTimes[Number(b.dataset.gymChapter)]);return;}
  if(b.dataset.gymAction==='evidence'){evidence();return;}
  if(b.dataset.gymAction==='restart'){seek(0,!reduced.matches);return;}
  if(b.dataset.gymAction==='play'){if(playing)pause();else{if(elapsed>=DURATION&&!manual){elapsed=0;clock=0;}playing=true;last=0;render();schedule();}}
});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;last=0;}else schedule();},{threshold:.1}).observe(hero);
new MutationObserver(()=>{active=panel.classList.contains('active');if(!active){cancelAnimationFrame(raf);raf=0;last=0;}else{render();schedule();}}).observe(panel,{attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
reduced.addEventListener('change',()=>{if(reduced.matches)pause();});
window.gymOpening={seek:time=>seek(time),getState:()=>({elapsed,clock,skill,playing,active,visible,manual,phase:hero.dataset.phase,scene:scene?.state()}),sampleMotion:(time,blend)=>{scene.render(time,blend);const state=scene.state();render();return state;}};
render();schedule();
