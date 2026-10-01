// Schematic trace glyphs, not clinical dialogue, sampled rollouts or reward values.
export function createLearningCinema(root, box, paths) {
  const canvas=root.querySelector('.learn-cinema'),ctx=canvas.getContext('2d');
  const stage=root.querySelector('.learn-stage');
  const ink={cyan:'#91dfdc',green:'#b5ec75',amber:'#edb985',paper:'#101b17',line:'#596e62'};
  const clamp=x=>Math.min(1,Math.max(0,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const lerp=(a,b,t)=>a+(b-a)*t;
  let width=0,height=0,g=null,routes={},frames=0,flow={};
  function resize() {
    width=stage.clientWidth;height=stage.clientHeight;
    if(!width||!height)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx?.setTransform(dpr,0,0,dpr,0,0);
    g={stack:box('.learn-stack'),patient:box('.learn-patient'),agent:box('.learn-model>img'),model:box('.learn-model'),
      harness:box('.learn-harness'),judge:box('.learn-judges'),evaluation:box('.learn-evaluation'),
      verifierIcon:box('.learn-verifier>img'),judgeIcon:box('.learn-judge>img'),
      rl:box('.learn-optimizer>img'),gym:box('.learn-gym')};
    const large=document.body.classList.contains('workflow-presentation')&&width>1450;
    g.paperWidth=Math.min(large?64:42,(g.patient.right-g.patient.x-45)/4);
    g.paperHeight=g.paperWidth/42*38;
    g.pitch=g.paperWidth+10;
    g.rowY=g.stack.bottom-g.paperHeight/2-7;
    g.rowX=g.patient.cx-1.5*g.pitch;
    g.queueY=g.rl.cy;
    g.mobile=innerWidth<=900;
    g.queueStart=g.mobile?g.rl.right+28:g.rl.right+Math.max(50,(g.evaluation.cx-g.rl.right)*.24);
    g.queuePitch=g.mobile?Math.min(50,(width-25-g.queueStart-18)/3):Math.min(large?90:76,(g.evaluation.cx-g.queueStart-28)/3);
    routes=Object.fromEntries(Object.entries(paths).map(([kind,[path]])=>{
      const length=path.getTotalLength();
      return [kind,Array.from({length:121},(_,i)=>path.getPointAtLength(length*i/120))];
    }));
    g.queueProgress=Array.from({length:4},(_,i)=>{
      const target={x:g.queueStart+i*g.queuePitch,y:g.queueY};
      let best=0,distance=Infinity;
      routes.feedback.forEach((point,index)=>{const d=Math.hypot(point.x-target.x,point.y-target.y);if(d<distance){best=index;distance=d;}});
      return best/120;
    });
  }
  function at(kind,t) {const route=routes[kind],v=clamp(t)*120,i=Math.min(119,Math.floor(v)),f=v-i;return {x:lerp(route[i].x,route[i+1].x,f),y:lerp(route[i].y,route[i+1].y,f)};}
  function line(x1,y1,x2,y2,color,width=1,alpha=1) {
    ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=1;
  }
  function outline(x,y,w,h,color,alpha=1,lineWidth=1) {
    ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.beginPath();ctx.roundRect(x,y,w,h,3);ctx.stroke();ctx.globalAlpha=1;
  }
  function paper(x,y,{growth=1,assessment=0,alpha=1,scale=1,index=0}={}) {
    const w=42,h=38,s=scale*g.paperWidth/42;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(s,s);
    ctx.fillStyle=ink.paper;ctx.strokeStyle=assessment>0?ink.green:ink.cyan;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,3);ctx.fill();ctx.stroke();
    const widths=[.62,.43,.56,.38];
    for(let j=0;j<4;j++) {
      const reveal=clamp(growth*4-j);if(!reveal)continue;
      const from=-w/2+6+(j%2?5:0),len=(w-12)*widths[(j+index)%4];
      ctx.strokeStyle=j<assessment*4?(j===(index+1)%4?ink.amber:ink.green):j%2?ink.cyan:'#b5cac0';
      ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(from,-10+j*7);ctx.lineTo(from+len*reveal,-10+j*7);ctx.stroke();
      if(j<assessment*4){ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(w/2-6,-12+j*7,2,3);}
    }
    ctx.restore();
  }
  function trail(kind,progress,color,length=.16,thickness=3) {
    for(let i=0;i<20;i++) {
      const t=progress-length+i*length/20;if(t<0||t>=1)continue;
      const a=at(kind,t),b=at(kind,Math.min(1,t+length/20));line(a.x,a.y,b.x,b.y,color,thickness,(i+1)/20*.85);
    }
  }
  function bubble(kind,progress,color) {
    const p=at(kind,progress),alpha=Math.min(1,progress*7,(1-progress)*7);
    trail(kind,progress,color,.21,2.5);
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);ctx.fillStyle='#10221e';ctx.strokeStyle=color;
    ctx.beginPath();ctx.roundRect(-16,-8,32,16,3);ctx.fill();ctx.stroke();
    ctx.fillStyle=color;ctx.fillRect(-10,-3,19,2);ctx.fillRect(-10,2,12,2);ctx.restore();
  }
  function curve(a,b,t,lift=0) {const p=smooth(t);return {x:lerp(a.x,b.x,p),y:lerp(a.y,b.y,p)-Math.sin(p*Math.PI)*lift};}
  function along(points,t) {
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
    let remaining=clamp(t)*lengths.reduce((a,b)=>a+b,0);
    for(let i=0;i<lengths.length;i++) {
      if(remaining<=lengths[i])return curve(points[i],points[i+1],lengths[i]?remaining/lengths[i]:1);
      remaining-=lengths[i];
    }
    return points.at(-1);
  }
  function illuminate(kind,strength,color) {
    if(!strength)return;
    ctx.save();ctx.globalAlpha=strength*.24;ctx.strokeStyle=color;ctx.lineWidth=8;
    ctx.beginPath();routes[kind].forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    ctx.globalAlpha=strength*.8;ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  function receive(icon,progress) {
    const strength=Math.sin(clamp(progress)*Math.PI);
    if(strength<=0)return;
    outline(icon.x-6,icon.y-6,icon.right-icon.x+12,icon.bottom-icon.y+12,ink.green,strength*.95,2);
    const y=lerp(icon.y-2,icon.bottom+2,progress);
    line(icon.x-4,y,icon.right+4,y,ink.green,2.5,strength);
    return strength;
  }
  function paint({phase,elapsed,durations}) {
    if(!ctx||!g||!width)return;
    ctx.clearRect(0,0,width,height);frames++;
    const t=elapsed,quarter=durations[0]/4;
    flow={packets:[],trace:0,feedback:0,verifier:0,judge:0};
    if(phase===0) {
      // A reply and response complete before a schematic interaction is collected.
      const q=(t%quarter)/quarter;
      if(q<.43)bubble('reply',clamp(q/.43),ink.cyan);
      else if(q<.88)bubble('conversation',clamp((q-.43)/.45),'#e5f4ef');
      for(let i=0;i<4;i++) {
        const growth=clamp((t-i*quarter)/quarter);
        if(growth>0)paper(g.rowX+i*g.pitch,g.rowY,{index:i,growth,alpha:smooth(growth*3),scale:.85+.15*smooth(growth)});
      }
    } else if(phase===1) {
      const inlet=at('trace',0),outlet=at('trace',1);
      // Each interaction follows the visible route, activates both assessors,
      // then emerges as annotated feedback on the route to NeMo RL.
      for(let i=0;i<4;i++) {
        const local=t-i*.7,source={x:g.rowX+i*g.pitch,y:g.rowY};
        let p=source,assessment=0,alpha=1,scale=1,state='collected',progress=null;
        if(local>=0&&local<.45) {
          const gutter=g.mobile?width-24:inlet.x;
          p=along([source,{x:gutter,y:source.y},{x:gutter,y:inlet.y},inlet],local/.45);
          scale=lerp(1,g.mobile?.58:.82,smooth(local/.45));state='entering';
        } else if(local>=.45&&local<1.2) {
          progress=(local-.45)/.75;p=at('trace',progress);scale=g.mobile?.58:.82;state='trace';
          flow.trace=Math.max(flow.trace,.65+.35*Math.sin(progress*Math.PI));
          illuminate('trace',.65,ink.cyan);trail('trace',progress,ink.cyan,.42,5);
        } else if(local>=1.2&&local<1.9) {
          const checking=(local-1.2)/.7;
          p=outlet;assessment=checking;scale=(g.mobile?.58:.82)*(1-checking*.45);alpha=1-smooth(checking*2.5);state='judging';
          flow.trace=Math.max(flow.trace,(1-checking)*.7);
          flow.verifier=Math.max(flow.verifier,receive(g.verifierIcon,clamp(checking*1.12))||0);
          flow.judge=Math.max(flow.judge,receive(g.judgeIcon,clamp(checking*.95))||0);
        } else if(local>=1.9) {
          assessment=1;progress=clamp((local-1.9)/1.6)*g.queueProgress[i];
          p=at('feedback',progress);state=local<3.5?'feedback':'queued';
          scale=lerp(.6,1,clamp((local-1.9)/.25));
          if(state==='feedback') {
            flow.feedback=1;illuminate('feedback',.5,ink.green);trail('feedback',progress,ink.green,.18,4);
          }
        }
        paper(p.x,p.y,{index:i,assessment,alpha,scale});
        flow.packets.push({index:i,state,x:p.x,y:p.y,progress,alpha,scale,assessment});
      }
    } else {
      for(let i=0;i<4;i++) {
        const p=clamp((t-i*.23)/1.65);
        if(p<1)paper(lerp(g.queueStart+i*g.queuePitch,g.rl.cx,smooth(p)),g.queueY,{index:i,assessment:1,scale:1-.6*smooth(p),alpha:1-Math.pow(p,5)});
      }
      const compress=clamp((t-1.3)/1.2);
      if(t>1.3&&t<2.6) {
        for(let j=0;j<3;j++) {
          const inset=(1-compress)*(14+j*7);
          outline(g.rl.x-inset,g.rl.y-inset,g.rl.right-g.rl.x+inset*2,g.rl.bottom-g.rl.y+inset*2,ink.green,Math.sin(compress*Math.PI)*(.75-j*.15),1.4);
        }
      }
      const update=clamp((t-2.5)/1.1);
      if(t>2.5&&t<3.6) {
        trail('update',update,ink.green,.38,6);
        const p=at('update',update);ctx.fillStyle='#c9ff8c';ctx.fillRect(p.x-5,p.y-5,10,10);
      }
      const reveal=clamp((t-3.6)/1.25);
      root.style.setProperty('--update-reveal',String(smooth(reveal)));
      if(t>=3.6) {
        const h=g.model,scanY=lerp(h.bottom,h.y,reveal);
        outline(g.agent.x-5,g.agent.y-5,g.agent.right-g.agent.x+10,g.agent.bottom-g.agent.y+10,ink.green,.7,1.5);
        if(reveal<1) {
          ctx.fillStyle=`rgba(167,223,97,${(1-reveal)*.09})`;ctx.fillRect(h.x+1,scanY,h.right-h.x-2,h.bottom-scanY);
          line(h.x+1,scanY,h.right-1,scanY,ink.green,2.5,Math.sin(reveal*Math.PI));
        }
      }
      if(t>4.85)trail('evaluation',clamp((t-4.85)/1.25),'#a7c5b6',.09,2.5);
    }
    if(phase!==2)root.style.setProperty('--update-reveal','0');
    for(const [name,value] of [['trace-flow',flow.trace],['feedback-flow',flow.feedback],['verifier-receipt',flow.verifier],['judge-receipt',flow.judge]])
      root.style.setProperty(`--${name}`,String(value));
    root.dataset.traceActive=String(flow.trace>0);root.dataset.feedbackActive=String(flow.feedback>0);
  }
  return {resize,paint,getState:()=>({frames,width,height,canvasReady:!!ctx,geometry:g,flow})};
}
