import {smooth,growthWindows} from './timeline.js';

// A visual metaphor for accumulated capability, independent of a task's technique.
// Each gain follows two completed controlled reps and a short quiet pause. Pure time sampling
// makes rewind, direct station selection, pause and replay deterministic.
export function strengthAt(time) {
  return growthWindows.reduce((gain,{start,end,amount})=>gain+amount*smooth((time-start)/(end-start)),0);
}

export function growthPulseAt(time) {
  const window=growthWindows.find(({start,end})=>time>start&&time<end);
  return window?Math.sin(Math.PI*(time-window.start)/(window.end-window.start))**2:0;
}

export function coreAt(time) {
  const [bench,elliptical]=growthWindows.slice(1);
  return .65*smooth((time-bench.start)/(bench.end-bench.start))+.35*smooth((time-elliptical.start)/(elliptical.end-elliptical.start));
}

export function physique(strength) {
  return {
    strength,
    upperArm:1+1.0*strength,
    forearm:1+.38*strength,
    thigh:1+.16*strength,
    shoulder:.145+.10*strength,
    chestWidth:1+.38*strength,
    chestDepth:1+.20*strength,
  };
}

export function chestExpansion(unitY,strength) {
  const upper=smooth((unitY+.15)/.65);
  return {width:1+.38*strength*upper,depth:1+.20*strength*upper};
}
