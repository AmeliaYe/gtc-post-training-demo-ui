import {smooth} from './timeline.js';

// Preserve the 30-second main-demo timeline: the physique changes only while
// feedback becomes a model update, then remains visible for the improved reps.
const growthWindow={start:16.25,end:17.75,amount:.78};

export function strengthAt(time){
  return growthWindow.amount*smooth((time-growthWindow.start)/(growthWindow.end-growthWindow.start));
}

export function growthPulseAt(time){
  if(time<=growthWindow.start||time>=growthWindow.end)return 0;
  return Math.sin(Math.PI*(time-growthWindow.start)/(growthWindow.end-growthWindow.start))**2;
}

export function coreAt(time){
  return smooth((time-growthWindow.start)/(growthWindow.end-growthWindow.start));
}

export function physique(strength){
  return{
    strength,
    upperArm:1+1.0*strength,
    forearm:1+.38*strength,
    thigh:1+.16*strength,
    shoulder:.145+.10*strength,
    chestWidth:1+.38*strength,
    chestDepth:1+.20*strength,
  };
}

export function chestExpansion(unitY,strength){
  const upper=smooth((unitY+.15)/.65);
  return{width:1+.38*strength*upper,depth:1+.20*strength*upper};
}
