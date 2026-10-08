import {smooth} from './timeline.js';

// Low relief carved into the existing torso surface. Broad, overlapping lobes
// keep the abdomen continuous instead of attaching separate pads to the robot.
export function sculptAbdomen(x,y,z,core){
  if(core<=0||z<=0)return z;
  const side=smooth((.32-Math.abs(x))/.12);
  const vertical=smooth((y+.025)/.07)*(1-smooth((y-.25)/.07));
  const mask=side*vertical;
  if(mask===0)return z;
  const waist=.24*Math.sqrt(Math.max(0,1-(x/.30)**2-((y-.1)/.17)**2));
  const blend=Math.max(0,waist+.006-z);
  const gaussian=(value,width)=>Math.exp(-((value/width)**2));
  const upper=smooth(core/.65),lower=smooth((core-.65)/.35);
  let relief=0;
  for(const sign of [-1,1]){
    const column=gaussian(x-sign*.105,.087);
    relief+=column*(.018*upper*gaussian(y-.245,.065)+.019*upper*gaussian(y-.145,.065)+.014*lower*gaussian(y-.045,.06));
  }
  const center=.006*core*gaussian(x,.028)*gaussian(y-.15,.16);
  const creases=.003*gaussian(x,.20)*(upper*gaussian(y-.195,.022)+lower*gaussian(y-.095,.022));
  return z+mask*(blend*smooth(core)+relief-center-creases);
}
