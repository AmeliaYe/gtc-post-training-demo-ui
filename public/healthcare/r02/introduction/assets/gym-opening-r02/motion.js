import * as THREE from '../coffee-lab-r01/vendor/three.module.js';

export const REP_SECONDS=4;
export const DURATION=32;
export const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*x*(x*(x*6-15)+10);};
export const skillAt=t=>smooth((t-11)/9);
export const chapterTimes=[0,5,11,20,26];
export function chapterAt(t) {return t<5?0:t<11?1:t<20?2:t<26?3:4;}

export function exerciseClips() {
  // Both loops start and finish in the same resting pose. Three's cubic
  // interpolants blend technique at any point without resetting the rep.
  const times=[0,.30,.70,1.25,1.80,2.35,3.25,3.75,4];
  const clip=(name,controlled)=>{
    const tracks=[];
    const track=(path,bad,good)=>tracks.push(new THREE.NumberKeyframeTrack(path,times,controlled?good:bad,THREE.InterpolateSmooth));
    track('torso.rotation[x]',[0,.10,.21,-.19,-.23,-.13,.03,0,0],[0,.006,.015,.018,.01,.004,0,0,0]);
    track('torso.rotation[z]',[0,-.015,-.07,.055,.06,.035,-.02,0,0],[0,0,-.005,-.008,-.003,.004,.003,0,0]);
    track('torso.position[y]',[.82,.81,.79,.85,.86,.84,.82,.82,.82],[.82,.82,.824,.826,.824,.82,.82,.82,.82]);
    track('head.rotation[x]',[0,-.03,-.09,.10,.12,.04,-.015,0,0],[0,0,-.018,-.04,-.025,-.015,0,0,0]);
    track('head.rotation[z]',[0,.01,.025,-.03,-.02,.01,0,0,0],[0,0,.01,.015,.01,.004,0,0,0]);
    for(const side of ['left','right']) {
      const sign=side==='left'?-1:1;
      track(`${side}Shoulder.rotation[x]`,[0,.09,.22,-.72,-.88,-.53,-.06,0,0],[0,0,-.02,-.045,-.03,-.012,0,0,0]);
      track(`${side}Shoulder.rotation[z]`,[.17,.19,.25,.44,.48,.32,.18,.17,.17].map(x=>x*sign),[.17,.17,.18,.18,.17,.17,.17,.17,.17].map(x=>x*sign));
      track(`${side}Elbow.rotation[x]`,[0,-.02,-.04,-.58,-1.03,-.81,-.14,0,0],[0,-.08,-.43,-1.50,-2.35,-2.10,-.43,0,0]);
      track(`${side}Wrist.rotation[x]`,[0,.02,.05,-.12,-.13,-.08,0,0,0],[0,0,.015,.025,.03,.018,0,0,0]);
    }
    return new THREE.AnimationClip(name,REP_SECONDS,tracks);
  };
  return {momentum:clip('Momentum',false),technique:clip('Technique',true)};
}
