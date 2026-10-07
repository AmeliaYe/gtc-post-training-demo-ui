import {createGymScene} from './circuit-r06/scene.js';
import {smooth,script,duration,starts} from './circuit-r06/timeline.js';
import {frameFor} from './framing.js';
const $=s=>document.querySelector(s),host=$('#gym'),image=$('#backdrop'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const overlay=$('#signals'),ctx=overlay.getContext('2d');
const reward='technique';
let time=0,playing=!reduced.matches,last=0,raf=0,frames=0,skill=0,visible=true,ready=false,scene;
try{scene=createGymScene(host);}catch(error){$('#fallback').hidden=false;playing=false;console.error(error);}
function geometry(){return frameFor(host);}
const imagePoint=(g,x,y)=>({x:g.x+x*g.imageWidth,y:g.y+y*g.imageHeight});
function signal(a,b,p,color){
 const alpha=smooth(p/.12)*(1-smooth((p-.85)/.15));if(alpha<=0)return;
 const cy=Math.max(a.y,b.y)+26;ctx.save();ctx.globalAlpha=.30*alpha;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,cy,b.x,b.y);ctx.stroke();
 for(let i=0;i<20;i++){const q=p-i*.012;if(q<0)continue;const x=(1-q)**2*a.x+2*(1-q)*q*(a.x+b.x)/2+q*q*b.x,y=(1-q)**2*a.y+2*(1-q)*q*cy+q*q*b.y;ctx.globalAlpha=alpha*(1-i/23);ctx.fillStyle=color;ctx.fillRect(x-3,y-2,6,4);}ctx.restore();
}
let effectState={};
function draw(spec){
 const g=geometry();if(!g.imageWidth||!scene)return;ctx.clearRect(0,0,g.width,g.height);
 const state=scene.state(),bounds=host.getBoundingClientRect(),target={x:state.chest.x-bounds.x,y:state.chest.y-bounds.y};
 const left=imagePoint(g,.145,.355),right=imagePoint(g,.852,.353);effectState={equipment:spec.action==='prepare',environment:spec.action==='environment',outbound:false,update:false,target,left,right};
 if(spec.action==='prepare'){effectState.stations=['bench','dumbbells','elliptical'];}
 if(spec.action==='environment'){
  const points=[[0,.61],[.17,.5],[.5,.433],[.82,.49],[1,.61]].map(([x,y])=>imagePoint(g,x,y));ctx.save();ctx.strokeStyle='#a6df5a';ctx.lineWidth=3;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.restore();
 }
 if(spec.action==='feedback'){const p=spec.progress;signal(target,left,p,'#4bc8d0');signal(target,right,p,'#4bc8d0');effectState.outbound=true;}
 if(spec.action==='update'){
  const p=spec.progress;signal(left,target,p,'#a6df5a');signal(right,target,p,'#a6df5a');effectState.update=true;
  ctx.save();ctx.strokeStyle='#a6df5a';ctx.lineWidth=3;ctx.globalAlpha=Math.sin(p*Math.PI)*.85;ctx.beginPath();ctx.ellipse(target.x,target.y,g.width*.052,g.width*.08,0,0,2*Math.PI);ctx.stroke();ctx.restore();
 }
 document.querySelectorAll('.station').forEach(el=>{const point=state.stations[el.dataset.station];el.style.left=`${point.x-bounds.x}px`;el.style.top=`${Math.min(g.height-el.offsetHeight-4,point.y-bounds.y+25)}px`;const waiting=spec.action==='prepare'&&((el.dataset.station==='bench'&&spec.progress<.03)||(el.dataset.station==='elliptical'&&spec.progress<.44)),inactive=spec.phase>=2&&el.dataset.station!==spec.station;el.hidden=spec.phase===0||waiting||inactive;el.dataset.active=String(spec.action==='prepare'||el.dataset.station===spec.station);});
}
const criteria={dumbbells:{labels:['Movement','Control'],bad:['Use the full range','Keep the body steady'],good:['Full range','Steady body']},bench:{labels:['Range','Stability'],bad:['Lower with control','Keep the bar level'],good:['Controlled press','Level bar']},elliptical:{labels:['Rhythm','Balance'],bad:['Smooth the cadence','Steady upper body'],good:['Even cadence','Stable posture']}};
function feedback(spec){
 const station=spec.station,good=['retry','final','hold'].includes(spec.action),show=['feedback','update','retry','final','hold'].includes(spec.action);
 const config=criteria[station];
 [$('#left-feedback'),$('#right-feedback')].forEach((el,i)=>{el.hidden=!show;el.dataset.pass=String(good);el.dataset.rewarded='true';el.querySelector('.coach-title').textContent=`${{dumbbells:'Dumbbells',bench:'Bench press',elliptical:'Elliptical'}[station]} / ${config.labels[i]}`;el.querySelector('strong span').textContent=config[good?'good':'bad'][i];});
}
function render(){
 const spec=script(time);skill=spec.quality;
 scene?.render(spec,skill);draw(spec);frames++;
 $('#step-kicker').textContent=spec.kicker;$('#step-title').textContent=spec.title;
 $('#gym-tag').dataset.active=String(spec.phase===2);$('#task-label').hidden=true;$('#model-label').hidden=true;
 $('#update-label').hidden=spec.action!=='update';$('#completion').hidden=spec.action!=='feedback';$('#completion').innerHTML='<span aria-hidden="true">&#10003;</span> Task completed';
 feedback(spec);$('#cycle').hidden=spec.phase!==3;
 document.querySelectorAll('[data-action]').forEach(el=>el.dataset.active=String(el.dataset.action===spec.action||(el.dataset.action==='try'&&spec.action==='retry')));
 document.querySelectorAll('[data-step]').forEach((el,i)=>el.setAttribute('aria-current',i===spec.phase?'step':'false'));
 $('#timeline').value=String(time);$('#timeline').setAttribute('aria-valuetext',`${Math.floor(time)} seconds. ${spec.kicker}`);$('#time').textContent=`${String(Math.floor(time)).padStart(2,'0')} / ${duration}`;
 $('#play').setAttribute('aria-label',playing?'Pause animation':'Play animation');$('#play').title=playing?'Pause animation':'Play animation';$('#play img').src=`assets/${playing?'pause':'play'}.svg`;
 host.dataset.phase=String(spec.phase);host.dataset.action=spec.action;host.dataset.station=spec.station;
}
function canRun(){return playing&&visible&&!document.hidden;}
function schedule(){if(canRun()&&!raf)raf=requestAnimationFrame(tick);}
function tick(now){raf=0;if(!canRun()){last=0;return;}const dt=last?Math.min((now-last)/1000,.1):0;last=now;time=(time+dt)%duration;render();schedule();}
function pause(){playing=false;last=0;cancelAnimationFrame(raf);raf=0;render();}
function play(){if(time>=duration)time=0;playing=true;last=0;render();schedule();}
function seek(t){pause();time=Math.max(0,Math.min(duration,Number(t)||0));render();}
function resize(){const r=frameFor(host),dpr=Math.min(devicePixelRatio,2);overlay.width=Math.round(r.width*dpr);overlay.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);render();}
$('#play').addEventListener('click',()=>playing?pause():play());$('#reset').addEventListener('click',()=>{seek(0);if(!reduced.matches)play();});$('#timeline').addEventListener('input',e=>seek(e.target.value));
document.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('click',()=>seek(starts[Number(el.dataset.step)])));
$('#continue-demo').addEventListener('click',event=>{if(window.parent!==window){event.preventDefault();parent.postMessage({type:'gtc-demo:enter'},location.origin);}});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#experience').requestFullscreen();}catch(error){console.warn('Fullscreen unavailable:',error.message);}});
document.addEventListener('fullscreenchange',()=>{const label=document.fullscreenElement?'Exit fullscreen':'Enter fullscreen';$('#fullscreen').setAttribute('aria-label',label);$('#fullscreen').title=label;resize();});
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;if(!visible){cancelAnimationFrame(raf);raf=0;}else schedule();},{threshold:.2}).observe(host);
reduced.addEventListener('change',()=>{if(reduced.matches)pause();});new ResizeObserver(resize).observe(host);
window.gymWorkflow={seek,play,pause,restart(){seek(0);if(!reduced.matches)play();},getState(){const spec=script(time);return{time,duration,playing,reward,skill,phase:spec.phase,action:spec.action,station:spec.station,frames,ready,visible,effects:effectState,scene:scene?.state()};}};
try{await image.decode();}catch{$('#fallback').hidden=false;$('#fallback').textContent='The gym background could not load.';}
try{await scene?.ready;}catch{$('#fallback').hidden=false;$('#fallback').textContent="The robot's NIM icon could not load.";playing=false;}
resize();ready=!!scene&&image.naturalWidth>0&&scene.state().badge.loaded;document.documentElement.dataset.ready=String(ready);render();schedule();
